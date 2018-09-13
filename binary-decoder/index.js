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
const Sparkles = require('sparkles');

var emit = Emitter.prototype.emit;

exports = module.exports = BinaryDecoder;

exports.events = [
  'connect',
  'close',
  'error'
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function BinaryDecoder(configFile) {
    this.defs;
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
    	var msgDefInput = JSON.parse(fs.readFileSync(inMsgDefs[i].file, 'utf8'));
    	this.defs = mergeJSON.merge(this.defs, msgDefInput);
    }
    
    //console.log(util.inspect(this.defs.Airliner.apps.CFE, {showHidden: false, depth: null}));
};



BinaryDecoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('binaryInputStreamID'), function(buffer) {
    	self.processBinaryMessage(buffer);
	});

	this.instanceEmitter.on(config.get('tlmDefReqStreamID'), function(req) {
		if(req.hasOwnProperty('opsPath')) {
			var tlmDef = self.getCmdDefByPath(req.ops_path);
			
			if(typeof tlmDef === 'undefined') {
				/* TODO: Command definition not found.  ops_path is probably wrong. */
			} else {
		        self.instanceEmit(config.get('tlmDefRspStreamIDPrefix') + req.opsName, tlmDef);
			}
		} else if (tlmReq.hasOwnProperty('msgID')) {
			var tlmDef = self.getTlmDefByMsgID(req.msgID);

			if(typeof tlmDef === 'undefined') {
				/* TODO: Telemetry definition not found.  ops_path is probably wrong. */
			} else {
		        self.instanceEmit(config.get('tlmDefRspStreamIDPrefix') + ':' + req.msgID, tlmDef);
			}
		} else {
			/* TODO:  Request is incorrect. */
		    self.instanceEmit(config.get('tlmDefRspStreamIDPrefix') + ':' + req.msgID, undefined);
		}
	});
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


//BinaryDecoder.prototype.processBinaryFields = function (tlmDef, buffer, parsedTlm) {	
//	for(var fieldName in tlmDef.fields) {
//		var field = tlmDef.fields[fieldName];
//		var symbolName = field.symbolName;
//		var opsName = field.opsName;
//		var engName = field.engName;
//
//		var telemItem = {'engName': engName};
//
//		if(field.hasOwnProperty('multiplicity')) {
//		    switch(field.type) {
//				case 'uint8':
//					telemItem.value = [];
//					for(var i = 0; i < field.multiplicity; ++i) {
//						telemItem.value[i] = buffer.readUInt8((field.offset / 8) + i);
//					}
//					break;
//					
//				case 'string':
//					telemItem.value = buffer.toString("utf-8", field.offset / 8, field.multiplicity).replace(/\0/g, '');
//					break;
//						
//				case 'uint16':
//					telemItem.value = [];
//					for(var i = 0; i < field.multiplicity; ++i) {
//						telemItem.value[i] = buffer.readUInt16LE((field.offset / 8) + i);
//					}
//					break;
//						
//				case 'int16':
//					telemItem.value = [];
//					for(var i = 0; i < field.multiplicity; ++i) {
//						telemItem.value[i] = buffer.readInt16LE((field.offset / 8) + i);
//					}
//					break;
//						
//				case 'uint32':
//					telemItem.value = [];
//					for(var i = 0; i < field.multiplicity; ++i) {
//						telemItem.value[i] = buffer.readUInt32LE((field.offset / 8) + i);
//					}
//					break;
//						
//				case 'int32':
//					telemItem.value = [];
//					for(var i = 0; i < field.multiplicity; ++i) {
//						telemItem.value[i] = buffer.readInt32LE((field.offset / 8) + i);
//					}
//					break;
//				}
//		    parsedTlm.push(telemItem);
//		} else if(field.hasOwnProperty('type')) {
//			switch(field.type) {
//				case 'uint8':
//					telemItem.value = buffer.readUInt8(field.offset / 8);
//					break;
//					
//				case 'string':
//					telemItem.value = buffer.toString('ascii', field.offset / 8, (field.offset / 8) + field.length);
//					break;
//					
//				case 'uint16':
//					telemItem.value = buffer.readUInt16LE(field.offset / 8);
//					break;
//					
//				case 'int16':
//					telemItem.value = buffer.readInt16LE(field.offset / 8);
//					break;
//					
//				case 'uint32':
//					telemItem.value = buffer.readUInt32LE(field.offset / 8);
//					break;
//					
//				case 'int32':
//					telemItem.value = buffer.readInt32LE(field.offset / 8);
//					break;
//			}
//		    parsedTlm.push(telemItem);
//		} else if(typeof field === 'object'){
//			//telemItem.value = new Buffer(field.bitLength / 8);
//			var startOffset = field.offset / 8;
//			var stopOffset = startOffset + field.bitLength / 8;
//			//buffer.copy(telemItem.value, 0, startOffset, stopOffset);
//			this.processBinaryFields(field, buffer, parsedTlm);
//		}
//	}
//}



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



BinaryDecoder.prototype.getFieldFromOperationalName = function (msgDef, opName, bitOffset) {
	var op = msgDef.operational_names[opName];
	var fieldPathArray = opName.split('.');
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
		return {fieldDef: fieldDef, bitOffset: bitOffset + fieldDef.bit_offset};
	}
}



BinaryDecoder.prototype.processBinaryMessage = function (buffer) {
//	var parsedTlm = [];
	
    var msgID = buffer.readUInt16BE(0);
    
	var message = this.ccsds.parse(buffer);
	
	var def = this.getMsgDefByMsgID(msgID);

	var parsedTlm = {};
	
    if(typeof def !== 'undefined') {
		if(def.msgDef.hasOwnProperty('operational_names')) {
			for(var opNameID in def.msgDef.operational_names) {
				var fieldNames = def.msgDef.operational_names[opNameID].field_path.split('.');
				var fieldName = fieldNames[0];
				var field = def.msgDef.fields[fieldName];

				var fieldDef = this.getFieldFromOperationalName(def.msgDef, def.msgDef.operational_names[opNameID].field_path);
				
				var opsPath = def.opsPath + '/' + def.msgDef.operational_names[opNameID].field_path;
				
				parsedTlm[opsPath] = {};
				parsedTlm[opsPath].value = this.getField(buffer, fieldDef.fieldDef, fieldDef.bitOffset);
			}
		}
    	
    	this.instanceEmit(config.get('jsonOutputStreamID'), {fields:parsedTlm});
    }
};



BinaryDecoder.prototype.getField = function (buffer, fieldDef, bitOffset) {	
	try{			
		var value;
		
		if(fieldDef.hasOwnProperty('pb_field_rule')) {
			switch(fieldDef.pb_field_rule) {
				case 'repeated': {
					/* TODO:  'repeated' is not yet fully implemented. */
					var value = [];
					switch(fieldDef.airliner_type) {
						case 'uint8':
							for(var i = 0; i < fieldDef.array_length; ++i) {
								value.push(buffer.readUInt8((bitOffset / 8) + i));
							}
							break;
							
						case 'string':
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
							
						case 'char':
							value = buffer.read(bitOffset / 8, fieldDef.array_length);
							break;
							
						default:
							console.log('TODO: Unknown data type \'' + fieldDef.airliner_type + '\'')
					}
					break;
				}
			
			    case 'required': {
					switch(fieldDef.airliner_type) {
						case 'uint8':
							value = buffer.readUInt8(bitOffset / 8);
							break;
							
						case 'string':
							value = buffer.read(bitOffset / 8);
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
							
						default:
							console.log('TODO: Unknown data type \'' + fieldDef.airliner_type + '\'')
					}
				    break;
			    }
		    }
		}
	} catch(err) {
		console.log('TODO:  An exception occured in setField');
		console.log(err);
	}
	
	return value;
}



//BinaryDecoder.prototype.getMsgDefByMsgID = function (msgID) {
//	return this.tlmDefs[msgID];
//}
//
//
//
//BinaryDecoder.prototype.addMessageParser = function (msgID, parser) {
//	this.parsers[msgID] = parser;
//}
//
//
//
//BinaryDecoder.prototype.addCommandDefinition = function (ops_name) {
//	this.parsers[msgID] = parser;
//}
//
//
//
//BinaryDecoder.prototype.isCommandMsg = function (msgID) {
//	if((msgID & 0x1000) == 0x1000) {
//		return true;
//	} else {
//		return false;
//	}
//}
//
//
//
//BinaryDecoder.prototype.isTelemetryMsg = function (msgID) {
//	if((msgID & 0x1000) == 0x1000) {
//		return false;
//	} else {
//		return true;
//	}
//}
//
//
//
//BinaryDecoder.prototype.parseMsgDefFile = function (msgDefs) {
//	/* Get the config object. */
//	var messages = msgDefs.Messages;
//	
//	/* Flatten the message definition from a hierarchical to ops names. */
//	var msgDefInput = this.flattenMsgDefs(messages);
//	
//	for(var key in msgDefInput) {
//		var msgDef = {};
//		var symbol = {};
//
//		msgDef.symbol = msgDefInput[key].symbol;
//		msgDef.msgID = msgDefInput[key].msgID;
//		msgDef.path = key;
//		msgDef.opsName = msgDef.path + '/' + msgDef.symbol;
//		
//		for(var i = 0; i < msgDefs.symbols.length; ++i) {
//			if(msgDefs.symbols[i].name == msgDef.symbol) {
//				symbol = msgDefs.symbols[i];
//				break;
//			}
//		};
//
//		var engName = '/' + symbol.name;
//		msgDef.engName = engName;
//
//		if(this.isCommandMsg(msgDef.msgID)) {
//			var headerLength = this.cmdHeaderLength;
//		} else {
//			var headerLength = this.tlmHeaderLength;
//		}
//
//		var bitPosition = 0;
//		for(var i=0; i < symbol.fields.length; ++i) {
//			var fieldName = symbol.fields[i].name;
//			
//			if(msgDefs.little_endian == true) {
//				var endianTag = 'le';
//			} else {
//				var endianTag = 'be';
//		    }
//			
//			msgDef.fields = {};
//			
//			bitPosition = this.msgParseFieldDef(msgDef.fields, symbol.fields[i], bitPosition, endianTag, headerLength, engName);
//		}
//
//		msgDef.byteLength = bitPosition / 8;
//		
//		var filePath = msgDefInput[key].proto;
//		
//		if(this.isCommandMsg(msgDef.msgID)) {
//			msgDef.commandCode = msgDefInput[key].cmdCode;
//			
//			this.cmdDefs[key] = msgDef;
//		} else {
//			this.tlmDefs[msgDef.msgID] = msgDef;
//		}
//	}	
//}
//
//
//
//BinaryDecoder.prototype.flattenMsgDefs = function (obj, msgDefs, path) {
//	if(typeof path === 'undefined') {
//        path = '';
//    }
//    
//    if(typeof msgDefs === 'undefined') {
//        msgDefs = {};
//    }
//	
//	for(var prop in obj) {
//		var newPath = path + '/' + prop;
//
//		if(this.isMsgDef(obj[prop], newPath)) {
//			msgDefs[newPath] = obj[prop];
//		} else {
//			this.flattenMsgDefs(obj[prop], msgDefs, newPath);
//		}
//	}
//	
//	return msgDefs
//}
//
//
//
//BinaryDecoder.prototype.isMsgDef = function (obj, path) {
//	/* First, check to see if the object has both message ID and symbol
//	 * assigned to it.
//	 */
//	var hasMsgId = obj.hasOwnProperty('msgID');
//	var hasSymbol = obj.hasOwnProperty('symbol');
//	
//	if(hasMsgId && hasSymbol) {
//		/* It does.  This must be a message definition.  Return this object. */
//		return true;
//	}
//	
//	/* Now check to see if this object has one but not the other, so we can 
//	 * let the operator now the definition is malformed.
//	 */
//	if(hasMsgId && !hasSymbol) {
//		/* It has a message ID but not a symbol assigned.  Return nothing.*/
//		console.log('Message definition for ' + path + ' is missing the symbol definition.');
//		return false;
//	}
//
//	if(!hasMsgId && hasSymbol) {
//		/* It has a symbol ID but not a message ID assigned.  Return nothing.*/
//		console.log('Message definition for ' + path + ' is missing the message ID definition.');
//		return false;
//	}
//}
//
//
//
//BinaryDecoder.prototype.getCmdDefByOpsName = function (opsName) {
//	return this.cmdDefs[opsName];
//}
//
//
//
//BinaryDecoder.prototype.getCmdDefByMsgIDandCC = function (msgID, cmdCode) {
//	for(var opsName in this.cmdDefs) {
//		var cmd = this.cmdDefs[opsName];
//		if((cmd.msgID == msgID) && (cmd.commandCode == cmdCode)){
//			return cmd;
//		}
//	}
//}
//
//
//
//BinaryDecoder.prototype.getTlmMsgDef = function (opsName) {
//	for(var msgID in this.tlmDefs) {
//		var tlm = this.tlmDefs[msgID];
//		if(tlm.opsName == opsName)
//			return tlm;
//	}
//}
//
//
//
//BinaryDecoder.prototype.getTlmItemDef = function (engName) {
//	return this.cdd[engName];
//}
//
//
//
//BinaryDecoder.prototype.msgParseFieldDef = function (msgDef, field, bitPosition, endian, headerLength, parentEngName) {
//	var engName = parentEngName + '/' + field.name;
//	
//	
//	if(typeof field.array !== 'undefined') {
//		if(bitPosition >= headerLength) {
//			if(typeof field.type.base_type !== 'undefined'){
//				var newField =  {multiplicity: field.count, offset: bitPosition, engName: engName};
//  			    switch(field.type.base_type) {
// 		            case 'unsigned char':
// 		            	newField.type = 'uint8';
// 		        	    break;
// 		        	
// 		            case 'char':
// 		            	newField.type = 'string';
// 		                break;
// 		        	
// 		            case 'short unsigned int':
// 		            	newField.type = 'uint16';
// 		        	    break;
// 		        	
// 		            case 'short int':
// 		            	newField.type = 'int16';
// 		        	    break;
// 		        	
//			        case 'long unsigned int':
// 		            	newField.type = 'uint32';
// 		        	    break;
// 		        	
//			        case 'long int':
// 		            	newField.type = 'int16';
// 		        	    break;
// 		        	
// 		            default:
// 		        	    console.log('Unsupported field.type.base_type \'' + field.type.base_type + '\'');
//  			    }
//                msgDef[field.name] = newField;	
//			} else {	
//			    //msgDef[field.name] = { fields: {}};	
//				//for(var i=0; i < field.type.fields.length; ++i) {
//				//	var nextMsgDef = msgDef[field.name].fields;
//			    //	bitPosition = this.msgParseFieldDef(nextMsgDef, field.type.fields[i], bitPosition, endian, headerLength, engName);
//				//}
//			}
//		}
//		bitPosition += (field.type.bit_size * field.count);
//	} else if(Array.isArray(field.fields)) {
//	    msgDef[field.name] = { fields: {}};	
//		msgDef[field.name].engName = engName;
//		msgDef[field.name].offset = bitPosition;
//		msgDef[field.name].bitLength = field.bit_size;
//		for(var i=0; i < field.fields.length; ++i) {		
//			var nextMsgDef = msgDef[field.name].fields;
//	    	bitPosition = this.msgParseFieldDef(nextMsgDef, field.fields[i], bitPosition, endian, headerLength, engName);
//		}
//	} else {
//		if(bitPosition >= headerLength) {
//			var newField =  {offset: bitPosition, engName: engName};
//			switch(field.base_type) {
//		        case 'unsigned char':
//		        	newField.type = 'uint8';
//		        	break;
//		        	
//		        case 'char':
//		        	newField.type = 'int8';
//		        	break;
//		        	
//		        case 'short unsigned int':
//		        	newField.type = 'uint16';
//		        	break;
//		        	
//		        case 'short int':
//		        	newField.type = 'int16';
//		        	break;
//		        	
//		        case 'long unsigned int':
//		        	newField.type = 'uint32';
//		        	break;
//		        	
//		        case 'long int':
//		        	newField.type = 'int32';
//		        	break;
// 		        	
// 		        default:
// 		        	console.log('Unsupported field.base_type \'' + field.base_type + '\'');
//		    }
//            msgDef[field.name] = newField;
//		}
//		bitPosition += field.bit_size;
//	}
//	
//	this.cdd[engName] = newField;
//	
//	return bitPosition;
//}
//
//
//
//BinaryDecoder.prototype.cfeTimeToJsTime = function(seconds, subseconds) {
//    var microseconds;
//
//    /* 0xffffdf00 subseconds = 999999 microseconds, so anything greater 
//     * than that we set to 999999 microseconds, so it doesn't get to
//     * a million microseconds */
//  
//    if(subseconds > 0xffffdf00)
//    {
//        microseconds = 999999;
//    } else {
//        /*
//        **  Convert a 1/2^32 clock tick count to a microseconds count
//        **
//        **  Conversion factor is  ( ( 2 ** -32 ) / ( 10 ** -6 ) ).
//        **
//        **  Logic is as follows:
//        **    x * ( ( 2 ** -32 ) / ( 10 ** -6 ) )
//        **  = x * ( ( 10 ** 6  ) / (  2 ** 32 ) )
//        **  = x * ( ( 5 ** 6 ) ( 2 ** 6 ) / ( 2 ** 26 ) ( 2 ** 6) )
//        **  = x * ( ( 5 ** 6 ) / ( 2 ** 26 ) )
//        **  = x * ( ( 5 ** 3 ) ( 5 ** 3 ) / ( 2 ** 7 ) ( 2 ** 7 ) (2 ** 12) )
//        **
//        **  C code equivalent:
//        **  = ( ( ( ( ( x >> 7) * 125) >> 7) * 125) >> 12 )
//        */   
//
//	      microseconds = (((((subseconds >> 7) * 125) >> 7) * 125) >> 12);
//
//        /* if the subseconds % 0x4000000 != 0 then we will need to
//         * add 1 to the result. the & is a faster way of doing the % */  
//        if ((subseconds & 0x3ffffff) != 0)
//        {
//          microseconds++;
//        }
//
//        /* In the Micro2SubSecs conversion, we added an extra anomaly
//         * to get the subseconds to bump up against the end point,
//         * 0xFFFFF000. This must be accounted for here. Since we bumped
//         * at the half way mark, we must "unbump" at the same mark 
//         */
//        if (microseconds > 500000)
//        {
//          microseconds --;
//        }
//    } /* end else */            
//  
//    /* Get a date with the correct year. */
//    var jsDateTime = new Date("12/1/" + this.options.CFE_TIME_EPOCH_YEAR);
//  
//    /* Adjust days. */
//    jsDateTime.setDate(jsDateTime.getDate() + (this.options.CFE_TIME_EPOCH_DAY-1));
//  
//    /* Adjust hours minutes and seconds. */
//    jsDateTime.setTime(jsDateTime.getTime() + 
//    		(this.options.CFE_TIME_EPOCH_HOUR * 3600000) + 
//    		(this.options.CFE_TIME_EPOCH_MINUTE * 60000) + 
//    		(this.options.CFE_TIME_EPOCH_SECOND * 1000));
//  
//    /* Add the CFE seconds. */
//    jsDateTime.setTime(jsDateTime.getTime() + (seconds * 1000));
//  
//    /* Finally, add the CFE microseconds. */
//    jsDateTime.setMilliseconds(jsDateTime.getMilliseconds() + (microseconds / 1000));
//  
//    return jsDateTime;
//}
//
//
//
//BinaryDecoder.prototype.getCommandDef = function (ops_name) {	
//	var retObj = {};
//}