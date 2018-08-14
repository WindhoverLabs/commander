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

var emit = Emitter.prototype.emit;

exports = module.exports = TmTcServer;

exports.events = [
  'connect',
  'close',
  'error'
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function TmTcServer(options) {
    this.parsers = {};
    this.options = options;
    
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
        this.headerLength = 96;
    	break;
    	  
      case 'CFE_SB_TIME_32_32_SUBS':
        this.ccsdsTlmSecHdr = new Parser()
    	  .endianess('little')
          .uint32('seconds')
          .uint32('subseconds');
        this.headerLength = 98;
    	break;
    	  
      case 'CFE_SB_TIME_32_32_M_20':
        this.ccsdsTlmSecHdr = new Parser()
    	  .endianess('little')
          .uint32('seconds')
          .uint32('subseconds');
        this.headerLength = 98;
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
};



/**
 * Inherits from `EventEmitter`.
 */
TmTcServer.prototype.__proto__ = Emitter.prototype;



TmTcServer.prototype.processMessage = function (buffer) {
    var msgID = buffer.readUInt16BE(0);
    
    var parser = this.parsers[msgID];
    
    //var message = {};
    
	var message = this.ccsds.parse(buffer);
	
	//console.log(message);
	
	//if(message.priHdr.pktType == 0) {
	//	/* This is a telemetry message. */
	//	message.secHdr = this.ccsdsTlmSecHdr.parse(message.priHdr.payload);
	//	message.secHdr.time = this.cfeTimeToJsTime(message.secHdr.seconds, message.secHdr.subseconds)
	//} else {
	//	/* This is a command message. */
	//	message.secHdr = this.ccsdsCmdSecHdr.parse(message.priHdr.payload);
	//}
	
	//delete message.priHdr.payload;
	//message.payload = message.secHdr.payload;
	//delete message.secHdr.payload;
	
	//if(message.priHdr.length != (message.payload.length + 7)) {
	//	/* TODO:  Length does not match actual received length. */
	//}

	//if(msgID == 2053) {
    if(typeof parser !== 'undefined') {
    	//console.log('*****************************');
    	//console.log(msgID);
    	//console.log(buffer);
    	//console.log(message);
    	//console.log(parser.getCode());
    	//console.log('*****************************');
    	message.payload = parser.parse(message.payload);
    	//console.log('*****************************');
        console.log(util.inspect(message, {showHidden: false, depth: null}));
    }
	//}
};



TmTcServer.prototype.addMessageParser = function (msgID, parser) {
	this.parsers[msgID] = parser;
}



TmTcServer.prototype.parseMsgDefFile = function (filePath) {
	var msgDef = JSON.parse(fs.readFileSync(filePath, 'utf8'));

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
  		    	    bitPosition = this.parseFieldDef(parser, symbol.fields[j], bitPosition, 'le');
				} else {
					bitPosition = this.parseFieldDef(parser, symbol.fields[j], bitPosition, 'be');
  		    	}
			}

	        this.addMessageParser(symbol.msgID, parser);
		}
	};
}



TmTcServer.prototype.parseFieldDef = function (parser, field, bitPosition, endian) {	
	var retObj = {};
	
	if(typeof field.array !== 'undefined') {
		if(bitPosition >= this.headerLength) {
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
			    	//bitPosition = this.parseFieldDef(newParser, field.type.fields[i], bitPosition, endian);
			    	//parser.nest(field.name, {type: newParser});
			    	bitPosition = this.parseFieldDef(parser, field.type.fields[i], bitPosition, endian);
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
	    	//bitPosition = this.parseFieldDef(newParser, field.fields[i], bitPosition, endian);
	    	//parser.nest(field.name, {type: newParser});
	    	bitPosition = this.parseFieldDef(parser, field.fields[i], bitPosition, endian);
		}
	} else {
		if(bitPosition >= this.headerLength) {
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