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
var events = require('events');
var Emitter = require('events').EventEmitter;
var fs = require('fs');
const util = require('util');
var protobuf = require('protobufjs');
var Promise = require('promise');
var mergeJSON = require('merge-json');

var emit = Emitter.prototype.emit;

exports = module.exports = TmTcServer;

exports.events = [
  'connect',
  'close',
  'error'
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function TmTcServer(options, sendCallback) {
    this.parsers = {};
    this.options = options;
    this.cmdDefs = [];
    this.tlmDefs = [];
    this.tlm = {};
    this.protoDefs = {};
    this.cmdHeaderLength = 64;
    this.sequence = 0;
    this.sendCallback = sendCallback;
    this.subscribers = {};
    
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
    
    switch(options.CFE_SB_PACKET_TIME_FORMAT) {
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
   
    var msgDefs = {};
    
    for(var i = 0; i < options.msgDefs.length; ++i) {
    	
    	var msgDefInput = JSON.parse(fs.readFileSync(options.msgDefs[i].file, 'utf8'));
    	msgDefs = mergeJSON.merge(msgDefs, msgDefInput);
    }
    
    //console.log(msgDefs);
	this.parseMsgDefFile(msgDefs);
    
    //for(var i = 0; i < options.msgDefs.length; ++i) {
    //	this.parseMsgDefFile(options.msgDefs[i].file);
    //}
   
    //for(var i = 0; i < options.protoDefs.length; ++i) {
    //	this.parseProtoFile(options.protoDefs[i].msgId, options.protoDefs[i].file);
    //}
};



/**
 * Inherits from `EventEmitter`.
 */
TmTcServer.prototype.__proto__ = Emitter.prototype;



TmTcServer.prototype.processBinaryMessage = function (buffer) {
	var parsedTlm = [];
	
    var msgID = buffer.readUInt16BE(0);
    
	var message = this.ccsds.parse(buffer);
	
	var tlmDef = this.getMsgDefByMsgID(msgID);

    if(typeof tlmDef !== 'undefined') {
    	for(var fieldName in tlmDef.fields) {
    		var field = tlmDef.fields[fieldName];
    		var opsName = tlmDef.path + '/'+ fieldName;
    		var telemItem = {'opsName': opsName};
    		
    		if(field.hasOwnProperty('multiplicity')) {
    		    switch(field.type) {
    				case 'uint8':
    					telemItem.value = buffer.readUInt8(field.offset / 8);
    					break;
    					
    				case 'string':
    					telemItem.value = buffer.read(field.offset / 8);
    					break;
    						
    				case 'uint16':
    					telemItem.value = buffer.readUInt16LE(field.offset / 8);
    					break;
    						
    				case 'int16':
    					telemItem.value = buffer.readInt16LE(field.offset / 8);
    					break;
    						
    				case 'uint32':
    					telemItem.value = buffer.readUInt32LE(field.offset / 8);
    					break;
    						
    				case 'int32':
    					telemItem.value = buffer.readInt32LE(field.offset / 8);
    					break;
   				}
   			} else {
   				switch(field.type) {
   					case 'uint8':
   						telemItem.value = buffer.readUInt8(field.offset / 8);
   						break;
    						
   					case 'string':
   						telemItem.value = buffer.toString('ascii', field.offset / 8, (field.offset / 8) + field.length);
   						break;
    						
   					case 'uint16':
   						telemItem.value = buffer.readUInt16LE(field.offset / 8);
   						break;
    						
   					case 'int16':
   						telemItem.value = buffer.readInt16LE(field.offset / 8);
   						break;
    						
   					case 'uint32':
   						telemItem.value = buffer.readUInt32LE(field.offset / 8);
   						break;
    						
   					case 'int32':
   						telemItem.value = buffer.readInt32LE(field.offset / 8);
   						break;
   				}
   			}
        	parsedTlm.push(telemItem);
   		}
        
        /* Now Send the values to the subscribers. */
        
    	for(var i = 0; i < parsedTlm.length; ++i) {
        	//console.log('****************  ' + parsedTlm[i].path);
    		if(this.subscribers.hasOwnProperty(parsedTlm[i].opsName)) {
    			var subscription = this.subscribers[parsedTlm[i].opsName];
    			for(var j = 0; j < subscription.length; ++j) {
    				subscription[j](parsedTlm[i].value);
    			}
    		}
    	}
    }
};



TmTcServer.prototype.getMsgDefByMsgID = function (msgID) {
	return this.tlmDefs[msgID];
}


TmTcServer.prototype.processPBMessage = function (buffer) {
    var msgID = buffer.readUInt16BE(0);
    
    var pbRoot = this.protoDefs[msgID];
    
	var message = this.ccsds.parse(buffer);

    if(typeof pbRoot !== 'undefined') {
    	var msgName = Object.keys(pbRoot.nested)[0];
    	var pbMessage = pbRoot.lookupType(msgName);
    	
    	message.payload = pbMessage.decode(message.payload);
    	console.log(message);
    }
};



TmTcServer.prototype.addMessageParser = function (msgID, parser) {
	this.parsers[msgID] = parser;
}



TmTcServer.prototype.addCommandDefinition = function (ops_name) {
	this.parsers[msgID] = parser;
}



TmTcServer.prototype.parseProtoFile = function (msgID, filePath) {
	var self = this;
	
	console.log('Loading ' + filePath);
	protobuf.load(filePath, function(err, root) {
		if (err)
			throw err;
		
    	console.log('Loaded ' + filePath);
		self.protoDefs[msgID] = root;
	});
}



TmTcServer.prototype.isCommandMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return true;
	} else {
		return false;
	}
}



TmTcServer.prototype.isTelemetryMsg = function (msgID) {
	if((msgID & 0x1000) == 0x1000) {
		return false;
	} else {
		return true;
	}
}



TmTcServer.prototype.parseMsgDefFile = function (msgDefs) {
	/* Parse the telemetry. */
	//for(var i = 0; i < msgDef.symbols.length; ++i) {
	//	var symbol = msgDef.symbols[i];
	//	var bitPosition = 0;
				
	//	if(typeof symbol.msgID !== 'undefined') {
    //		var parser = new Parser();
    		
    //		if(msgDef.little_endian == true) {
    //			parser.endianess('little');
    //		} else {
    //			parser.endianess('big');
    //		}
    		
	//		for(var j=0; j < symbol.fields.length; ++j) {
	//			if(msgDef.little_endian == true) {
  	//	    	    bitPosition = this.tlmParseFieldDef(parser, symbol.fields[j], bitPosition, 'le');
	//			} else {
	//				bitPosition = this.tlmParseFieldDef(parser, symbol.fields[j], bitPosition, 'be');
  	//	    	}
	//		}

	//        this.addMessageParser(symbol.msgID, parser);
	        
	//        console.log(bitPosition);
	//	}
	//};

	/* Get the config object. */
	var messages = msgDefs.Messages;
	
	/* Flatten the message definition from a hierarchical to ops names. */
	var msgDefInput = this.flattenMsgDefs(messages);
	
	for(var key in msgDefInput) {
		var symbolName = msgDefInput[key].symbol;
		var msgID = msgDefInput[key].msgID;
		if(this.isCommandMsg(msgID)) {
			var cmdCode = msgDefInput[key].cmdCode;
			var cmdDef = [];
			var symbol = {};
			var bitPosition = 0;
			
			console.log(key);

			for(var i = 0; i < msgDefs.symbols.length; ++i) {
				if(msgDefs.symbols[i].name == symbolName) {
					symbol = msgDefs.symbols[i];
					break;
				}
			};
    		
			for(var i=0; i < symbol.fields.length; ++i) {
				if(msgDefs.little_endian == true) {
  		    	    bitPosition = this.msgParseFieldDef(cmdDef, symbol.fields[i], bitPosition, 'le', this.cmdHeaderLength);
				} else {
					bitPosition = this.msgParseFieldDef(cmdDef, symbol.fields[i], bitPosition, 'be', this.cmdHeaderLength);
  		    	} 
			}
			
			cmdDef.byteLength = bitPosition / 8;
			cmdDef.msgID = msgID;
			cmdDef.commandCode = cmdCode;
			
			this.cmdDefs[key] = cmdDef;
		} else {
			var tlmDef = {};
			var symbol = {};
			var bitPosition = 0;

			for(var i = 0; i < msgDefs.symbols.length; ++i) {
				if(msgDefs.symbols[i].name == symbolName) {
					symbol = msgDefs.symbols[i];
					break;
				}
			};
			
			tlmDef.fields = new Array();
    		
			for(var i=0; i < symbol.fields.length; ++i) {
				if(msgDefs.little_endian == true) {
  		    	    bitPosition = this.msgParseFieldDef(tlmDef.fields, symbol.fields[i], bitPosition, 'le', this.tlmHeaderLength);
				} else {
  		    	    bitPosition = this.msgParseFieldDef(tlmDef.fields, symbol.fields[i], bitPosition, 'be', this.tlmHeaderLength);
  		    	} 
			}
			
			tlmDef.byteLength = bitPosition / 8;
			
			tlmDef.path = key;
			
			this.tlmDefs[msgID] = tlmDef;
		}
	}
	
	var cmd;
	
	cmd = this.getCmdDef('/CFE_ES/ES_NOOP');
	console.log('**********************************************');
	console.log(cmd);
	console.log('**********************************************');
	this.sendCommand(cmd);
	
	//cmd = this.getCmdDef('EVS_NOOP');
	//this.sendCommand(cmd);
	
	//cmd = this.getCmdDef('SB_NOOP');
	//this.sendCommand(cmd);
	
	//cmd = this.getCmdDef('TBL_NOOP');
	//this.sendCommand(cmd);
	
	//cmd = this.getCmdDef('TIME_NOOP');
	//this.sendCommand(cmd);
	
	//cmd['Application'].value = 'Hello world';
	//cmd['PoolHandle'].value = 1234;
	
	this.subscribe('/CFE_ES/HK/CmdCounter', function(value) {
		console.log(value);
	})
	
}



TmTcServer.prototype.subscribe = function (tlmID, callback) {
	if(!this.subscribers.hasOwnProperty(tlmID)) {
		this.subscribers[tlmID] = new Array();
	}
	
	this.subscribers[tlmID].push(callback);
}



TmTcServer.prototype.flattenMsgDefs = function (obj, msgDefs, path) {	    
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



TmTcServer.prototype.isMsgDef = function (obj, path) {
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



TmTcServer.prototype.tlmParseFieldDef2 = function (parser, field, bitPosition, endian) {		
	if(typeof field.array !== 'undefined') {
		if(bitPosition >= this.tlmHeaderLength) {
			if(typeof field.type.base_type !== 'undefined'){
  			    switch(field.type.base_type) {
 		            case 'unsigned char':
 		        	    parser.array(field.name, {
 		                    type: 'uint8',
 		                    length: field.count
 		                });
 		        	    break;
 		        	
 		            case 'char':
 		               	parser.string(field.name, {
 		               	    encoding: 'ascii',
 		                    length: field.count
 		                });
 		                break;
 		        	
 		            case 'short unsigned int':
 		        	    parser.array(field.name, {
  		                    type: 'uint16' + endian,
  		                    length: field.count
  		                });
 		        	    break;
 		        	
 		            case 'short int':
 		        	    parser.array(field.name, {
  		                    type: 'int16' + endian,
  		                    length: field.count
  		                });
 		        	    break;
 		        	
			        case 'long unsigned int':
			    	    parser.array(field.name, {
  		                    type: 'uint32' + endian,
  		                    length: field.count
  		                });
 		        	    break;
 		        	
			        case 'long int':
			    	    parser.array(field.name, {
  		                    type: 'uint32' + endian,
  		                    length: field.count
  		                });
 		        	    break;
 		        	
 		            default:
 		        	    console.log('Unsupported type');
		        	    console.log(field);
 		                exit(-1);
  			    }
			} else {
				for(var i=0; i < field.type.fields.length; ++i) {
					//var newParser = new Parser();
					//if(endian == 'le') {
					//	newParser.endianess('little');
					//} else {
					//	newParser.endianess('big');
					//}
			    	//bitPosition = this.tlmParseFieldDef(newParser, field.type.fields[i], bitPosition, endian);
			    	//parser.nest(field.name, {type: newParser});
			    	bitPosition = this.tlmParseFieldDef(parser, field.type.fields[i], bitPosition, endian);
				}
			}
		}
		bitPosition += (field.type.bit_size * field.count);
	} else if(Array.isArray(field.fields)) {
		for(var i=0; i < field.fields.length; ++i) {
			//var newParser = new Parser();
			//if(endian == 'le') {
			//	newParser.endianess('little');
			//} else {
			//	newParser.endianess('big');
			//}
	    	//bitPosition = this.tlmParseFieldDef(newParser, field.fields[i], bitPosition, endian);
	    	//parser.nest(field.name, {type: newParser});
	    	bitPosition = this.tlmParseFieldDef(parser, field.fields[i], bitPosition, endian);
		}
	} else {
		if(bitPosition >= this.tlmHeaderLength) {
			switch(field.base_type) {
		        case 'unsigned char':
		        	parser.uint8(field.name);
		        	break;
		        	
		        case 'char':
		        	parser.int8(field.name);
		        	break;
		        	
		        case 'short unsigned int':
		        	parser.uint16(field.name);
		        	break;
		        	
		        case 'short int':
		        	parser.int16(field.name);
		        	break;
		        	
		        case 'long unsigned int':
		        	parser.uint32(field.name);
		        	break;
		        	
		        case 'long int':
		        	parser.int32(field.name);
		        	break;
 		        	
 		        default:
 		        	console.log('Unsupported type ' + field);
 		            exit(-1);
		    }
		}
		bitPosition += field.bit_size;
	}

	return bitPosition;
}



TmTcServer.prototype.getCmdDef = function (opsName) {
	return this.cmdDefs[opsName];
}



TmTcServer.prototype.sendCommand = function (cmd) {
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



TmTcServer.prototype.msgParseFieldDef = function (msgDef, field, bitPosition, endian, headerLength) {		
	if(typeof field.array !== 'undefined') {
		if(bitPosition >= headerLength) {
			if(typeof field.type.base_type !== 'undefined'){
  			    switch(field.type.base_type) {
 		            case 'unsigned char':
 		            	msgDef[field.name] = {type: 'uint8', multiplicity: field.count, offset: bitPosition};
 		        	    break;
 		        	
 		            case 'char':
 		            	msgDef[field.name] = {type: 'string', length: field.count, offset: bitPosition};
 		                break;
 		        	
 		            case 'short unsigned int':
 		            	msgDef[field.name] = {type: 'uint16', multiplicity: field.count, offset: bitPosition};
 		        	    break;
 		        	
 		            case 'short int':
 		            	msgDef[field.name] = {type: 'int16', multiplicity: field.count, offset: bitPosition};
 		        	    break;
 		        	
			        case 'long unsigned int':
 		            	msgDef[field.name] = {type: 'uint32', multiplicity: field.count, offset: bitPosition};
 		        	    break;
 		        	
			        case 'long int':
 		            	msgDef[field.name] = {type: 'int16', multiplicity: field.count, offset: bitPosition};
 		        	    break;
 		        	
 		            default:
 		        	    console.log('Unsupported type');
  			    }
			} else {
				for(var i=0; i < field.type.fields.length; ++i) {				    
			    	bitPosition = this.msgParseFieldDef(msgDef, field.type.fields[i], bitPosition, endian, headerLength);
				}
			}
		}
		bitPosition += (field.type.bit_size * field.count);
	} else if(Array.isArray(field.fields)) {
		for(var i=0; i < field.fields.length; ++i) {
		    //msgDef[field.name] = {};	
		
	    	bitPosition = this.msgParseFieldDef(msgDef, field.fields[i], bitPosition, endian, headerLength);
		}
	} else {
		if(bitPosition >= this.cmdHeaderLength) {
			switch(field.base_type) {
		        case 'unsigned char':
		            msgDef[field.name] = {type: 'uint8', offset: bitPosition};
		        	break;
		        	
		        case 'char':
		            msgDef[field.name] = {type: 'int8', offset: bitPosition};
		        	break;
		        	
		        case 'short unsigned int':
		            msgDef[field.name] = {type: 'uint16', offset: bitPosition};
		        	break;
		        	
		        case 'short int':
		            msgDef[field.name] = {type: 'int16', offset: bitPosition};
		        	break;
		        	
		        case 'long unsigned int':
		            msgDef[field.name] = {type: 'uint32', offset: bitPosition};
		        	break;
		        	
		        case 'long int':
		            msgDef[field.name] = {type: 'int32', offset: bitPosition};
		        	break;
 		        	
 		        default:
 		        	console.log('Unsupported type ' + field);
		    }
		}
		bitPosition += field.bit_size;
	}

	return bitPosition;
}



TmTcServer.prototype.cfeTimeToJsTime = function(seconds, subseconds) {
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



TmTcServer.prototype.getCommandDef = function (ops_name) {	
	var retObj = {};
}