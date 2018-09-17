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
var Long = require('long');

/* Event IDs */
var EventEnum = Object.freeze({
		'INITIALIZED':            1,
		'OPS_PATH_NOT_FOUND':     2,
		'MSG_OPS_PATH_NOT_FOUND': 3,
		'MSG_DEF_NOT_FOUND':      4,
		'APP_NOT_FOUND':          5
	});

var emit = Emitter.prototype.emit;

exports = module.exports = ProtobufEncoder;

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

function ProtobufEncoder(configFile) {
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
	  .endianess('little')
	  .bit1('reserved')
	  .bit7('code')
	  .uint8('checksum');
	
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
};



ProtobufEncoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;
    var inMsgDefs = config.get('msgDefs')
    
    for(var i = 0; i < inMsgDefs.length; ++i) {
    	var msgDefInput = JSON.parse(fs.readFileSync(inMsgDefs[i].file, 'utf8'));
    	this.defs = mergeJSON.merge(this.defs, msgDefInput);
    }
    
    var protoFiles = recFindByExt('./proto_defs', 'proto');
    
    for(var i = 0; i < protoFiles.length; i++) {
    	this.parseProtoFile('./' + protoFiles[i]);
    }

	this.instanceEmitter.on(config.get('jsonInputStreamID'), function(message) {
		var tlmDef = self.getTlmDefByPath(message.opsPath);
		
    	if(typeof tlmDef === 'undefined') {
    		/* TODO */
    	} else {
    		var msgDef = self.getMsgDefByName(tlmDef.airliner_msg);
    		
        	if(typeof msgDef === 'undefined') {
        		/* TODO */
        	} else {
            	if(msgDef.hasOwnProperty('proto_root')) {
                	var symbolName = self.getSymbolNameFromOpsPath(message.opsPath);
            		var msgID = tlmDef.airliner_mid;
            		
            	    if(typeof symbolName !== 'undefined') {
            	    	var tlmJson = self.convertJsonToProtoJson(message.fields);  
                		
            	    	var pbMsgDef = msgDef.proto_root.lookupType(symbolName + '_pb');
            	    	var pbMsg = pbMsgDef.create(tlmJson);

            	    	var pbBuffer = pbMsgDef.encode(pbMsg).finish();
            	    	
            	    	var hdrBuffer = new Buffer(12)
            	  	    hdrBuffer.writeUInt16BE(msgID, 0);
            	        hdrBuffer.writeUInt16BE(1, 2);
            	  	    hdrBuffer.writeUInt16BE(pbBuffer.length - 1, 4);
            	  	    hdrBuffer.writeUInt16BE(0, 6);
            	  	    hdrBuffer.writeUInt16BE(0, 8);
            	  	    hdrBuffer.writeUInt16BE(0, 10);
            	        
            	        var msgBuffer = Buffer.concat([hdrBuffer, pbBuffer]);
            	        self.instanceEmit(config.get('binaryOutputStreamID'), msgBuffer);
            	    }
            	}
        	}
    	}
	});
	
    this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}



ProtobufEncoder.prototype.instanceEmit = function (streamID, msg)
{
	if(typeof this.instanceEmitter === 'object') {
		this.instanceEmitter.emit(streamID, msg);
	} else {
		console.log('--- ' + msg.component + ', ' + msg.eventID + ', ' + msg.text);
	}
}




/**
 * Inherits from `EventEmitter`.
 */
ProtobufEncoder.prototype.__proto__ = Emitter.prototype;



ProtobufEncoder.prototype.getMsgOpsPathFromFullOpsPath = function (opsPath) {	
	var appName = this.getAppNameFromPath(opsPath);
	var opName = this.getOperationFromPath(opsPath);
	
	var msgOpsPath = '/' + appName + '/' + opName;
	
	return msgOpsPath;
}



ProtobufEncoder.prototype.getSymbolNameFromOpsPath = function (opsPath) {	
	var msgOpsPath = this.getMsgOpsPathFromFullOpsPath(opsPath);
	
	if(typeof msgOpsPath === 'undefined') {
	    this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND, 'getSymbolNameFromOpsPath: Ops path not found.');
	} else {
		var msgDef = this.getTlmDefByPath(msgOpsPath);
		
		if(typeof msgDef === 'undefined') {
		    this.logErrorEvent(EventEnum.MSG_OPS_PATH_NOT_FOUND, 'getSymbolNameFromOpsPath: Message ops path not found.');
			return undefined;
		} else {
			return msgDef.airliner_msg;
		}
	}
	
}



ProtobufEncoder.prototype.convertJsonToProtoJson = function (inJSON) {	
	var outJSON = {};
	
	for(var itemID in inJSON) {
        var msgOpsPath = this.getMsgOpsPathFromFullOpsPath(itemID);
        
        var updatedItemID = itemID.replace(msgOpsPath + '/', '');
        updatedItemID = updatedItemID.replace('/', '.');
                
        outJSON[updatedItemID] = inJSON[itemID].value;
	}
	
	dot.object(outJSON);
	
	return outJSON;
}



ProtobufEncoder.prototype.getMsgDefByName = function (msgName) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		for(var protoID in app.proto_msgs) {
			var protomsg = app.proto_msgs[protoID];
			if(protoID == msgName) {
				return protomsg;
			}
		}
	}
}



ProtobufEncoder.prototype.parseProtoFile = function (filePath) {
	var self = this;
	
    var fileName = filePath.replace(/^.*[\\\/]/, '');
    var structureName = fileName.replace(/\.[^/.]+$/, '');
    
    var msgDef = this.getMsgDefByName(structureName);
    
    if(typeof msgDef === 'undefined') {
	    this.logErrorEvent(EventEnum.MSG_DEF_NOT_FOUND, 'parseProtoFile (\'' + filePath + '\'): Message definition not found. \'' + structureName + '\'.');
    } else {
    	msgDef.proto_root = new protobuf.Root();

    	protobuf.loadSync(filePath, msgDef.proto_root);
    }
}



ProtobufEncoder.prototype.getAppNameFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[1];
}



ProtobufEncoder.prototype.getOperationFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[2];
}



ProtobufEncoder.prototype.getAppDefinition = function (appName) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		if(app.app_name == appName) {
			return app;
		}
	}
}



ProtobufEncoder.prototype.getMsgDefByPath = function (path) {
    var tlmDef = this.getTlmDefByPath(path);
    
    if(typeof tlmDef === 'undefined') {
	    this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND, 'getMsgDefByPath:  Ops path not found. \'' + path + '\'.');
    	return undefined;
    } else {
    	return tlmDef.airliner_msg;
    }
}



ProtobufEncoder.prototype.getTlmDefByPath = function (path) {
    var appName = this.getAppNameFromPath(path);
    if(typeof appName === 'undefined') {
	    this.logErrorEvent(EventEnum.APP_NOT_FOUND, 'getTlmDefByPath:  App not found in path. \'' + path + '\'.');
    } else {
	    var operationName = this.getOperationFromPath(path);
	    if(typeof operationName === 'undefined') {
		    this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND, 'getTlmDefByPath:  Ops path not found. \'' + path + '\'.');
	    	return undefined;
	    } else {
		    var appDefinition = this.getAppDefinition(appName);
		    
		    if(typeof appDefinition === 'undefined') {
			    this.logErrorEvent(EventEnum.APP_NOT_FOUND, 'getTlmDefByPath:  App not found. \'' + appName + '\'.');
		    	return undefined;
		    } else {
			    return appDefinition.operations[operationName];
		    }
	    }
    }
}



ProtobufEncoder.prototype.logDebugEvent = function (eventID, text) {
	this.instanceEmit('events-debug', {sender: this, component:'PE', eventID:eventID, text:text});
}



ProtobufEncoder.prototype.logInfoEvent = function (eventID, text) {
	this.instanceEmit('events-info', {sender: this, component:'PE', eventID:eventID, text:text});
}



ProtobufEncoder.prototype.logErrorEvent = function (eventID, text) {
	this.instanceEmit('events-error', {sender: this, component:'PE', eventID:eventID, text:text});
}



ProtobufEncoder.prototype.logCriticalEvent = function (eventID, text) {
	this.instanceEmit('events-critical', {sender: this, component:'PE', eventID:eventID, text:text});
}

