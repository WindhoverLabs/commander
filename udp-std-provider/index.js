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

const net = require('net');
var events = require('events');
const Emitter = require('events').EventEmitter;
var convict = require('convict');
const dgram = require('dgram');
var convict = require('convict');

var emit = Emitter.prototype.emit;
var Sparkles = require('sparkles');



exports.events = [
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function UdpStdProvider(configFile) {
	this.listener = dgram.createSocket('udp4');
	this.sender = dgram.createSocket('udp4');
	
	// Define a schema
	this.config = convict({
	    env: {
	        doc: 'The application environment.',
	        format: ['production', 'development', 'test'],
	        default: 'development',
	        env: 'NODE_ENV'
	    },
	    inPort: {
	        doc: 'Input port.',
	        format: 'int',
	        default: 0
	    },
	    outPort: {
	        doc: 'Output port.',
	        format: 'int',
	        default: 0
	    },
	    outAddress: {
	        doc: 'Output IP address.',
	        format: 'ipaddress',
	        default: '127.0.0.1'
	    },
	    outputStreamID: {
	        doc: 'Output binary stream from binary data provider to the encoder/decoder.',
	        format: String,
	        default: ''
	    },
	    inputStreamID: {
	        doc: 'Input binary stream from encoder/decoder to binary data provider.',
	        format: String,
	        default: ''
	    }
	});
	
    /* Load environment dependent configuration */
    this.config.loadFile(configFile);

    /* Perform validation */
    this.config.validate({allowed: 'strict'});

	this.inputStreamID = this.config.get('inputStreamID');
	this.outputStreamID = this.config.get('outputStreamID');
	
    var sparkles = Sparkles('airliner');
    
    this.listener.on('error', (err) => {
        console.log(`UDP connector error:\n${err.stack}`);
        server.close();
    });

    this.listener.on('listening', () => {
        const address = this.listener.address();
        console.log(`UDP connector listening ${address.address}:${address.port}`);
    });
    
    console.log(`Starting binary UDP listener on port ${this.config.get('inPort')}`);
    this.listener.bind(this.config.get('inPort'));
};



UdpStdProvider.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	this.instanceEmitter = newInstanceEmitter;
    var self = this;
    
    this.listener.on('message', (msg, rinfo) => {
//        if(self.config.get('inPort') == 5109) {
//        	console.log(msg);
//        }

        self.instanceEmitter.emit(self.config.get('outputStreamID'), msg);
    });
    
	this.instanceEmitter.on(this.config.get('inputStreamID'), function(buffer) {
		self.sender.send(buffer, 0, buffer.length, self.config.get('outPort'), self.config.get('outAddress'));
	});
}



UdpStdProvider.prototype.instanceEmit = function (streamID, msg)
{
	instanceEmitter.emit(streamID, msg);
}



/**
 * Inherits from `EventEmitter`.
 */
UdpStdProvider.prototype.__proto__ = Emitter.prototype;


UdpStdProvider.prototype.send = function (text) {
};



exports = module.exports = UdpStdProvider;