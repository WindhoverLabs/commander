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

var Parser = require("binary-parser").Parser;
const net = require('net');
const Emitter = require('events');
var fs = require('fs');
const util = require('util');
var mergeJSON = require('merge-json');
var convict = require('convict');
var path = require('path');
var config = require('./config.js');

/* Event IDs */
var EventEnum = Object.freeze({
		'INITIALIZED':              1,
		'OPS_PATH_NOT_FOUND':       2,
		'MSG_ID_NOT_FOUND':         3,
		'INVALID_REQUEST':          4,
		'APP_NOT_FOUND':            5,
		'UNKNOWN_DATA_TYPE':        6,
		'UNHANDLED_EXCEPTION':      7,
		'FUNCTION_NOT_IMPLEMENTED': 8
	});

var emit = Emitter.prototype.emit;

exports = module.exports = BinaryEncoder;

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function BinaryEncoder(workspace, configFile) {
    this.defs;
    this.workspace = workspace;
    this.cmdHeaderLength = 64;
    this.sequence = 0;
    this.cdd = {};
    var self = this;
    this.instanceEmitter;
    
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
    
    var inMsgDefs = config.get('msgDefs');
    
    for(var i = 0; i < inMsgDefs.length; ++i) {
    	if(typeof process.env.AIRLINER_MSG_DEF_PATH === 'undefined') {
    		var fullPath = path.join(this.workspace, config.get('msgDefPath'), inMsgDefs[i].file);
    	} else {
    		var fullPath = path.join(process.env.AIRLINER_MSG_DEF_PATH, inMsgDefs[i].file);
    	}
    	var msgDefInput = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    	this.defs = mergeJSON.merge(this.defs, msgDefInput);
    }
};



BinaryEncoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('cmdDefReqStreamID'), function(cmdReq, cb) {
		if(cmdReq.hasOwnProperty('opsPath')) {
			var outCmdDef = {opsPath:cmdReq.opsPath, args:[]};
			var opDef = self.getOperationByPath(cmdReq.opsPath);

			var msgDef = self.getMsgDefByName(opDef.operation.airliner_msg);
			if(typeof msgDef === 'object') {

				var args = self.getCmdOpNamesStripHeader(msgDef);
				for(var argID in args) {
					outCmdDef.args.push({name:argID, type:args[argID].dataType, bitSize:args[argID].bitSize});
				}
			}
			
			cb(outCmdDef);
		} else if (cmdReq.hasOwnProperty('msgID') && cmdReq.hasOwnProperty('cmdCode')) {
			var cmdDef = self.getCmdDefByMsgIDandCC(cmdReq.msgID, cmdReq.cmdCode);
			
			cb(cmdDef);
		} else {
		    this.logErrorEvent(EventEnum.INVALID_REQUEST, 'CmdDefReq: Invalid request.  \'' + req + '\'');
			
			cb(undefined);
		}
	});

	this.instanceEmitter.on(config.get('cmdSendStreamID'), function(req) {
		var cmdDef = self.getCmdDefByPath(req.ops_path);
		
		if(typeof cmdDef === 'undefined') {
		    this.logErrorEvent(EventEnum.INVALID_REQUEST, 'CmdSend: Ops path not found.  \'' + req + '\'');
		} else {
			self.sendCommand(cmdDef, req.args);
		}
	});

	this.instanceEmitter.on(config.get('tlmSendStreamID'), function(tlmObj) {
	    this.logErrorEvent(EventEnum.FUNCTION_NOT_IMPLEMENTED, 'TlmSend: Function not yet implemented.');
	});

    this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}



BinaryEncoder.prototype.getCmdOpNamesStripHeader = function (cmdDef) {
	var opsPaths = {};
	
	if(cmdDef.hasOwnProperty('operational_names')) {
		for(var opNameID in cmdDef.operational_names) {
			var fieldNames = cmdDef.operational_names[opNameID].field_path.split('.');
			var fieldName = fieldNames[0];
			var field = cmdDef.fields[fieldName];
	
			var fieldDef = this.getFieldFromOperationalName(cmdDef, opNameID);
			if((fieldDef.bitOffset * 8) > this.cmdHeaderLength) {
				opsPaths[opNameID] = {dataType: fieldDef.fieldDef.airliner_type, bitSize: fieldDef.fieldDef.bit_size};
			}
		}
	}
	
	return opsPaths;
}



BinaryEncoder.prototype.instanceEmit = function (streamID, msg)
{
	this.instanceEmitter.emit(streamID, msg);
}



/**
 * Inherits from `EventEmitter`.
 */
BinaryEncoder.prototype.__proto__ = Emitter.prototype;



BinaryEncoder.prototype.getAppNameFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[1];
}



BinaryEncoder.prototype.getOperationFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[2];
}



BinaryEncoder.prototype.getAppDefinition = function (appName) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		if(app.app_name == appName) {
			return app;
		}
	}
}



BinaryEncoder.prototype.getOperationByPath = function (inOpsPath) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		for(var opID in app.operations) {
			var operation = app.operations[opID];
			var opsPath = '/' + appID + '/' + opID
			if(opsPath === inOpsPath) {
				return {ops_path:opsPath, operation:operation};
			}
		}
	}
}



BinaryEncoder.prototype.getOperationByMsgIDandCC = function (msgID, cmdCode) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		for(var opID in app.operations) {
			var operation = app.operations[opID];
			var opsPath = '/' + appID + '/' + opID
			if((parseInt(operation.airliner_mid) == msgID) && (operation.airliner_cc == cmdCode)) {
				var result = {ops_path:opsPath, operation: operation};
				return result;
			}
		}
	}
}



BinaryEncoder.prototype.getCmdDefByMsgIDandCC = function (msgID, cmdCode) {
	var cmdDef = this.getOperationByMsgIDandCC(msgID, cmdCode);
	
	if(cmdDef.operation.airliner_msg !== '') {
		cmdDef.operational_names = this.getCmdOpNamesStripHeader(cmdDef.operation.airliner_msg)
	}
	
	return cmdDef;
}



BinaryEncoder.prototype.getCmdDefByPath = function (opsPath) {
	var cmdDef = this.getOperationByPath(opsPath);
    var result = {opsPath: opsPath, args: []};
    
    if(typeof cmdDef === 'undefined') {
	    this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND, 'getCmdDefByPath: Ops path not found.  \'' + path + '\'');
	    return undefined;
    } else {
    	if(typeof cmdDef.operation === 'undefined') {
    	    this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND, 'getCmdDefByPath: Ops path not found.  \'' + path + '\'');
    	    return undefined;
    	} else {
    		if(cmdDef.operation.airliner_msg !== '') {
    			var opNames = this.getCmdOpNamesStripHeader(cmdDef.operation.airliner_msg);
    			var tmp = this.getCmdDefByMsgIDandCC(0x1806, 20);
    			var opNames2 = this.getCmdOpNamesStripHeader(tmp.operation.airliner_msg);
    		} 
    	}
    }
	
	return result;
}



BinaryEncoder.prototype.getMsgDefByName = function (msgName) {
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



BinaryEncoder.prototype.getCmdByteLength = function (cmd) {
	if(cmd.airliner_msg === '') {
		return this.cmdHeaderLength / 8;
	} else {
		var msgDef = this.getMsgDefByName(cmd.airliner_msg);
		return msgDef.bit_size / 8;
	}
}



BinaryEncoder.prototype.setField = function (buffer, fieldDef, bitOffset, value) {	
	try{			
		if(fieldDef.array_length > 1) {
			switch(fieldDef.airliner_type) {
				case 'char':
					buffer.write(value, bitOffset / 8, fieldDef.array_length);
					break;
				
				case 'uint8':
					for(var i = 0; i < fieldDef.array_length; ++i) {
					    buffer.writeUInt8(value, bitOffset / 8);
					}
					break;
					
				case 'string':
					buffer.write(value, bitOffset / 8, fieldDef.array_length);
					break;
					
				case 'uint16':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						buffer.writeUInt16LE(value, (bitOffset / 8) + i);
					}
					break;
					
				case 'int16':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						buffer.writeInt16LE(value, (bitOffset / 8) + i);
					}
					break;
					
				case 'uint32':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						buffer.writeUInt32LE(value, (bitOffset / 8) + i);
					}
					break;
					
				case 'int32':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						buffer.writeInt32LE(value, (bitOffset / 8) + i);
					}
					break;
					
				default:
				    this.logErrorEvent(EventEnum.UNKNOWN_DATA_TYPE, 'setField: Unknown data type.  \'' + fieldDef.airliner_type + '\'');
			}
		} else {
			switch(fieldDef.airliner_type) {
				case 'char':
					buffer.writeUInt8(value, bitOffset / 8);
					break;
				
				case 'uint8':
					buffer.writeUInt8(value, bitOffset / 8);
					break;
					
				case 'string':
					buffer.write(value, bitOffset / 8);
					break;
					
				case 'uint16':
					buffer.writeUInt16LE(value, bitOffset / 8);
					break;
					
				case 'int16':
					buffer.writeInt16LE(value, bitOffset / 8);
					break;
					
				case 'uint32':
					buffer.writeUInt32LE(value, bitOffset / 8);
					break;
					
				case 'int32':
					buffer.writeInt32LE(value, bitOffset / 8);
					break;
					
				default:
				    this.logErrorEvent(EventEnum.UNKNOWN_DATA_TYPE, 'setField: Unknown data type.  \'' + fieldDef.airliner_type + '\'');
			}
	    }
	} catch(err) {
	    this.logErrorEvent(EventEnum.UNHANDLED_EXCEPTION, 'setField: Unhandled exception. \'' + err + '\'');
	}
}



BinaryEncoder.prototype.sendCommand = function (cmd, args) {	
	var opDef = this.getOperationByPath(cmd.opsPath);
	var byteLength = this.getCmdByteLength(opDef.operation);
	var buffer = new Buffer(byteLength);
	buffer.fill(0x00);
	
	buffer.writeUInt16BE(opDef.operation.airliner_mid, 0);
	buffer.writeUInt16BE(this.sequence, 2);
	buffer.writeUInt16BE(byteLength - 7, 4);
	buffer.writeUInt8(opDef.operation.airliner_cc, 7);
	buffer.writeUInt8(0, 6);
	
	this.sequence++;
	
	var msgDef = this.getMsgDefByName(opDef.operation.airliner_msg);
	if(typeof msgDef === 'object') {
		if(msgDef.hasOwnProperty('operational_names')) {
			for(var opNameID in msgDef.operational_names) {
				var fieldNames = msgDef.operational_names[opNameID].field_path.split('.');
				var fieldName = fieldNames[0];
				var field = msgDef.fields[fieldName];
		
				var arg_path = msgDef.operational_names[opNameID].field_path;
				
				if(args.hasOwnProperty(opNameID)) {
					var fieldDef = this.getFieldFromOperationalName(msgDef, opNameID);
					this.setField(buffer, fieldDef.fieldDef, fieldDef.bitOffset, args[opNameID]);
				}
			}
		}
	}
	
	this.instanceEmit(config.get('binaryOutputStreamID'), buffer);
}



BinaryEncoder.prototype.getFieldFromOperationalName = function (msgDef, opName, bitOffset) {
	var op = msgDef.operational_names[opName].field_path;
	var fieldPathArray = op.split('.');
	var fieldName = fieldPathArray[0];
	var fieldDef = msgDef.fields[fieldName];
	
	if(typeof bitOffset === 'undefined') {
		bitOffset = fieldDef.bit_offset;
	}
	
	var fieldType = fieldDef.airliner_type;
	
	var fieldMsgDef = this.getMsgDefByName(fieldType);
	
	if(typeof fieldMsgDef === 'object') {
		if(fieldPathArray.length == 1) {
			return fieldMsgDef;
		} else {
			if(fieldMsgDef.hasOwnProperty('operational_names')) {
				fieldPathArray.shift();
				var nextFieldName = fieldPathArray[0];
				return this.getFieldFromOperationalName(fieldMsgDef, nextFieldName, bitOffset);
			}
		}
	} else {
		return {fieldDef: fieldDef, bitOffset: fieldDef.bit_offset + bitOffset};
	}
}



BinaryEncoder.prototype.isCommandMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return true;
	} else {
		return false;
	}
}



BinaryEncoder.prototype.isTelemetryMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return false;
	} else {
		return true;
	}
}



BinaryEncoder.prototype.logDebugEvent = function (eventID, text) {
	this.instanceEmit('events-debug', {sender: this, component:'BinaryEncoder', eventID:eventID, text:text});
}



BinaryEncoder.prototype.logInfoEvent = function (eventID, text) {
	this.instanceEmit('events-info', {sender: this, component:'BinaryEncoder', eventID:eventID, text:text});
}



BinaryEncoder.prototype.logErrorEvent = function (eventID, text) {
	this.instanceEmit('events-error', {sender: this, component:'BinaryEncoder', eventID:eventID, text:text});
}



BinaryEncoder.prototype.logCriticalEvent = function (eventID, text) {
	this.instanceEmit('events-critical', {sender: this, component:'BinaryEncoder', eventID:eventID, text:text});
}