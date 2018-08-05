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

var TrickComm = TrickComm || {};

var emit = EventEmitter.prototype.emitEvent;

TrickComm.prototype.__proto__ = EventEmitter.prototype;



function TrickComm(sessionParams) {
  this.activeInstances = [];
  this.isSocketConnected = false;
  this.socket;
  this.subscribers = [];
  this.deferredSubscribers = [];
  //this.connection;
  this.defaultInstance = null;
  this.cmdSeqNum = 0;
  this.tlmSeqNum = 0;
  this.params = [];

  if(typeof sessionParams !== 'undefined') {
    if(sessionParams.hasOwnProperty('defaultInstance')) {
      process.nextTick(function () {
        self.setDefaultInstance(sessionParams.defaultInstance);
      });
    }
  }

  this.start();

  this.ee = new EventEmitter();
};



TrickComm.prototype.start = function() {
  this.startSocket();
};



TrickComm.prototype.startSocket = function (){
  var self = this;
    
  this.socket = io({
  	//'reconnection': true ,
	  'reconnectionDelay' : 1000,
	  'reconnectDelayMax': 5000,
	  'timeout': 5000
  });
  this.socket.on('connect', function(){
    /* Connection established. */
    self.isSocketConnected = true;
    self.emit('connect');
  });
  this.socket.on('connect_error', function(error){
    /* Connection error. */
    self.isSocketConnected = false;
    self.emit('connect_error', error);
  });
  this.socket.on('connect_timeout', function(){
    /* Connection timeout. */
    self.isSocketConnected = false;
    self.emit('connect_timeout');
  });
  this.socket.on('reconnect', function(number){
    /* Reconnect occured. */
    self.isSocketConnected = true;
    self.emit('reconnect');
  });
  this.socket.on('reconnect_attempt', function(){
    /* Reconnecting. */
    self.isSocketConnected = false;
    self.emit('reconnect_attempt');
  });
  this.socket.on('reconnecting', function(number){
    /* Reconnect error occured */
    self.isSocketConnected = false;
    self.emit('reconnecting', number);
  });
  this.socket.on('reconnect_error', function(error){
    /* Reconnect error occured */
    self.isSocketConnected = false;
    self.emit('reconnect_error', error);
  });
  this.socket.on('reconnect_failed', function(){
    /* Reconnect failed. */
    self.isSocketConnected = false;
    self.emit('reconnect_failed');
  });
  this.socket.on('script-stdout', function(message) {
    self.emit('script-stdout', message);
  });
  this.socket.on('script-stderr', function(message) {
    self.emit('script-stderr', message);
  });
  this.socket.on('events', function(event) {
    self.emit('events', event);
  });
  this.socket.on('updateTelem', function(values) {
	  console.log(values);
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
                  if(cb && typeof cb == 'function') {
                      /* It still exists.  Call it with the new value. */
                      param.callbacks[iCB]({name: param.param.name, value: value});
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
};



TrickComm.prototype.subscribe = function (param, callback) {
    var found = false;
    var paramCount = this.params.length;
    for(var i = 0; i < paramCount; ++i){
        var foundParam = this.params[i];
        if(foundParam.param == param){
	        found = true;
            foundParam.callbacks.push(callback);
            console.log('Received request to already subscribed data \'' + foundParam.param + '\'');
	        break;
        }
    }

    if(found == false){
        console.log('Subscribing to \'' + param.name + '\'');
        this.params.push({'param':param, 'callbacks':[callback]});
        this.subscribers.push({'params':param, 'updateFunc':callback});
        this.socket.emit('subscribe', param);
    };
};



TrickComm.prototype.unsubscribe = function (param){
	/* TODO:  Remove parameter from the params list. */
    this.socket.emit('unsubscribe', param);
};



TrickComm.prototype.unsubscribeAll = function(){
    while((sub=this.subscriptions.pop()) != null){
        this.telemetry_unsubscribe(sub);
    }
}
