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
const Emitter = require('events');
const util = require('util');
var convict = require('convict');
var config = require('./config.js');
const Sparkles = require('sparkles');
var socket_io = require('socket.io');
var path = require('path');
var fs = require('fs');

var emit = Emitter.prototype.emit;

exports.events = [
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

var publicFunctions = [
	'getDirectoryListing',
	'getCmdDefs',
	'getTlmDefs',
	'subscribe',
	'sendCommand'
];

function ClientConnector(workspace, configFile, app) {
    this.vars = {};
    var self = this;
    this.workspace = workspace;
    this.instanceEmitter = new Emitter();;

    /* Load environment dependent configuration */
    config.loadFile(configFile);

    /* Perform validation */
    config.validate({allowed: 'strict'});
    
  //Socket.io
    var io = socket_io();
    app.io = io;

    io.on('connection', function(socket) {
    	socket.on('connect_error', function(socket) {
    		console.log('Client: connect_error');
    	});

    	socket.on('connect_timeout', function(socket) {
    		console.log('Client: connect_timeout');
    	});

    	socket.on('reconnect', function(socket) {
    		console.log('Client: reconnect');
    	});

    	socket.on('reconnect_attempt', function(socket) {
    		console.log('Client: reconnect_attempt');
    	});

    	socket.on('reconnecting', function(socket) {
    		console.log('Client: reconnecting');
    	});

    	socket.on('reconnect_error', function(socket) {
    		console.log('Client: reconnect_error');
    	});

    	socket.on('reconnect_failed', function(socket) {
    		console.log('Client: reconnect_failed');
    	});

    	socket.on('disconnect', function(socket) {
    		console.log('Client: disconnect');
    	});

    	for(var i in publicFunctions) {
    		(function(funcName) {
    	        socket.on(funcName, function() {
    	        	var cb = arguments[arguments.length-1];
	    	        self[funcName].apply(self, arguments);
    		    });
    	    })(publicFunctions[i]);
    	}
    });    
};



ClientConnector.prototype.getDirectoryListing = function(inPath, cb) {
    var outFiles = [];
    var fullPath = path.join(this.workspace + '/web', inPath);

    fs.readdir(fullPath, function (err, files) {
        if (err == null) {
            for (var i = 0; i < files.length; ++i) {
                var currentFile = fullPath + '/' + files[i];
                var stats = fs.statSync(currentFile);
                var transPath = inPath + '/' + files[i];
                var entry = {path: transPath, name: files[i], size: stats.size, mtime: stats.mtime};
                if (stats.isFile()) {
                    entry.type = 'file';
                } else if (stats.isDirectory()) {
                    entry.type = 'dir';
                } else {
                    entry.type = 'unknown';
                }
                outFiles.push(entry);
            };
        };
        cb({err: err, path: inPath, files: outFiles});
    });
}



ClientConnector.prototype.getCmdDefs = function(cb) {
	cb('getCmdDefs');
}



ClientConnector.prototype.getTlmDefs = function(cb) {
	cb('getTlmDefs');
}



ClientConnector.prototype.sendCommand = function(cb) {
	cb('sendCommand');
}



//Speed up calls to hasOwnProperty
var hasOwnProperty = Object.prototype.hasOwnProperty;

function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
}



ClientConnector.prototype.setInstanceEmitter = function (newInstanceEmitter)
{
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('varServerEventsStreamID'), function(event) {
    	if(event == 'message-received') {
    		/* A complete message was received by the variable server.  If we
    		 * have updates in the queue, flush the queue out to the client.
    		 */
    		if(isEmpty(self.vars) == false) {
        		self.vars = {};
    		};
    	}
	});
	
	//this.sendCmd({ops_path: '/CFE/SetMaxPRCount', args: {'Payload.MaxPRCount': 9}});
	
	this.sendCmd({ops_path: '/CFE/ES_Noop'});
	
//	this.sendCmd({ops_path: '/CFE/StartApp', args: {
//        'Payload.AppEntryPoint':'CF_AppMain',
//        'Payload.Priority':100,
//        'Payload.Application':'CF',
//        'Payload.AppFileName':'/cf/apps/CF.so',
//        'Payload.StackSize':32769,
//        'Payload.ExceptionAction':1}});
	
	this.sendCmd({ops_path: '/CFE/StopApp', args: {
        'Payload.Application':'CF',
        'Payload.AppFileName':'/cf/apps/cf.so'}});
	
//	this.requestCmdDefinition('/CFE_ES/ES_NOOP', function(definition) {
//		console.log(definition);
//	});
	
//	this.requestVarDefinition('/CFE_ES_HkPacket_t/Payload/PerfTriggerMask', function(definition) {
//		console.log(definition);
//	});
	
//	this.subscribe('/CFE_ES_HkPacket_t/Payload/PerfTriggerMask', function(update) {
//		console.log(update);
//	});
}



ClientConnector.prototype.sendCmd = function (cmdName, args) {
	this.instanceEmit(config.get('cmdSendStreamID'), cmdName, args);
}



ClientConnector.prototype.requestCmdDefinition = function (cmdName, cb) {
	
	this.instanceEmitter.once(config.get('cmdDefRspStreamIDPrefix') + ':' + cmdName, function(definition) {
    	cb(definition);
	});
	
	this.instanceEmit(config.get('cmdDefReqStreamID'), cmdName);
}



ClientConnector.prototype.requestVarDefinition = function (varName, cb) {
	this.instanceEmitter.once(config.get('varDefRspStreamIDPrefix') + ':' + varName, function(definition) {
    	cb(definition);
	});
	
	this.instanceEmit(config.get('varDefReqStreamID'), varName);
}



ClientConnector.prototype.subscribe = function (varName) {
	var self = this;
	
	this.instanceEmitter.on(config.get('varUpdateStreamIDPrefix') + ':' + varName, function(update) {
		self.vars[varName] = update;
	});
}



ClientConnector.prototype.instanceEmit = function (streamID, msg)
{
	this.instanceEmitter.emit(streamID, msg);
}




/**
 * Inherits from `EventEmitter`.
 */
ClientConnector.prototype.__proto__ = Emitter.prototype;



module.exports = ClientConnector;
