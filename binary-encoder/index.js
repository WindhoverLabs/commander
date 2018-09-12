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
var config = require('./config.js');

var emit = Emitter.prototype.emit;

exports = module.exports = BinaryEncoder;

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function BinaryEncoder(configFile) {
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



BinaryEncoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('cmdDefReqStreamID'), function(cmdReq) {
		if(cmdReq.hasOwnProperty('opsPath')) {
			var cmdDef = self.getCmdDefByPath(cmdReq.opsName).fields;
			
		    self.instanceEmit(config.get('cmdDefRspStreamIDPrefix') + cmdReq.opsName, cmdDef);
		} else if (cmdReq.hasOwnProperty('msgID') && cmdReq.hasOwnProperty('cmdCode')) {
			var cmdDef = self.getCmdDefByMsgIDandCC(cmdReq.msgID, cmdReq.cmdCode);
			
		    self.instanceEmit(config.get('cmdDefRspStreamIDPrefix') + ':' + cmdReq.msgID + ':' + cmdReq.cmdCode, cmdDef);
		} else {
		    self.instanceEmit(config.get('cmdDefRspStreamIDPrefix') + ':' + cmdReq.msgID + ':' + cmdReq.cmdCode, undefined);
		}
	});

	this.instanceEmitter.on(config.get('cmdSendStreamID'), function(obj) {
		var cmdDef = self.getCmdDefByPath(obj.ops_path);
		
		self.sendCommand(cmdDef, obj.args);
	});

	this.instanceEmitter.on(config.get('tlmSendStreamID'), function(tlmObj) {
		//console.log(tlmObj)
		
		//console.log(tlmObj);
		//var tlmDef = self.getTlmDefByOpsName(tlmName);
		
		//cmdDef.fields = args;
	    
		//self.sendTelemetry(tlmDef);
	});
	
	
}



BinaryEncoder.prototype.getCmdOpNamesStripHeader = function (cmdDef) {
	return this.getMsgDefByName(cmdDef).operational_names;
}



BinaryEncoder.prototype.instanceEmit = function (streamID, msg)
{
	this.instanceEmitter.emit(streamID, msg);
}




/**
 * Inherits from `EventEmitter`.
 */
BinaryEncoder.prototype.__proto__ = Emitter.prototype;



//BinaryEncoder.prototype.addCommandDefinition = function (ops_name) {
//	this.parsers[msgID] = parser;
//}
//
//
//
//BinaryEncoder.prototype.isCommandMsg = function (msgID) {
//	if((msgID & 0x1000) == 0x1000) {
//		return true;
//	} else {
//		return false;
//	}
//}
//
//
//
//BinaryEncoder.prototype.isTelemetryMsg = function (msgID) {
//	if((msgID & 0x1000) == 0x1000) {
//		return false;
//	} else {
//		return true;
//	}
//}
//
//
//
//BinaryEncoder.prototype.parseMsgDefFile = function (msgDefs) {
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
//		if(symbol.hasOwnProperty('fields')) {
//			for(var i=0; i < symbol.fields.length; ++i) {
//				var fieldName = symbol.fields[i].name;
//				
//				if(msgDefs.little_endian == true) {
//					var endianTag = 'le';
//				} else {
//					var endianTag = 'be';
//			    }
//				
//				msgDef.fields = {};
//				
//				bitPosition = this.msgParseFieldDef(msgDef.fields, symbol.fields[i], bitPosition, endianTag, headerLength, engName);
//			}
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
//	//console.log(this.cmdDefs);
//	asdfasdf
//}
//
//
//
//BinaryEncoder.prototype.flattenMsgDefs = function (obj, msgDefs, path) {
//	//console.log(obj);
//	
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
//BinaryEncoder.prototype.isMsgDef = function (obj, path) {
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



BinaryEncoder.prototype.getAppNameFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[1];
}



BinaryEncoder.prototype.getOperationFromPath = function (path) {
	var splitName = path.split('/');
	return splitName[2];
}



BinaryEncoder.prototype.getCmdDefByPath = function (path) {
    var appName = this.getAppNameFromPath(path);
    var operationName = this.getOperationFromPath(path);
    var appDefinition = this.getAppDefinition(appName);
    //var msgName = appDefinition.operations[operationName].airliner_msg;
    //var msgDef = this.getMsgDefByName(msgName);
    
    return appDefinition.operations[operationName];
	//return appDefinition.operations[operationName];
	//return this.cmdDefs[opsName];
}


BinaryEncoder.prototype.getAppDefinition = function (appName) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		if(app.app_name == appName) {
			return app;
		}
	}
}



BinaryEncoder.prototype.getOperationByMsgIDandCC = function (msgID, cmdCode) {
	for(var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		for(var opID in app.operations) {
			var operation = app.operations[opID];
			if((parseInt(operation.airliner_mid) == msgID) && (operation.airliner_cc == cmdCode)) {
				var result = {ops_path: '/' + appID + '/' + opID, operation: operation};
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



BinaryEncoder.prototype.setField = function (buffer, fieldName, field, value, bit_offset) {
	try{
		if(field.hasOwnProperty('pb_field_rule')) {
			switch(field.pb_field_rule) {
				case 'repeated': {
					switch(field.airliner_type) {
						case 'uint8':
							buffer.writeUInt8(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'string':
							buffer.write(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'uint16':
							buffer.writeUInt16LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'int16':
							buffer.writeInt16LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'uint32':
							buffer.writeUInt32LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'int32':
							buffer.writeInt32LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						default:
							//console.log(field.airliner_type);
					}
					break;
				}
			
			    case 'required': {
					switch(field.airliner_type) {
						case 'uint8':
							buffer.writeUInt8(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'string':
							buffer.write(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'uint16':
							buffer.writeUInt16LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'int16':
							buffer.writeInt16LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'uint32':
							buffer.writeUInt32LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						case 'int32':
							buffer.writeInt32LE(value, (bit_offset + field.bit_offset) / 8);
							break;
							
						default:
							var msgDef = this.getMsgDefByName(field.airliner_type);
							for(var opNameID in msgDef.operational_names) {	
								var fieldNames = msgDef.operational_names[opNameID].field_path.split('.');
								var fieldName = fieldNames[0];
								var field = msgDef.fields[fieldName];
							
								this.setField(buffer, fieldName, field, value, bit_offset + field.bit_offset);
							}
					}
				    break;
			    }
		    }
		}
	} catch(err) {
		
	}
}



BinaryEncoder.prototype.sendCommand = function (cmd, args) {
	//console.log('sendCommand');
	//console.log(cmd);
	var msgDef = this.getMsgDefByName(cmd.airliner_msg);
	var byteLength = this.getCmdByteLength(cmd);
	var buffer = new Buffer(byteLength);
	buffer.fill(0x00);
	
	buffer.writeUInt16BE(cmd.airliner_mid, 0);
	buffer.writeUInt16BE(this.sequence, 2);
	buffer.writeUInt16BE(byteLength - 7, 4);
	buffer.writeUInt8(cmd.airliner_cc, 7);
	buffer.writeUInt8(0, 6);
	
	this.sequence++;
	
	for(var opNameID in msgDef.operational_names) {
		var fieldNames = msgDef.operational_names[opNameID].field_path.split('.');
		var fieldName = fieldNames[0];
		var field = msgDef.fields[fieldName];

		var arg_path = msgDef.operational_names[opNameID].field_path;
		
		if(args.hasOwnProperty(arg_path)) {
		    this.setField(buffer, fieldName, field, args[arg_path], field.bit_offset);
		}
	}
	
	this.instanceEmit(config.get('binaryOutputStreamID'), buffer);
}



//BinaryEncoder.prototype.sendTelemetry = function (tlm) {
//	var buffer = new Buffer(tlm.byteLength);
//	buffer.fill(0x00);
//	
//	buffer.writeUInt16BE(tlm.msgID, 0);
//	buffer.writeUInt16BE(this.sequence, 2);
//	buffer.writeUInt16BE(tlm.byteLength - 7, 4);
//	buffer.writeUInt16BE(0, 6);
//	buffer.writeUInt16BE(0, 8);
//	
//	for(var key in tlm) {
//		var field = tlm[key]
//		if(field.hasOwnProperty('value')) {
//			if(field.hasOwnProperty('multiplicity')) {
//				switch(field.type) {
//					case 'uint8':
//						buffer.writeUInt8(field.value, field.offset / 8);
//						break;
//						
//					case 'string':
//						buffer.write(field.value, field.offset / 8);
//						break;
//						
//					case 'uint16':
//						buffer.writeUInt16LE(field.value, field.offset / 8);
//						break;
//						
//					case 'int16':
//						buffer.writeInt16LE(field.value, field.offset / 8);
//						break;
//						
//					case 'uint32':
//						buffer.writeUInt32LE(field.value, field.offset / 8);
//						break;
//						
//					case 'int32':
//						buffer.writeInt32LE(field.value, field.offset / 8);
//						break;
//				}
//			} else {
//
//				switch(field.type) {
//					case 'uint8':
//						buffer.writeUInt8(field.value, field.offset / 8);
//						break;
//						
//					case 'string':
//						buffer.write(field.value, field.offset / 8, field.length);
//						break;
//						
//					case 'uint16':
//						buffer.writeUInt16LE(field.value, field.offset / 8);
//						break;
//						
//					case 'int16':
//						buffer.writeInt16LE(field.value, field.offset / 8);
//						break;
//						
//					case 'uint32':
//						buffer.writeUInt32LE(field.value, field.offset / 8);
//						break;
//						
//					case 'int32':
//						buffer.writeInt32LE(field.value, field.offset / 8);
//						break;
//				}
//			}
//		}
//	}
//	
//	this.instanceEmit(config.get('binaryOutputStreamID'), buffer);
//}
//
//
//
//BinaryEncoder.prototype.msgParseFieldDef = function (msgDef, field, bitPosition, endian, headerLength, parentEngName) {
//	var engName = parentEngName + '/' + field.name;
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
//		if(bitPosition >= this.cmdHeaderLength) {
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
//		        	    console.log('Unsupported field.base_type \'' + field.base_type + '\'');
//		    }
//			
//			msgDef[field.name] = newField;
//		}
//		bitPosition += field.bit_size;
//	}
//	
//	this.cdd[engName] = msgDef[field.name];
//	
//	return bitPosition;
//}
//
//
//
//BinaryEncoder.prototype.cfeTimeToJsTime = function(seconds, subseconds) {
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
//BinaryEncoder.prototype.getCommandDef = function (ops_name) {	
//	var retObj = {};
//}