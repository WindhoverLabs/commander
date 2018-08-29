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
var protobuf = require('protobufjs');
var Promise = require('promise');
var mergeJSON = require('merge-json');
var convict = require('convict');
var config = require('./config.js');
const Sparkles = require('sparkles');
var path = require('path');

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
    this.cmdDefs = [];
    this.tlmDefs = [];
    this.tlm = {};
    this.protoDefs = {};
    this.cmdHeaderLength = 64;
    this.sequence = 0;
    this.subscribers = {};
    this.cdd = {};
    this.registrations = [];
    var self = this;
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
    
    var protoFiles = recFindByExt('./proto_defs', 'proto');
    
    for(var i = 0; i < protoFiles.length; i++) {
    	this.parseProtoFile('./' + protoFiles[i]);
    }
};



ProtobufEncoder.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('jsonInputStreamID'), function(message) {
		var tlmDef = self.getMsgDefBySymbolName(message.symbol);
        console.log(tlmDef);
        
	    if(typeof tlmDef !== 'undefined') {
	    	var tlmJson = {};

	    	self.processFields(message.fields, tlmJson);
	    	
	    	/* Now send the the message to all PB listeners. */
	    	var pbMsgDef = tlmDef.proto.lookupType(tlmDef.name + '_pb');
	    	var pbMsg = pbMsgDef.create(tlmJson);
	    	var pbBuffer = pbMsgDef.encode(pbMsg).finish();
	    	var hdrBuffer = new Buffer(12)
	  	    hdrBuffer.writeUInt16BE(tlmDef.msgID, 0);
	        hdrBuffer.writeUInt16BE(1, 2);
	  	    hdrBuffer.writeUInt16BE(pbBuffer.length - 1, 4);
	  	    hdrBuffer.writeUInt16BE(0, 6);
	  	    hdrBuffer.writeUInt16BE(0, 8);
	  	    hdrBuffer.writeUInt16BE(0, 10);
	        
	        var msgBuffer = Buffer.concat([hdrBuffer, pbBuffer]);
	        self.instanceEmit(config.get('binaryOutputStreamID'), msgBuffer);
		        
	    	console.log(tlmJson);
	    }
	});
}



ProtobufEncoder.prototype.instanceEmit = function (streamID, msg)
{
	this.instanceEmitter.emit(streamID, msg);
}




/**
 * Inherits from `EventEmitter`.
 */
ProtobufEncoder.prototype.__proto__ = Emitter.prototype;



ProtobufEncoder.prototype.sendPBMessage = function (message) {
	tlmDef = tmtc.getTlmDef('/CFE_ES/HK/CFE_ES_HkPacket_t');
	
	var esHkMsg = tlmDef.proto.lookupType('CFE_ES_HkPacket_t');
	
	var msg = esHkMsg.create({'Payload': {'CmdCounter': 7}});
	
	var pbBuffer = esHkMsg.encode(msg).finish();

	var hdrBuffer = Buffer.alloc(12)
	hdrBuffer.writeUInt16BE(tlmDef.msgID, 0);
	hdrBuffer.writeUInt16BE(1, 2);
	hdrBuffer.writeUInt16BE(pbBuffer.length - 1, 4);
	hdrBuffer.writeUInt16BE(0, 6);
	hdrBuffer.writeUInt16BE(0, 8);
	hdrBuffer.writeUInt16BE(0, 10);
	
	var msgBuffer = Buffer.concat([hdrBuffer, pbBuffer]);
	
	pbSender.send(msgBuffer, 0, msgBuffer.length, config.pbTlmOutPort, '127.0.0.1');
	
	var buffer = new Buffer(cmd.byteLength);
	buffer.fill(0x00);
	
	buffer.writeUInt16BE(cmd.msgID, 0);
	buffer.writeUInt16BE(this.sequence, 2);
	buffer.writeUInt16BE(cmd.byteLength - 7, 4);
	buffer.writeUInt8(cmd.commandCode, 7);
	buffer.writeUInt8(0, 6);
	
	this.sequence++;
}


ProtobufEncoder.prototype.processFields = function (inJSON, outJSON) {		
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



ProtobufEncoder.prototype.processBinaryMessage = function (buffer) {
	var parsedTlm = [];
	
    var msgID = buffer.readUInt16BE(0);
    
	var message = this.ccsds.parse(buffer);
	
	var tlmDef = this.getMsgDefByMsgID(msgID);

    if(typeof tlmDef !== 'undefined') {
    	var tlmJson = {};

    	this.processBinaryFields(tlmDef, buffer, tlmJson, parsedTlm);
    	
    	/* Now send the the message to all PB listeners. */
    	if(tlmDef.hasOwnProperty('proto')) {
	    	var pbMsgDef = tlmDef.proto.lookupType(tlmDef.symbol);
	    	var pbMsg = pbMsgDef.create(tlmJson);
	    	var pbBuffer = pbMsgDef.encode(pbMsg).finish();
	    	var hdrBuffer = new Buffer(12)
	  	    hdrBuffer.writeUInt16BE(tlmDef.msgID, 0);
	        hdrBuffer.writeUInt16BE(1, 2);
	  	    hdrBuffer.writeUInt16BE(pbBuffer.length - 1, 4);
	  	    hdrBuffer.writeUInt16BE(0, 6);
	  	    hdrBuffer.writeUInt16BE(0, 8);
	  	    hdrBuffer.writeUInt16BE(0, 10);
	        
	        var msgBuffer = Buffer.concat([hdrBuffer, pbBuffer]);
	        //this.pbSendCallback(msgBuffer);
    	}
    	
    	this.emit('processed-binary', parsedTlm);
    	//console.log(parsedTlm);
    }
};



ProtobufEncoder.prototype.getMsgDefByMsgID = function (msgID) {
	return this.tlmDefs[msgID];
}



ProtobufEncoder.prototype.getMsgDefBySymbolName = function (name) {
	return this.defs[name];
}


ProtobufEncoder.prototype.processPBMessage = function (buffer) {
    var message = this.ccsds.parse(buffer);
    var msgID = buffer.readUInt16BE(0);
    var cmdCode = message.SecHdr.code;
	
    var cmd = this.getCmdDefByMsgIDandCC(msgID, cmdCode);
    
    if(typeof cmd !== 'undefined') {
    	var msgLength = message.PriHdr.length;
    	
    	if(msgLength > 1) {
    		
    	}
    		
    	this.sendCommand(cmd);
    }
};



ProtobufEncoder.prototype.addMessageParser = function (msgID, parser) {
	this.parsers[msgID] = parser;
}



ProtobufEncoder.prototype.addCommandDefinition = function (ops_name) {
	this.parsers[msgID] = parser;
}



ProtobufEncoder.prototype.parseProtoFile = function (filePath) {
	var self = this;
	
    var fileName = filePath.replace(/^.*[\\\/]/, '');
    var structureName = fileName.replace(/\.[^/.]+$/, '');
    
    var root = new protobuf.Root();
	
    //root.resolvePath = function(origin, target) {
    //	return origin;
    //}
    protobuf.load(root, function(err, root) {
		if (err)
			throw err;

	    self.defs[structureName] = {name: structureName, proto: root};
	});
}



ProtobufEncoder.prototype.isCommandMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return true;
	} else {
		return false;
	}
}



ProtobufEncoder.prototype.isTelemetryMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return false;
	} else {
		return true;
	}
}



ProtobufEncoder.prototype.parseMsgDefFile = function (msgDefs) {
	/* Get the config object. */
	var messages = msgDefs.Messages;
	
	/* Flatten the message definition from a hierarchical to ops names. */
	var msgDefInput = this.flattenMsgDefs(messages);
	
	for(var key in msgDefInput) {
		var msgDef = {};
		var symbol = {};

		msgDef.symbol = msgDefInput[key].symbol;
		msgDef.msgID = msgDefInput[key].msgID;
		msgDef.path = key;
		msgDef.opsName = msgDef.path + '/' + msgDef.symbol;
		
		for(var i = 0; i < msgDefs.symbols.length; ++i) {
			if(msgDefs.symbols[i].name == msgDef.symbol) {
				symbol = msgDefs.symbols[i];
				break;
			}
		};

		var engName = '/' + symbol.name;
		msgDef.engName = engName;

		if(this.isCommandMsg(msgDef.msgID)) {
			var headerLength = this.cmdHeaderLength;
		} else {
			var headerLength = this.tlmHeaderLength;
		}

		var bitPosition = 0;
		for(var i=0; i < symbol.fields.length; ++i) {
			var fieldName = symbol.fields[i].name;
			
			if(msgDefs.little_endian == true) {
				var endianTag = 'le';
			} else {
				var endianTag = 'be';
		    }
			
			msgDef.fields = {};
			
			bitPosition = this.msgParseFieldDef(msgDef.fields, symbol.fields[i], bitPosition, endianTag, headerLength, engName);
		}

		msgDef.byteLength = bitPosition / 8;
		
		var filePath = msgDefInput[key].proto;
		
		if(this.isCommandMsg(msgDef.msgID)) {
			msgDef.commandCode = msgDefInput[key].cmdCode;
			
			if('proto' in msgDefInput[key]) {
				msgDef.proto = new protobuf.Root();
				this.cmdDefs[key] = msgDef;
				protobuf.loadSync(filePath, msgDef.proto);
			} else {
				this.cmdDefs[key] = msgDef;
			}
		} else {
			
			if('proto' in msgDefInput[key]) {
				msgDef.proto = new protobuf.Root();
				this.tlmDefs[msgDef.msgID] = msgDef;
				protobuf.loadSync(filePath, msgDef.proto);
			} else {
				this.tlmDefs[msgDef.msgID] = msgDef;
			}
		}
	}	
}



ProtobufEncoder.prototype.subscribe = function (tlmID, callback) {
	if(!this.subscribers.hasOwnProperty(tlmID)) {
		this.subscribers[tlmID] = new Array();
	}
	
	this.subscribers[tlmID].push(callback);
}



ProtobufEncoder.prototype.flattenMsgDefs = function (obj, msgDefs, path) {
	if(typeof path === 'undefined') {
        path = '';
    }
    
    if(typeof msgDefs === 'undefined') {
        msgDefs = {};
    }
	
	for(var prop in obj) {
		var newPath = path + '/' + prop;

		if(this.isMsgDef(obj[prop], newPath)) {
			msgDefs[newPath] = obj[prop];
		} else {
			this.flattenMsgDefs(obj[prop], msgDefs, newPath);
		}
	}
	
	return msgDefs
}



ProtobufEncoder.prototype.isMsgDef = function (obj, path) {
	/* First, check to see if the object has both message ID and symbol
	 * assigned to it.
	 */
	var hasMsgId = obj.hasOwnProperty('msgID');
	var hasSymbol = obj.hasOwnProperty('symbol');
	
	if(hasMsgId && hasSymbol) {
		/* It does.  This must be a message definition.  Return this object. */
		return true;
	}
	
	/* Now check to see if this object has one but not the other, so we can 
	 * let the operator now the definition is malformed.
	 */
	if(hasMsgId && !hasSymbol) {
		/* It has a message ID but not a symbol assigned.  Return nothing.*/
		console.log('Message definition for ' + path + ' is missing the symbol definition.');
		return false;
	}

	if(!hasMsgId && hasSymbol) {
		/* It has a symbol ID but not a message ID assigned.  Return nothing.*/
		console.log('Message definition for ' + path + ' is missing the message ID definition.');
		return false;
	}
}



ProtobufEncoder.prototype.getCmdDefByOpsName = function (opsName) {
	return this.cmdDefs[opsName];
}



ProtobufEncoder.prototype.getCmdDefByMsgIDandCC = function (msgID, cmdCode) {
	for(var opsName in this.cmdDefs) {
		var cmd = this.cmdDefs[opsName];
		if((cmd.msgID == msgID) && (cmd.commandCode == cmdCode)){
			return cmd;
		}
	}
}



ProtobufEncoder.prototype.getTlmDef = function (opsName) {
	for(var msgID in this.tlmDefs) {
		var tlm = this.tlmDefs[msgID];
		if(tlm.opsName == opsName)
			return tlm;
	}
}



ProtobufEncoder.prototype.sendCommand = function (cmd) {
	var buffer = new Buffer(cmd.byteLength);
	buffer.fill(0x00);
	
	buffer.writeUInt16BE(cmd.msgID, 0);
	buffer.writeUInt16BE(this.sequence, 2);
	buffer.writeUInt16BE(cmd.byteLength - 7, 4);
	buffer.writeUInt8(cmd.commandCode, 7);
	buffer.writeUInt8(0, 6);
	
	this.sequence++;
	
	for(var key in cmd) {
		var field = cmd[key]
		if(field.hasOwnProperty('value')) {
			if(field.hasOwnProperty('multiplicity')) {
				switch(field.type) {
					case 'uint8':
						buffer.writeUInt8(field.value, field.offset / 8);
						break;
						
					case 'string':
						buffer.write(field.value, field.offset / 8);
						break;
						
					case 'uint16':
						buffer.writeUInt16LE(field.value, field.offset / 8);
						break;
						
					case 'int16':
						buffer.writeInt16LE(field.value, field.offset / 8);
						break;
						
					case 'uint32':
						buffer.writeUInt32LE(field.value, field.offset / 8);
						break;
						
					case 'int32':
						buffer.writeInt32LE(field.value, field.offset / 8);
						break;
				}
			} else {

				switch(field.type) {
					case 'uint8':
						buffer.writeUInt8(field.value, field.offset / 8);
						break;
						
					case 'string':
						buffer.write(field.value, field.offset / 8, field.length);
						break;
						
					case 'uint16':
						buffer.writeUInt16LE(field.value, field.offset / 8);
						break;
						
					case 'int16':
						buffer.writeInt16LE(field.value, field.offset / 8);
						break;
						
					case 'uint32':
						buffer.writeUInt32LE(field.value, field.offset / 8);
						break;
						
					case 'int32':
						buffer.writeInt32LE(field.value, field.offset / 8);
						break;
				}
			}
		}
	}
	
	this.sendCallback(buffer);
}



ProtobufEncoder.prototype.msgParseFieldDef = function (msgDef, field, bitPosition, endian, headerLength, parentEngName) {
	var engName = parentEngName + '/' + field.name;
	
	if(typeof field.array !== 'undefined') {
		if(bitPosition >= headerLength) {
			if(typeof field.type.base_type !== 'undefined'){
				var newField =  {multiplicity: field.count, offset: bitPosition, engName: engName};
  			    switch(field.type.base_type) {
 		            case 'unsigned char':
 		            	newField.type = 'uint8';
 		        	    break;
 		        	
 		            case 'char':
 		            	newField.type = 'string';
 		                break;
 		        	
 		            case 'short unsigned int':
 		            	newField.type = 'uint16';
 		        	    break;
 		        	
 		            case 'short int':
 		            	newField.type = 'int16';
 		        	    break;
 		        	
			        case 'long unsigned int':
 		            	newField.type = 'uint32';
 		        	    break;
 		        	
			        case 'long int':
 		            	newField.type = 'int16';
 		        	    break;
 		        	
 		            default:
 		        	    console.log('Unsupported type');
  			    }
                msgDef[field.name] = newField;				
			} else {	
			    //msgDef[field.name] = { fields: {}};	
				//for(var i=0; i < field.type.fields.length; ++i) {
				//	var nextMsgDef = msgDef[field.name].fields;
			    //	bitPosition = this.msgParseFieldDef(nextMsgDef, field.type.fields[i], bitPosition, endian, headerLength, engName);
				//}
			}
		}
		bitPosition += (field.type.bit_size * field.count);
	} else if(Array.isArray(field.fields)) {
	    msgDef[field.name] = { fields: {}};	
		msgDef[field.name].engName = engName;
		msgDef[field.name].offset = bitPosition;
		msgDef[field.name].bitLength = field.bit_size;
		for(var i=0; i < field.fields.length; ++i) {		
			var nextMsgDef = msgDef[field.name].fields;
	    	bitPosition = this.msgParseFieldDef(nextMsgDef, field.fields[i], bitPosition, endian, headerLength, engName);
		}
	} else {
		if(bitPosition >= this.cmdHeaderLength) {
			var newField =  {offset: bitPosition, engName: engName};
			switch(field.base_type) {
		        case 'unsigned char':
		        	newField.type = 'uint8';
		        	break;
		        	
		        case 'char':
		        	newField.type = 'int8';
		        	break;
		        	
		        case 'short unsigned int':
		        	newField.type = 'uint16';
		        	break;
		        	
		        case 'short int':
		        	newField.type = 'int16';
		        	break;
		        	
		        case 'long unsigned int':
		        	newField.type = 'uint32';
		        	break;
		        	
		        case 'long int':
		        	newField.type = 'int32';
		        	break;
 		        	
 		        default:
 		        	console.log('Unsupported type ' + field);
		    }
			
			msgDef[field.name] = newField;
		}
		bitPosition += field.bit_size;
	}
	
	this.cdd[engName] = msgDef[field.name];
	
	return bitPosition;
}



ProtobufEncoder.prototype.cfeTimeToJsTime = function(seconds, subseconds) {
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
    var jsDateTime = new Date("12/1/" + this.options.CFE_TIME_EPOCH_YEAR);
  
    /* Adjust days. */
    jsDateTime.setDate(jsDateTime.getDate() + (this.options.CFE_TIME_EPOCH_DAY-1));
  
    /* Adjust hours minutes and seconds. */
    jsDateTime.setTime(jsDateTime.getTime() + 
    		(this.options.CFE_TIME_EPOCH_HOUR * 3600000) + 
    		(this.options.CFE_TIME_EPOCH_MINUTE * 60000) + 
    		(this.options.CFE_TIME_EPOCH_SECOND * 1000));
  
    /* Add the CFE seconds. */
    jsDateTime.setTime(jsDateTime.getTime() + (seconds * 1000));
  
    /* Finally, add the CFE microseconds. */
    jsDateTime.setMilliseconds(jsDateTime.getMilliseconds() + (microseconds / 1000));
  
    return jsDateTime;
}



ProtobufEncoder.prototype.getCommandDef = function (ops_name) {	
	var retObj = {};
}



ProtobufEncoder.prototype.register = function (callback) {	
	var registration = new TmTcRegistration(this);
	
	this.registrations.push(registration);
	
	if(typeof callback === 'function') {
		callback(registration);
	}
	
	return registration;
}



