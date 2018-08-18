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
    this.tlm = {};
    this.protoDefs = {};
    this.cmdHeaderLength = 64;
    this.sequence = 0;
    this.sendCallback = sendCallback;
    
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
   
    for(var i = 0; i < options.msgDefs.length; ++i) {
    	this.parseMsgDefFile(options.msgDefs[i].file);
    }
   
    for(var i = 0; i < options.protoDefs.length; ++i) {
    	this.parseProtoFile(options.protoDefs[i].msg_id, options.protoDefs[i].file);
    }
};



/**
 * Inherits from `EventEmitter`.
 */
TmTcServer.prototype.__proto__ = Emitter.prototype;



TmTcServer.prototype.processBinaryMessage = function (buffer) {
    var msgID = buffer.readUInt16BE(0);
    
    var parser = this.parsers[msgID];
    
	var message = this.ccsds.parse(buffer);

    if(typeof parser !== 'undefined') {
    	message.payload = parser.parse(message.payload);
    }
};



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



TmTcServer.prototype.parseMsgDefFile = function (filePath) {
	var msgDef = JSON.parse(fs.readFileSync(filePath, 'utf8'));

	/* Parse the telemetry. */
	for(var i = 0; i < msgDef.symbols.length; ++i) {
		var symbol = msgDef.symbols[i];
		var bitPosition = 0;
				
		if(typeof symbol.msgID !== 'undefined') {
    		var parser = new Parser();
    		
    		if(msgDef.little_endian == true) {
    			parser.endianess('little');
    		} else {
    			parser.endianess('big');
    		}
    		
			for(var j=0; j < symbol.fields.length; ++j) {
				if(msgDef.little_endian == true) {
  		    	    //bitPosition = this.tlmParseFieldDef(parser, symbol.fields[j], bitPosition, 'le');
				} else {
					//bitPosition = this.tlmParseFieldDef(parser, symbol.fields[j], bitPosition, 'be');
  		    	}
			}

	        this.addMessageParser(symbol.msgID, parser);
		}
	};

	/* Parse the command definitions. */
	for(var key in msgDef.cmds) {
		if(msgDef.cmds.hasOwnProperty(key)) {
			//console.log(key, msgDef.cmds[key]);
			var symbolName = msgDef.cmds[key].symbol;
			var msgID = msgDef.cmds[key].msg_id;
			var code = msgDef.cmds[key].code;
			var cmdDef = [];
			var symbol = {};
			var bitPosition = 0;
			var encoder = {};
			var decoder;

			for(var i = 0; i < msgDef.symbols.length; ++i) {
				if(msgDef.symbols[i].name == symbolName) {
					symbol = msgDef.symbols[i];
					break;
				}
			};
    		
			for(var i=0; i < symbol.fields.length; ++i) {
				if(msgDef.little_endian == true) {
  		    	    bitPosition = this.cmdParseFieldDef(cmdDef, encoder, decoder, symbol.fields[i], bitPosition, 'le');
				} else {
					bitPosition = this.cmdParseFieldDef(cmdDef, encoder, decoder, symbol.fields[i], bitPosition, 'be');
  		    	} 
			}
			
			cmdDef.byteLength = bitPosition / 8;
			cmdDef.msgID = msgID;
			cmdDef.commandCode = code;
			console.log(cmdDef);
			
			this.cmdDefs[key] = cmdDef;
		}
	}
	
	var cmd;
	
	cmd = this.getCmdDef('ES_NOOP');
	this.sendCommand(cmd);
	
	cmd = this.getCmdDef('EVS_NOOP');
	this.sendCommand(cmd);
	
	cmd = this.getCmdDef('SB_NOOP');
	this.sendCommand(cmd);
	
	cmd = this.getCmdDef('TBL_NOOP');
	this.sendCommand(cmd);
	
	cmd = this.getCmdDef('TIME_NOOP');
	this.sendCommand(cmd);
	
	//cmd['Application'].value = 'Hello world';
	//cmd['PoolHandle'].value = 1234;
	
}



TmTcServer.prototype.tlmParseFieldDef = function (parser, field, bitPosition, endian) {		
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
			    //	bitPosition = this.tlmParseFieldDef(parser, field.type.fields[i], bitPosition, endian);
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
	    //	bitPosition = this.tlmParseFieldDef(parser, field.fields[i], bitPosition, endian);
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
						buffer.writeInt32LE(field.value, field.offset / 8);
						break;
						
					case 'string':
						console.log(field.value);
						buffer.write(field.value, field.offset / 8, field.length);
						break;
						
					case 'uint16':
						buffer.writeUInt16LE(field.value, field.offset / 8);
						break;
						
					case 'int16':
						buffer.writeInt16LE(field.value, field.offset / 8);
						break;
						
					case 'uint32':
						console.log(field.offset / 8);
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



TmTcServer.prototype.cmdParseFieldDef = function (msgDef, encoder, decoder, field, bitPosition, endian) {		
	if(typeof field.array !== 'undefined') {
		if(bitPosition >= this.cmdHeaderLength) {
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
			    	bitPosition = this.cmdParseFieldDef(msgDef, encoder, decoder, field.type.fields[i], bitPosition, endian);
				}
			}
		}
		bitPosition += (field.type.bit_size * field.count);
	} else if(Array.isArray(field.fields)) {
		for(var i=0; i < field.fields.length; ++i) {
		    //msgDef[field.name] = {};	
		
	    	bitPosition = this.cmdParseFieldDef(msgDef, encoder, decoder, field.fields[i], bitPosition, endian);
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
		            msgDef[field.name] = {type: 'int16', offset: bitPositio};
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