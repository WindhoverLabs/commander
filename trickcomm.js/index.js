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
var Emitter = require('events').EventEmitter;

var emit = Emitter.prototype.emit;

exports = module.exports = TrickComm;

exports.events = [
  'connect',
  'close',
  'error'
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function TrickComm() {
    this.params = [];
    this.connection;
    this.port = 7100;
    this.address = '127.0.0.1';
    this.connected = false;
    this.client;
    this.tlmBypass = null;
};

/**
 * Inherits from `EventEmitter`.
 */
TrickComm.prototype.__proto__ = Emitter.prototype;


TrickComm.prototype.connect = function (options){
    var self = this;
    
    this.tlmBypass = options.tlmBypass;

    this.client = net.createConnection(options);

    /* This is the data coming from Trick.  The message is all text.  The 
     * first character is a number.  Not sure what it is yet.  We're just
     * going to ignore it.  The rest of the message is a list of the values
     * to parameters we subscribed to, in the order we subscribed, tab
     * delimited.  We don't know what the data types were, so this function
     * will just return a string, often padded to the right by spaces.
     */    
    this.client.on('data', function(buf){
        /* First convert the buffer to a string so we can manipulate it.  The
         * message ends in a carriage return, so chop that off.*/
        var str = buf.toString('utf8', 0, buf.length - 1);

        /* Split it by tabs into an array */
        var values = str.split('\t');

        if(typeof self.tlmBypass === 'function') {
        	self.tlmBypass(values);
        }

        /* Now get the count of received values and expected values.  There is
         * often lag between when the parameter is subscribed (or 
         * unsubscribed) and when the value server sends a message.  So, its
         * possible we can receive more or less than what we expect to receive.
         * If its more, don't even process any of the message because we don't 
         * know which value to ignore.  If its less, we must have just 
         * subscribed to data and Trick hasn't processed our request yet, so 
         * process up the value we're expected.
         */
        var inValueCount = values.length - 1;
	    var expValueCount = self.params.length;
        if(expValueCount > inValueCount){
            /* We got more values.  Ignore the message entirely. */
            /* TODO:  Log it */
        	console.log("TrickComm:  Received unexpected number of values.")
        } else {
            /* Use the smaller of the two numbers since the new parameters 
             * will be at the end of the params array anyway.
             */
            var valueCount = Math.min(inValueCount, expValueCount);

            /* TODO:  Log when the received value count does not equal the
             * expected value count.
             */

            /* The values should be in the order they were subscribed to.
             * We stored the parameters (and associated callbacks) in the
             * same order we subscribed to Trick, so the two arrays should
             * be in the right order.
             */
            for(var iParam = 0; iParam < valueCount; ++iParam){
                var param = self.params[iParam];
                var value = values[iParam+1];
                var cbCount = param.callbacks.length;
                for(var iCB = 0; iCB < cbCount; ++iCB){
                    var cb = param.callbacks[iCB];
                    /* Lets make sure the callback still exists. */
                    if(cb && typeof cb === 'function') {
                        /* It still exists.  Call it with the new value. */
                        param.callbacks[iCB](param.param, value);
                    } else {
                        /* It does not exist.  The function must have scoped
                         * out.  Delete the callback so we don't try calling it
                         * anymore.
                         */
                        param.callbacks.splice(iCB, 1);
	                }
                }

                /* TODO:  Unsubscribe when there are no callbacks for the
                 * parameter. 
                 */
            }
        }
    });

    this.client.on('close', function(had_error){
        self.connected = false;
        if(had_error == true) {
        	console.log('TrickComm:  Closed connection due to a network error.');
        } else {
            console.log('TrickComm:  Closed connection to Trick');
        }
    });

    this.client.on('connect', function(){
        self.connected = true;
        self.emit('connect');
    });

    this.client.on('drain', function(){
        console.log('TrickComm:  drain');
    });

    this.client.on('end', function(){
        self.connected = false;
        console.log('TrickComm:  end ');
    });

    this.client.on('error', function(err){
        console.log('TrickComm:  Network error.  \'' + err.toString() + '\'');
    });

    this.client.on('lookup', function(err, address, family, host){
        if(typeof err == Error){
            console.log('TrickComm:  lookup:  err=' + err.toString() + '  address=' + address + '  family=' + family + '  host=' + host);
        } else {
            console.log('TrickComm:  lookup:  address=' + address + '  family=' + family + '  host=' + host);
        }
    });

    this.client.on('timeout', function(){
        console.log('TrickComm:  Connection timed out.');
    });
};


TrickComm.prototype.disconnect = function (){
    console.log('TrickComm:  Disconnecting.');
    this.client.destroy()
}

TrickComm.prototype.isConnected = function (){
    return this.connected;
}


TrickComm.prototype.setVarCycle = function (period){
    if(this.isConnected() == false) {
        /* TODO - Log this*/
        console.log('TrickComm:  setVarCycle called while disconnected.');
    } else {
	this.client.write('trick.var_cycle(' + period + ')\n');
    }
}


TrickComm.prototype.subscribe = function (param, callback){
    if(this.isConnected() == false) {
        /* TODO - Log this*/
        console.log('TrickComm:  subscribe called while disconnected.');
    } else {
        var found = false;
        var paramCount = this.params.length;
        for(var i = 0; i < paramCount; ++i){
            var foundParam = this.params[i];
	        if(foundParam.param == param){
		        found = true;
                foundParam.callbacks.push(callback);
            	console.log('TrickComm:  Received request to already subscribed data \'' + foundParam.param + '\'');
		        break;
            }
        }

        if(found == false){
        	console.log('TrickComm:  Subscribing to \'' + param.name + '\'');
            this.params.push({'param':param, 'callbacks':[callback]});
            this.client.write('trick.var_add("' + param.name + '")\n');
        };
    }
};
