/****************************************************************************
*
*   Copyright (c) 2018 Windhover Labs, L.L.C. All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
*
* 1. Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in
*    the documentation and/or other materials provided with the
*    distribution.
* 3. Neither the name Windhover Labs nor the names of its 
*    contributors may be used to endorse or promote products derived 
*    from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
* "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
* LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
* FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
* COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
* INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
* BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
* OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
* AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
* LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
* ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
* POSSIBILITY OF SUCH DAMAGE.
*
*****************************************************************************/

'use strict';

var Parser = require('binary-parser').Parser;
const net = require('net');
const Emitter = require('events');
var fs = require('fs');
const util = require('util');
var protobuf = require('protobufjs');
var Promise = require('promise');
var mergeJSON = require('merge-json');
var convict = require('convict');
var config = require('./config.js');
const Sparkles = require('sparkles');
var path = require('path');
var dot = require('dot-object');

/* Event IDs */
var EventEnum = Object.freeze({
		'INITIALIZED':       1,
		'CMD_MSG_NOT_FOUND': 2
	});

var emit = Emitter.prototype.emit;

exports = module.exports = ProtobufDecoder;

exports.events = [
  'connect',
  'close',
  'error'
];



function recFindByExt(base, ext, files, result) 
{
    files = files || fs.readdirSync(base) 
    result = result || [] 

    files.forEach( 
        function (file) {
            var newbase = path.join(base,file)
            if ( fs.statSync(newbase).isDirectory() )
            {
                result = recFindByExt(newbase,ext,fs.readdirSync(newbase),result)
            }
            else
            {
                if ( file.substr(-1*(ext.length+1)) == '.' + ext )
                {
                    result.push(newbase)
                } 
            }
        }
    )
    return result
}


var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function ProtobufDecoder(configFile) {
    this.parsers = {};
    this.instanceEmitter;
    this.defs = {};
    
    /* Load environment dependent configuration */
    config.loadFile(configFile);

    /* Perform validation */
    config.validate({allowed: 'strict'});
    
    this.ccsdsPriHdr = new Parser()
      .endianess('big')
      .bit3('version')
      .bit1('pktType')
      .bit1('secHdr')
      .bit11('apid')
      .bit2('segment')
      .bit14('sequence')
      .uint16('length');
    
	this.ccsdsCmdSecHdr = new Parser()
	  .endianess('big')
	  .uint8('checksum')
	  .bit1('reserved')
	  .bit7('code');
	
    switch(config.get('CFE_SB_PACKET_TIME_FORMAT')) {
      case 'CFE_SB_TIME_32_16_SUBS':
        this.ccsdsTlmSecHdr = new Parser()
    	  .endianess('little')
          .uint32('seconds')
          .uint16('subseconds');
        this.tlmHeaderLength = 96;
    	break;
    	  
      case 'CFE_SB_TIME_32_32_SUBS':
        this.ccsdsTlmSecHdr = new Parser()
    	  .endianess('little')
          .uint32('seconds')
          .uint32('subseconds');
        this.tlmHeaderLength = 98;
    	break;
    	  
      case 'CFE_SB_TIME_32_32_M_20':
        this.ccsdsTlmSecHdr = new Parser()
    	  .endianess('little')
          .uint32('seconds')
          .uint32('subseconds');
        this.tlmHeaderLength = 98;
    	break;
    	  
      default:
	    break;
    }

    this.ccsds = new Parser()
        .endianess('little')
        .nest('PriHdr', {type: this.ccsdsPriHdr})
        .choice('SecHdr', {
    	    tag: 'PriHdr.pktType',
    	    choices: {
    	        0: this.ccsdsTlmSecHdr,
    	        1: this.ccsdsCmdSecHdr
    	    }
    	})
        .buffer('payload', {readUntil: 'eof'});
    
    var protoFiles = recFindByExt('./proto_defs', 'proto');
    
    for(var i = 0; i < protoFiles.length; i++) {
    	this.parseProtoFile('./' + protoFiles[i]);
    }
};



ProtobufDecoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;
	
	this.instanceEmitter.on(config.get('binaryInputStreamID'), function(buffer) {
	    var message = self.ccsds.parse(buffer);
	    var msgID = buffer.readUInt16BE(0);
	    
	    if(self.isCommandMsg(msgID)) {
		    var cmdCode = message.SecHdr.code;
	    	
	    	self.requestCmdDefinition(msgID, cmdCode, function (cmdDef) {
		    	var msgLength = message.PriHdr.length;
		    	
		    	if(msgLength > 1) {
					var msgDef = self.getCmdByName(cmdDef.operation.airliner_msg);
			    	
				    if(typeof msgDef !== 'undefined') {
				    	var tlmJson = {};
				    	
				    	var pbMsgDef = msgDef.proto.lookupType(msgDef.name + '_pb');
				    	
				    	var pbMsg = pbMsgDef.create(tlmJson);
				    	
				    	var msg = pbMsgDef.decode(message.payload);
				    	
				    	var obj = pbMsgDef.toObject(msg, {
				    		long: String,
				    		enums: String,
				    		bytes: String
				    	});
				    	
				    	var args = dot.dot(obj);
				    	
						self.sendCmd(cmdDef.ops_path, args);
				    } else {
				        this.logErrorEvent(EventEnum.CMD_MSG_NOT_FOUND, 'Command message \'' + cmdDef.operation.airliner_msg + '\' not found.');
				    }
		    	}
	    	})
	    } else {	         
            var msgLength = message.PriHdr.length;
		    	
		    if(msgLength > 1) {
	            self.requestTlmDefinition(msgID, function (tlmDef) {

		            if(typeof tlmDef !== 'undefined') {
		            	var msgDef = self.getMsgDefBySymbolName(tlmDef.symbol);
				        var tlmJson = {};
				    	var pbMsgDef = msgDef.proto.lookupType(tlmDef.symbol + '_pb');
				    	var pbMsg = pbMsgDef.create(tlmJson);
				    	var obj = pbMsgDef.decode(message.payload);
					    self.instanceEmit(config.get('jsonTlmOutputStreamID'), obj);;
					}
		        });
		    }
	    }
    });
	
    this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}



ProtobufDecoder.prototype.sendCmd = function (cmdName, args) {
	this.instanceEmit(config.get('jsonCmdOutputStreamID'), {ops_path: cmdName, args: args});
}



ProtobufDecoder.prototype.instanceEmit = function (streamID, msg) {
	if(typeof this.instanceEmitter === 'object') {
		this.instanceEmitter.emit(streamID, msg);
	}
}



ProtobufDecoder.prototype.requestCmdDefinition = function (msgID, cmdCode, cb) {
	var self = this;
	
	var listenerChannel = config.get('cmdDefRspStreamIDPrefix') + ':' + msgID + ':' + cmdCode;
	
	function cmdDefRspListener(definition) {
		self.instanceEmitter.removeListener(listenerChannel, cmdDefRspListener);
    	cb(definition);
	}
	
	this.instanceEmitter.once(listenerChannel, cmdDefRspListener);
	
	this.instanceEmit(config.get('cmdDefReqStreamID'), {msgID: msgID, cmdCode: cmdCode});
}



ProtobufDecoder.prototype.requestTlmDefinition = function (msgID, cb) {
	var self = this;
	
	var listenerChannel = config.get('tlmDefRspStreamIDPrefix') + ':' + msgID;
	
	function tlmDefRspListener(definition) {
		self.instanceEmitter.removeListener(listenerChannel, tlmDefRspListener);
    	cb(definition);
	}
	
	this.instanceEmitter.on(listenerChannel, tlmDefRspListener);
	
	this.instanceEmit(config.get('tlmDefReqStreamID'), {msgID: msgID});
}



/**
 * Inherits from `EventEmitter`.
 */
ProtobufDecoder.prototype.__proto__ = Emitter.prototype;


ProtobufDecoder.prototype.processFields = function (inJSON, outJSON) {		
	for(var i = 0; i < inJSON.length; ++i) {
	    var engName = inJSON[i].engName;

		var path = engName.split('/');
		
		var tmpObj = outJSON;
		for(var j = 2; j < path.length; ++j) {
			if(outJSON.hasOwnProperty(path[j]) == false) {
				/* Property doesn't exist.  Add it. */
				if(j == path.length - 1) {
					tmpObj[path[j]] = inJSON[i].value;
				} else {
					tmpObj[path[j]] = {};
				}
			}
			tmpObj = tmpObj[path[j]]
		}
	}
}



ProtobufDecoder.prototype.getCmdDefByPath = function (path) {
	for(var name in this.defs) {
		var cmd = this.defs[name];
		if(cmd.path == path){
			return cmd;
		}
	}
}



ProtobufDecoder.prototype.getMsgDefBySymbolName = function (name) {
	return this.defs[name];
};



ProtobufDecoder.prototype.getCmdDefByMsgIDandCC = function (msgID, cmdCode) {
	for(var name in this.defs) {
		var cmd = this.defs[name];
		if((cmd.msgID == msgID) && (cmd.commandCode == cmdCode)){
			return cmd;
		}
	}
}



ProtobufDecoder.prototype.getCmdByName = function (name) {
	for(var item in this.defs) {
		var cmd = this.defs[item];
		if(cmd.name == name){
			return cmd;
		}
	}
}



ProtobufDecoder.prototype.getTlmDefByMsgID = function (msgID) {
	for(var name in this.defs) {
		var tlm = this.defs[name];
		if(tlm.msgID == msgID){
			return tlm;
		}
	}
}



ProtobufDecoder.prototype.parseProtoFile = function (filePath) {
	var self = this;
	
    var fileName = filePath.replace(/^.*[\\\/]/, '');
    var structureName = fileName.replace(/\.[^/.]+$/, '');
    
    self.defs[structureName] = {name: structureName, proto: new protobuf.Root()};
    
	protobuf.loadSync(filePath, self.defs[structureName].proto);
}



ProtobufDecoder.prototype.isCommandMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return true;
	} else {
		return false;
	}
}



ProtobufDecoder.prototype.isTelemetryMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return false;
	} else {
		return true;
	}
}



ProtobufDecoder.prototype.logDebugEvent = function (eventID, text) {
	this.instanceEmit('events-debug', {sender: this, component:'ProtobufDecoder', eventID:eventID, text:text});
}



ProtobufDecoder.prototype.logInfoEvent = function (eventID, text) {
	this.instanceEmit('events-info', {sender: this, component:'ProtobufDecoder', eventID:eventID, text:text});
}



ProtobufDecoder.prototype.logErrorEvent = function (eventID, text) {
	this.instanceEmit('events-error', {sender: this, component:'ProtobufDecoder', eventID:eventID, text:text});
}



ProtobufDecoder.prototype.logCriticalEvent = function (eventID, text) {
	this.instanceEmit('events-critical', {sender: this, component:'ProtobufDecoder', eventID:eventID, text:text});
}
