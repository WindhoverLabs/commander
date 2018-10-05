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
var Promise = require('promise');
var mergeJSON = require('merge-json');
var convict = require('convict');
var config = require('./config.js');
var Int64LE = require('int64-buffer').Int64LE;
var Int64BE = require('int64-buffer').Int64BE;
var Uint64LE = require('int64-buffer').Uint64LE;
var Uint64BE = require('int64-buffer').Uint64BE;
var path = require('path');
var Long = require('long');

/* Event IDs */
var EventEnum = Object.freeze({
		'INITIALIZED':         1,
		'OPS_PATH_NOT_FOUND':  2,
		'MSG_ID_NOT_FOUND':    3,
		'INVALID_REQUEST':     4,
		'APP_NOT_FOUND':       5,
		'UNKNOWN_DATA_TYPE':   6,
		'UNHANDLED_EXCEPTION': 7
	});

var emit = Emitter.prototype.emit;

exports = module.exports = BinaryDecoder;

exports.events = [
  'connect',
  'close',
  'error'
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function BinaryDecoder(workspace, configFile) {
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
    
    var inMsgDefs = config.get('msgDefs')
    
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



BinaryDecoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('binaryInputStreamID'), function(buffer) {
    	self.processBinaryMessage(buffer);
	});

	this.instanceEmitter.on(config.get('tlmDefReqStreamID'), function(tlmReqs, cb) {
        if(typeof tlmReqs.length === 'number') {
            /* This must be an array. */
            var outTlmDefs = [];
            for(var i = 0; i < tlmReqs.length; ++i) {
                var tlmDef = self.getTlmDefByName(tlmReqs[i].name);
                if(typeof tlmDef !== 'undefined') {
                    outTlmDefs.push(tlmDef);
                }
            }
            cb(outTlmDefs);
        } else {
            /* This is a single request. */
            cb(self.getTlmDefByName(tlmReqs.name));
        }
	});
	
    this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}
	
	
	
BinaryDecoder.prototype.getTlmDefByName = function (name) {
    var outTlmDef = {opsPath:name};
    var fieldDef = this.getTlmDefByPath(name);

    switch(fieldDef.airliner_type) {
        case 'char':
        case 'uint8':
        case 'int8':
        case 'string':
        case 'uint16':
        case 'int16':
        case 'uint32':
        case 'int32':
        case 'float':
        case 'double':
        case 'boolean':
        case 'uint64':
        case 'int64':
            outTlmDef.dataType = fieldDef.airliner_type;
            break;
            
        default:
            switch(fieldDef.pb_type) {
                case 'char':
                case 'uint8':
                case 'int8':
                case 'string':
                case 'uint16':
                case 'int16':
                case 'uint32':
                case 'int32':
                case 'float':
                case 'double':
                case 'boolean':
                case 'uint64':
                case 'int64':
                    outTlmDef.dataType = fieldDef.pb_type;
                    break;
                    
                default:
                    console.log("Data type not found");
            }
    }
    
    if(fieldDef.array_length != 0) {
        outTlmDef.arrayLength = fieldDef.array_length;
    }
    
    return outTlmDef;
}



BinaryDecoder.prototype.getAppNameFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[1];
}



BinaryDecoder.prototype.getOperationFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[2];
}



BinaryDecoder.prototype.getAppDefinition = function (appName) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		if(app.app_name == appName) {
			return app;
		}
	}
}



BinaryDecoder.prototype.getOperationByPath = function (inOpsPath) {
    for(var appID in this.defs.Airliner.apps) {
        var app = this.defs.Airliner.apps[appID];
        for(var opID in app.operations) {
            var operation = app.operations[opID];
            var opsPath = '/' + appID + '/' + opID;
            if(opsPath === inOpsPath) {
                return {ops_path:opsPath, operation:operation};
            }
        }
    }
}



BinaryDecoder.prototype.getTlmDefByPath = function (path) {
    var appName = this.getAppNameFromPath(path);
    var operationName = this.getOperationFromPath(path);
    if(typeof operationName === 'undefined') {
	    this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND, 'getTlmDefByPath: Ops path not found. \'' + path + '\'');
    	return undefined;
    } else {
	    var appDefinition = this.getAppDefinition(appName);
	    
	    if(typeof appDefinition === 'undefined') {
		    this.logErrorEvent(EventEnum.APP_NOT_FOUND, 'getTlmDefByPath: App not found. \'' + appName + '\'');
	    	return undefined;
	    } else {
	        var msgDef = this.getMsgDefByName(appDefinition.operations[operationName].airliner_msg);
	        
	        var splitName = path.split('/');
	        var opNameID = splitName[3];
	        var fieldPath = msgDef.operational_names[opNameID].field_path;
	        
	        var fieldDef = this.getFieldFromOperationalName(msgDef, fieldPath, 0);
	        return fieldDef.fieldDef;
	    }
    }
}



BinaryDecoder.prototype.getTlmOpNamesStripHeader = function (tlmDef) {
	var opsPaths = {};
	
	if(tlmDef.hasOwnProperty('operational_names')) {
		for(var opNameID in msgDef.operational_names) {
			var fieldNames = tlmDef.operational_names[opNameID].field_path.split('.');
			var fieldName = fieldNames[0];
			var field = tlmDef.fields[fieldName];
	
			var fieldDef = this.getFieldFromOperationalName(tlmDef, opNameID);
			
			if(fieldDef.bitOffset > this.tlmHeaderLength) {
				opsPaths[opNameID] = {dataType: fieldDef.fieldDef.airliner_type};
			}
		}
	}
	
	return opsPaths;
}



BinaryDecoder.prototype.instanceEmit = function (streamID, msg)
{
	this.instanceEmitter.emit(streamID, msg);
}




/**
 * Inherits from `EventEmitter`.
 */
BinaryDecoder.prototype.__proto__ = Emitter.prototype;



BinaryDecoder.prototype.getMsgDefByName = function (msgName) {
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



BinaryDecoder.prototype.getMsgDefByMsgID = function (msgID) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		for(var opID in app.operations) {
			var operation = app.operations[opID];
			if(operation.airliner_mid == msgID) {
				var opsPath = '/' + appID + '/' + opID;

				return {opsPath: opsPath, msgDef: this.getMsgDefByName(operation.airliner_msg)};
			}
		}
	}
}



BinaryDecoder.prototype.getFieldObjFromPbMsg = function (pbMsgDef, fieldPathArray, bitOffset) {
	var fieldName = fieldPathArray[0];  
	
	var fieldDef = pbMsgDef.fields[fieldName];  
	
	var pbType = fieldDef.pb_type;             
	
	if(fieldPathArray.length == 1) {
		return {fieldDef: fieldDef, bitOffset: fieldDef.bit_offset + bitOffset};
	} else {
		var childMsgDef = pbMsgDef.required_pb_msgs[fieldDef.pb_type];

		fieldPathArray.shift();
		
		return this.getFieldObjFromPbMsg(childMsgDef, fieldPathArray, fieldDef.bit_offset + bitOffset);
	}

}



BinaryDecoder.prototype.getFieldFromOperationalName = function (msgDef, opName, bitOffset) {
	var op = msgDef.operational_names[opName];
	var fieldPathArray = opName.split('.');  

	var pbMsg = this.getFieldObjFromPbMsg(msgDef, fieldPathArray, bitOffset);

	return pbMsg; 
}



BinaryDecoder.prototype.processBinaryMessage = function (buffer) {
    var msgID = buffer.readUInt16BE(0);
    
	var message = this.ccsds.parse(buffer);
	
	var msgTime = this.cfeTimeToJsTime(message.SecHdr.seconds, message.SecHdr.subSeconds);
	
	var def = this.getMsgDefByMsgID(msgID);

	var parsedTlm = {};
	
    if(typeof def !== 'undefined') {
		if(def.msgDef.hasOwnProperty('operational_names')) {		    
			for(var opNameID in def.msgDef.operational_names) {
				var fieldNames = def.msgDef.operational_names[opNameID].field_path.split('.');
				var fieldName = fieldNames[0];

				var fieldDef = this.getFieldFromOperationalName(def.msgDef, def.msgDef.operational_names[opNameID].field_path, 0);
				
				var opsPath = def.opsPath + '/' + opNameID;
				
				parsedTlm[opsPath] = {};
				
				if(typeof fieldDef.fieldDef === 'undefined') {
					//console.log(def.msgDef);
					//console.log(opNameID);
					//console.log(fieldDef);
				} else {
					parsedTlm[opsPath].value = this.getField(buffer, fieldDef.fieldDef, fieldDef.bitOffset);
					parsedTlm[opsPath].msgTime = msgTime;
				}
			}
		}
		
		var pbMsg = def.msgDef.proto_msg;
		var symbolName = pbMsg.substring(0, pbMsg.length - 3);
    	this.instanceEmit(config.get('jsonOutputStreamID'), {fields:parsedTlm, opsPath: def.opsPath, symbol:symbolName, msgID:msgID});
    }
};



BinaryDecoder.prototype.getFieldAsPbType = function (buffer, fieldDef, bitOffset) {
	try{			
		var value;

		if(fieldDef.array_length > 1) {
			var value = [];
			switch(fieldDef.pb_type) {
				case 'char':
					value = buffer.read(bitOffset / 8, fieldDef.array_length);
					break;
				
				case 'uint8':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt8((bitOffset / 8) + i));
					}
					break;
					
				case 'int8':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readInt8((bitOffset / 8) + i));
					}
					break;
					
				case 'string':
					value = buffer.read(bitOffset / 8, fieldDef.array_length);
					break;
					
				case 'char':
					value = buffer.read(bitOffset / 8, fieldDef.array_length);
					break;
					
				case 'uint16':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt16LE((bitOffset / 8) + i));
					}
					break;
					
				case 'int16':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readInt16LE((bitOffset / 8) + i));
					}
					break;
					
				case 'uint32':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt32LE((bitOffset / 8) + i));
					}
					break;
					
				case 'int32':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readInt32LE((bitOffset / 8) + i));
					}
					break;
					
				case 'float':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readFloatLE((bitOffset / 8) + i));
					}
					break;
					
				case 'double':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readDoubleLE((bitOffset / 8) + i));
					}
					break;
					
				case 'boolean':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt8((bitOffset / 8) + i));
					}
					break;
					
				case 'uint64':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						var uint64Value = new Uint64LE(buffer, (bitOffset / 8) + i);
						value.push(uint64Value.toString(10));
					}
					break;
					
				case 'int64':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						var int64Value = new Int64LE(buffer, (bitOffset / 8) + i);
						value.push(int64Value.toString(10));
					}
					break;
					
				default:
					this.logErrorEvent(EventEnum.UNKNOWN_DATA_TYPE, 'getFieldAsPbType: Unknown data type. \'' + fieldDef.pb_type + '\'');
			}
		} else {
			switch(fieldDef.pb_type) {
				case 'char':
					value = buffer.readUInt8(bitOffset / 8);
					break;
				
				case 'uint8':
					value = buffer.readUInt8(bitOffset / 8);
					break;
					
				case 'int8':
					value = buffer.readInt8(bitOffset / 8);
					break;
					
				case 'uint16':
					value = buffer.readUInt16LE(bitOffset / 8);
					break;
					
				case 'int16':
					value = buffer.readInt16LE(bitOffset / 8);
					break;
					
				case 'uint32':
					value = buffer.readUInt32LE(bitOffset / 8);
					break;
					
				case 'int32':
					value = buffer.readInt32LE(bitOffset / 8);
					break;
					
				case 'float':
					value = buffer.readFloatLE(bitOffset / 8);
					break;
					
				case 'double':
					value = buffer.readDoubleLE(bitOffset / 8);
					break;
					
				case 'boolean':
					value = buffer.readUInt8(bitOffset / 8);
					break;
					
				case 'uint64':
					var uint64Value = new Uint64LE(buffer, bitOffset / 8);
					value = uint64Value.toString(10);
					break;
					
				case 'int64':
					var int64Value = new Int64LE(buffer, bitOffset / 8);
					value = int64Value.toString(10);
					break;
					
				default:
					this.logErrorEvent(EventEnum.UNKNOWN_DATA_TYPE, 'getFieldAsPbType: Unknown data type. \'' + JSON.stringify(fieldDef.pb_type) + '\'');
			}
		}
	} catch(err) {
		this.logErrorEvent(EventEnum.UNHANDLED_EXCEPTION, 'getFieldAsPbType: Unhandled exception. \'' + err + ' - ' + err.stack + '\'');
	}

return value;
}



BinaryDecoder.prototype.getField = function (buffer, fieldDef, bitOffset) {	
	try{			
		var value;
		
		if(fieldDef.array_length > 1) {
			var value = [];
			switch(fieldDef.airliner_type) {
				case 'char':
					value = buffer.toString('utf8', bitOffset / 8, (bitOffset / 8) + fieldDef.array_length);
					break;
				
				case 'uint8':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt8((bitOffset / 8) + i));
					}
					break;
					
				case 'int8':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readInt8((bitOffset / 8) + i));
					}
					break;
					
				case 'string':
					value = buffer.toString('utf8', bitOffset / 8, (bitOffset / 8) + fieldDef.array_length);
					break;
					
				case 'uint16':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt16LE((bitOffset / 8) + i));
					}
					break;
					
				case 'int16':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readInt16LE((bitOffset / 8) + i));
					}
					break;
					
				case 'uint32':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt32LE((bitOffset / 8) + i));
					}
					break;
					
				case 'int32':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readInt32LE((bitOffset / 8) + i));
					}
					break;
					
				case 'float':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readFloatLE((bitOffset / 8) + i));
					}
					break;
					
				case 'double':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readDoubleLE((bitOffset / 8) + i));
					}
					break;
					
				case 'boolean':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						value.push(buffer.readUInt8((bitOffset / 8) + i));
					}
					break;
					
				case 'uint64':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						var uint64Value = new Uint64LE(buffer, (bitOffset / 8) + i);
						value.push(uint64Value.toString(10));
					}
					break;
					
				case 'int64':
					for(var i = 0; i < fieldDef.array_length; ++i) {
						var int64Value = new Int64LE(buffer, (bitOffset / 8) + i);
						value.push(int64Value.toString(10));
					}
					break;
					
				default:
					var nextFieldDef = this.getMsgDefByName(fieldDef.airliner_type);
				
				    if(typeof nextFieldDef === 'undefined') {
				    	this.getFieldAsPbType(buffer, nextFieldDef, bitOffset);
				    } else {
					    for(var i = 0; i < fieldDef.array_length; ++i) {
					    	this.getField(buffer, nextFieldDef, bitOffset);
					    }
				    }
			}
		} else {
			switch(fieldDef.airliner_type) {
				case 'char':
					value = buffer.readUInt8(bitOffset / 8);
					break;
					
				case 'uint8':
					value = buffer.readUInt8(bitOffset / 8);
					break;
					
				case 'int8':
					value = buffer.readInt8(bitOffset / 8);
					break;
					
				case 'uint16':
					value = buffer.readUInt16LE(bitOffset / 8);
					break;
					
				case 'int16':
					value = buffer.readInt16LE(bitOffset / 8);
					break;
					
				case 'uint32':
					value = buffer.readUInt32LE(bitOffset / 8);
					break;
					
				case 'int32':
					value = buffer.readInt32LE(bitOffset / 8);
					break;
					
				case 'float':
					value = buffer.readFloatLE(bitOffset / 8);
					break;
					
				case 'double':
					value = buffer.readDoubleLE(bitOffset / 8);
					break;
					
				case 'boolean':
					value = buffer.readUInt8(bitOffset / 8);
					break;
					
				case 'uint64':
					var uint64Value = new Uint64LE(buffer, bitOffset / 8);
					value = uint64Value.toString(10);
					break;
					
				case 'uint64':
					var int64Value = new Int64LE(buffer, bitOffset / 8);
					value = int64Value.toString(10);
					break;
					
				default:
					var nextFieldDef = this.getMsgDefByName(fieldDef.airliner_type);
				
				    if(typeof nextFieldDef === 'undefined') {
				    	this.getFieldAsPbType(buffer, fieldDef, bitOffset);
				    } else {
					    this.getField(buffer, nextFieldDef, bitOffset);
				    }
			}
	    }
	} catch(err) {
	    this.logErrorEvent(EventEnum.UNHANDLED_EXCEPTION, 'getField: Unhandled exception. \'' + err + ' - ' + err.stack + '\'');
	}
	
	return value;
}



BinaryDecoder.prototype.getTlmDefByMsgID = function (msgID) {
	for(var name in this.defs) {
		var tlm = this.defs[name];
		if(tlm.msgID == msgID){
			return tlm;
		}
	}
}



BinaryDecoder.prototype.isCommandMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return true;
	} else {
		return false;
	}
}



BinaryDecoder.prototype.isTelemetryMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return false;
	} else {
		return true;
	}
}



BinaryDecoder.prototype.cfeTimeToJsTime = function(seconds, subseconds) {
    var microseconds;

    /* 0xffffdf00 subseconds = 999999 microseconds, so anything greater 
     * than that we set to 999999 microseconds, so it doesn't get to
     * a million microseconds */
  
    if(subseconds > 0xffffdf00)
    {
        microseconds = 999999;
    } else {
        /*
        **  Convert a 1/2^32 clock tick count to a microseconds count
        **
        **  Conversion factor is  ( ( 2 ** -32 ) / ( 10 ** -6 ) ).
        **
        **  Logic is as follows:
        **    x * ( ( 2 ** -32 ) / ( 10 ** -6 ) )
        **  = x * ( ( 10 ** 6  ) / (  2 ** 32 ) )
        **  = x * ( ( 5 ** 6 ) ( 2 ** 6 ) / ( 2 ** 26 ) ( 2 ** 6) )
        **  = x * ( ( 5 ** 6 ) / ( 2 ** 26 ) )
        **  = x * ( ( 5 ** 3 ) ( 5 ** 3 ) / ( 2 ** 7 ) ( 2 ** 7 ) (2 ** 12) )
        **
        **  C code equivalent:
        **  = ( ( ( ( ( x >> 7) * 125) >> 7) * 125) >> 12 )
        */   

	      microseconds = (((((subseconds >> 7) * 125) >> 7) * 125) >> 12);

        /* if the subseconds % 0x4000000 != 0 then we will need to
         * add 1 to the result. the & is a faster way of doing the % */  
        if ((subseconds & 0x3ffffff) != 0)
        {
          microseconds++;
        }

        /* In the Micro2SubSecs conversion, we added an extra anomaly
         * to get the subseconds to bump up against the end point,
         * 0xFFFFF000. This must be accounted for here. Since we bumped
         * at the half way mark, we must "unbump" at the same mark 
         */
        if (microseconds > 500000)
        {
          microseconds --;
        }
    } /* end else */            
  
    /* Get a date with the correct year. */
    var jsDateTime = new Date("12/1/" + config.get('CFE_TIME_EPOCH_YEAR'));
  
    /* Adjust days. */
    jsDateTime.setDate(jsDateTime.getDate() + (config.get('CFE_TIME_EPOCH_DAY')-1));
  
    /* Adjust hours minutes and seconds. */
    jsDateTime.setTime(jsDateTime.getTime() + 
    		(config.get('CFE_TIME_EPOCH_HOUR') * 3600000) + 
    		(config.get('CFE_TIME_EPOCH_MINUTE') * 60000) + 
    		(config.get('CFE_TIME_EPOCH_SECOND') * 1000));
  
    /* Add the CFE seconds. */
    jsDateTime.setTime(jsDateTime.getTime() + (seconds * 1000));
  
    /* Finally, add the CFE microseconds. */
    jsDateTime.setMilliseconds(jsDateTime.getMilliseconds() + (microseconds / 1000));
  
    return jsDateTime;
}



BinaryDecoder.prototype.getCommandDef = function (ops_name) {	
	var retObj = {};
}



BinaryDecoder.prototype.logDebugEvent = function (eventID, text) {
	this.instanceEmit('events-debug', {sender: this, component:'BinaryDecoder', eventID:eventID, text:text});
}



BinaryDecoder.prototype.logInfoEvent = function (eventID, text) {
	this.instanceEmit('events-info', {sender: this, component:'BinaryDecoder', eventID:eventID, text:text});
}



BinaryDecoder.prototype.logErrorEvent = function (eventID, text) {
	this.instanceEmit('events-error', {sender: this, component:'BinaryDecoder', eventID:eventID, text:text});
}



BinaryDecoder.prototype.logCriticalEvent = function (eventID, text) {
	this.instanceEmit('events-critical', {sender: this, component:'BinaryDecoder', eventID:eventID, text:text});
}
