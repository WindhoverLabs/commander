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
		var msgID = message.msgID;
        
	    if(typeof tlmDef !== 'undefined') {
	    	var tlmJson = {};

	    	console.log(message.fields);
	    	console.log(tlmJson);
	    	self.processFields(message.fields, tlmJson);
	    	
	    	/* Now send the the message to all PB listeners. */
	    	var pbMsgDef = tlmDef.proto.lookupType(tlmDef.name + '_pb');
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


ProtobufEncoder.prototype.processFields = function (inJSON, outJSON) {	
	for(var itemID in inJSON) {

		var path = itemID.split('/');
		var item = inJSON[itemID];
		
		var tmpObj = outJSON;
		for(var j = 2; j < path.length; ++j) {
			if(outJSON.hasOwnProperty(path[j]) == false) {
				/* Property doesn't exist.  Add it. */
				if(j == path.length - 1) {
					tmpObj[path[j]] = item.value;
				} else {
					tmpObj[path[j]] = {};
				}
			}
			tmpObj = tmpObj[path[j]]
		}
	}
	
	console.log(outJSON);
}



ProtobufEncoder.prototype.getMsgDefBySymbolName = function (name) {
	return this.defs[name];
};



ProtobufEncoder.prototype.parseProtoFile = function (filePath) {
	var self = this;
	
    var fileName = filePath.replace(/^.*[\\\/]/, '');
    var structureName = fileName.replace(/\.[^/.]+$/, '');
    
    self.defs[structureName] = {name: structureName, proto: new protobuf.Root()};
    
	protobuf.loadSync(filePath, self.defs[structureName].proto);
}


