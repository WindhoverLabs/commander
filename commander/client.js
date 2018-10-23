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
/*
 * Commander client object
 */
var CommanderClient = CommanderClient || {};
CommanderClient.prototype.__proto__ = EventEmitter.prototype;

/**
 * Commander client connects with node server to send commands and receive
 * telemetry via socketIO
 * @constructor
 */
function CommanderClient() {
  /**
   * Socket connection check
   * @type {Boolean}
   */
  this.isSocketConnected = false;
  /**
   * Declares socket
   * @type {Object}
   */
  this.socket;
  /**
   * Declares and initializes subscriptions to store already
   * subscribe to opsPaths
   * @type {Object}
   */
	this.subscriptions = {};

	cu.logInfo('Clinet | CommanderClient');
  /* Connect */
	this.connect();
}

/**
 * Check if socket is connected
 * @return {boolean} if true socket is connected, otherwise returns false
 */
CommanderClient.prototype.isSocketConnected = function() {
  /* TODO */
  return isSocketConnected;
};

/**
 * Get a directory listing of layout or .lyt files
 * @param  {String}   path Starting path of directory
 * @param  {Function} cb   Callback
 */
CommanderClient.prototype.getLayouts = function (path, cb){
    this.socket.emit('getLayouts', path, function(result){
        cb(result);
    });
};

/**
 * Get a directory listing of panels of .pug files
 * @param  {String}   path Starting path of directory
 * @param  {Function} cb   Callback
 */
CommanderClient.prototype.getPanels = function (path, cb) {
    this.socket.emit('getPanels', path, function(result) {
        cb(result);
    });
};

/**
 * Get random number
 * @param  {Function} cb Callback
 */
CommanderClient.prototype.getRandom = function (cb){
    setInterval(function() {
        var random_boolean = Math.random() >= 0.5;
        cb(random_boolean);
    }, 500);
};


/**
 * Disable video stream
 */
CommanderClient.prototype.diableVideoSteam = function() {
  console.log('video stream disabled.')
}

/**
 * Subscribe to video stream
 * @param  {Function} cb Callback
 */
CommanderClient.prototype.getVideoSteam = function(cb) {
  console.log('video stream subscribed.')
  /* stub */
  var width   = 600;
  var height  = 400;
  var i;
  var end = width * height;
  setInterval(()=>{
    var image = [];
    for(i = 0; i < end; ++i) {
      image.push('0123456789abcdef'.split('').map(function(v,i,a){
        return i>1 ? null : a[Math.floor(Math.random()*16)] }).join(''));
    }
    image = image.join('');
    image = btoa(image)
    cb(image);
  },5000);
}


/**
 * Get directory listing
 * @param  {String}   path      Directory root path
 * @param  {String}   extension File extension
 * @param  {Function} cb        Callback
 */
CommanderClient.prototype.getDirectoryListing = function (path, extension, cb){
	var re = /(?:\.([^.]+))?$/;

    if(this.isSocketConnected){
    	this.socket.emit('getDirectoryListing', path, function(result){
    		var entries = [];
    		var dirEntries = result.files;

            for(var i=0; i < dirEntries.length; ++i) {
            	var entry = dirEntries[i];

            	if(entry.hasOwnProperty('type')) {
            		if(entry.type == 'dir') {
            			/* This is a directory. */
                        entries.push(entry);
            		} else {
                		var ext = re.exec(entry.name)[1];

                		if(ext != null) {
                		    if(ext == extension) {
                                entries.push(entry);
                		    }
                		} else {
                            entries.push(entry);
                		}
            		}
            	} else {
                    entries.push(entry);
            	}
            }

            cb(entries);
        });
    };
};


/**
 * Get views
 * @param  {Function} cb Callback
 */
CommanderClient.prototype.getViews = function (cb) {
    if(this.isSocketConnected){
    	this.socket.emit('getViews', function(views){
            cb(views);
        });
    };
};


/**
 * Get command definition
 * @param  {Object}   cmdObj Command information
 * @param  {Function} cb     Callback
 */
CommanderClient.prototype.getCmdDef = function (cmdObj,cb) {
    if(this.isSocketConnected) {
        this.socket.emit('getCmdDef', cmdObj, function(cmdDef) {
        	 var outCmdDef = {name:cmdDef.opsPath, argument:cmdDef.args};
            cb(outCmdDef);
        });
    };
};


/**
 * Get telemetry definition
 * @param  {Object}   tlmObj Telemetry information
 * @param  {Function} cb     Callback
 */
CommanderClient.prototype.getTlmDefs = function (tlmObj, cb) {
    if(this.isSocketConnected) {
    	this.socket.emit('getTlmDefs', tlmObj, function(tlmDef) {
            cb(tlmDef);
        });
    };
};


/**
 * Updates Telemetry by calling the given callback on newly received tlm
 * database
 * @param  {Object} items Telemetry uptate items
 */
CommanderClient.prototype.updateTelemetry = function (items) {
	var self = this;

	for(var itemID in items) {
		var subs = self.subscriptions[itemID];
		for(var funcName in subs) {
			var cb = subs[funcName].cb;
            var opsPath = subs[funcName].opsPath;
			var param = {
              sample: items[itemID].sample,
              opsPath:opsPath
            };
			cb(param);
		}
	}
}

/**
 * Unsubscribe unused telemetry
 * @param  {Object} tlmObj Telemetry object
 */
CommanderClient.prototype.unsubscribe = function (tlmObj){

    if(this.isSocketConnected){
    	var tlmOpsPaths = [];

    	for(var i=0; i < tlmObj.length; ++i) {
    		var opsPath = tlmObj[i].name;
    		tlmOpsPaths.push(opsPath);

        if(this.subscriptions.hasOwnProperty(opsPath)) {
          delete this.subscriptions[opsPath];
        }
        cu.logDebug('Clinet | unsubscribed')
    	}

    	this.socket.emit('unsubscribe', tlmOpsPaths);


    };
};

/**
 * Subscribe to telemetry
 * @param  {Object}   tlmObj Telemetry Object
 * @param  {Function} cb     Callback
 */
CommanderClient.prototype.subscribe = function (tlmObj, cb){

    if(this.isSocketConnected){
    	var tlmOpsPaths = [];

    	for(var i=0; i < tlmObj.length; ++i) {
    		var opsPath = tlmObj[i].name;
    		tlmOpsPaths.push(opsPath);

        	if(this.subscriptions.hasOwnProperty(opsPath) == false) {
        		this.subscriptions[opsPath] = {};
        	}

        	this.subscriptions[opsPath][cb] = {cb:cb, opsPath:opsPath};
    	}

    	this.socket.emit('subscribe', tlmOpsPaths);


    };
};


/**
 * Send commands
 * @param  {Object} cmdObj Command object
 */
CommanderClient.prototype.sendCommand = function (cmdObj) {
    cu.logInfo('Client | sent command : ', JSON.stringify(cmdObj, 2));
    if(this.isSocketConnected){
    	this.socket.emit('sendCmd', cmdObj);

    };
};


/**
 * Connect to socket
 */
CommanderClient.prototype.connect = function (){
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

    this.socket.on('telemetry-update', function(items){
    	self.updateTelemetry(items);
	});
};
