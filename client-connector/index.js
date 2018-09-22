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

/* Event IDs */
var EventEnum = Object.freeze(
		{'INITIALIZED':              1,
		 'SOCKET_CONNECT_ERROR':     2,
		 'SOCKET_CONNECT_TIMEOUT':   3,
		 'SOCKET_RECONNECT':         4,
		 'SOCKET_RECONNECT_ATTEMPT': 5,
		 'SOCKET_RECONNECTING':      6,
		 'SOCKET_RECONNECT_ERROR':   7,
		 'SOCKET_RECONNECT_FAILED':  8,
		 'SOCKET_DISCONNECT':        9,
		 'SOCKET_PING':             10,
		 'SOCKET_PONG':             11,
		 'MESSAGE_RECEIVED':        12,
		 'SOCKET_PUBLIC_FUNCTION_CALL': 13}
	);

var emit = Emitter.prototype.emit;

exports.events = [
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

var publicFunctions = [
	'getDirectoryListing',
	'getCmdDefs',
	'getTlmDefs',
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
    	var address = socket.handshake.address;

    	socket.on('connect_error', function(err) {
    		self.logErrorEvent(EventEnum.SOCKET_CONNECT_ERROR, 'SocketIO: Socket connect error.  \'' + err + '\'');
    	});

    	socket.on('connect_timeout', function() {
    		self.logErrorEvent(EventEnum.SOCKET_CONNECT_TIMEOUT, 'SocketIO: Socket timeout.');
    	});

    	socket.on('reconnect', function(num) {
    		self.logInfoEvent(EventEnum.SOCKET_RECONNECT, 'SocketIO: Socket successfully reconnected on attempt # \'' + num + '\'.');
    	});

    	socket.on('reconnect_attempt', function() {
    		self.logInfoEvent(EventEnum.SOCKET_RECONNECT_ATTEMPT, 'SocketIO: Socket reconnect attempt.');
    	});

    	socket.on('reconnecting', function(num) {
    		self.logInfoEvent(EventEnum.SOCKET_RECONNECTING, 'SocketIO: Socket reconnecting attempt # \'' + num + '\'.');
    	});

    	socket.on('reconnect_error', function(err) {
    		self.logErrorEvent(EventEnum.SOCKET_RECONNECT_ERROR, 'SocketIO: Socket reconnect error.  \'' + err + '\'.');
    	});

    	socket.on('reconnect_failed', function() {
    		self.logErrorEvent(EventEnum.SOCKET_RECONNECT_FAILED, 'SocketIO: Socket reconnect failed.');
    	});

    	socket.on('disconnect', function() {
    		self.logInfoEvent(EventEnum.SOCKET_DISCONNECT, 'SocketIO: Socket disconnected.');
    	});

    	socket.on('ping', function() {
    		self.logDebugEvent(EventEnum.SOCKET_PING, 'SocketIO: Socket ping.');
    	});

    	socket.on('pong', function(latency) {
    		self.logDebugEvent(EventEnum.SOCKET_PONG, 'SocketIO: Socket pong (' + latency + ' ms).');
    	});

    	socket.on('subscribe', function(opsPaths) {
    		self.subscribe(opsPaths, updateTelemetry);
    	});

	socket.on('sendCmd', function(cmdObj) {
    		self.sendCmd(cmdObj);
    	});

        function updateTelemetry(update) {
        	socket.emit('telemetry-update', update);
        }

    	for(var i in publicFunctions) {
    		(function(funcName) {
    	        socket.on(funcName, function() {
    	        	var cb = arguments[arguments.length-1];
    	        	self.logDebugEvent(EventEnum.SOCKET_PUBLIC_FUNCTION_CALL, 'SocketIO: ' + funcName);
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



ClientConnector.prototype.getCmdDefs = function(cmdObj, cb) {
	this.instanceEmitter.emit(config.get('cmdDefReqStreamID'), {opsPath: cmdObj.name}, function(resp) {
		cb(resp);
	});
	
//    if(req.name=='/CFE/ES_Noop'){
//      cb({
//        "name": "NoOp",
//        "qualifiedName": "/CFE/ES_Noop",
//        "alias": [
//          {
//            "name": "NoOp",
//            "namespace": "/CFS/CFE_ES"
//          }
//        ],
//        "baseCommand": {
//          "name": "cfs-cmd",
//          "qualifiedName": "/CFS/cfs-cmd",
//          "alias": [
//            {
//              "name": "cfs-cmd",
//              "namespace": "/CFS"
//            }
//          ],
//          "abstract": true,
//          "argument": [
//            {
//              "name": "ccsds-apid",
//              "type": {
//                "engType": "integer",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": false,
//                  "sizeInBits": 11,
//                  "encoding": "unsigned"
//                }
//              }
//            },
//            {
//              "name": "timeId",
//              "initialValue": "0",
//              "type": {
//                "engType": "integer",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": false,
//                  "sizeInBits": 2,
//                  "encoding": "unsigned"
//                }
//              }
//            },
//            {
//              "name": "checksumIndicator",
//              "initialValue": "1",
//              "type": {
//                "engType": "integer",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": false,
//                  "sizeInBits": 1,
//                  "encoding": "unsigned"
//                }
//              }
//            },
//            {
//              "name": "packet-type",
//              "initialValue": "1",
//              "type": {
//                "engType": "integer",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": true,
//                  "sizeInBits": 4,
//                  "encoding": "unsigned"
//                }
//              }
//            },
//            {
//              "name": "packet-id",
//              "initialValue": "0",
//              "type": {
//                "engType": "integer",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": true,
//                  "sizeInBits": 32,
//                  "encoding": "unsigned"
//                }
//              }
//            },
//            {
//              "name": "cfs-cmd-code",
//              "type": {
//                "engType": "integer",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": true,
//                  "sizeInBits": 7,
//                  "encoding": "unsigned"
//                }
//              }
//            }
//          ],
//          "url": "http://localhost:8090/api/mdb/Bebop_2_SITL/commands/CFS/cfs-cmd"
//        },
//        "abstract": false,
//        "argumentAssignment": [
//          {
//            "name": "ccsds-apid",
//            "value": "6"
//          },
//          {
//            "name": "cfs-cmd-code",
//            "value": "0"
//          }
//        ],
//        "url": "http://localhost:8090/api/mdb/Bebop_2_SITL/commands/CFS/CFE_ES/NoOp",
//        "uuid": "65dd8102-01d4-49fb-b473-9605b314f0e1"
//      });
//    }
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

    	    self.logDebugEvent(EventEnum.MESSAGE_RECEIVED, 'ServerEvents: Message received.');
    	}
	});
	
//	setTimeout(function () {
		// this.sendCmd({ops_path: '/CFE/SetMaxPRCount', args: {'Payload.MaxPRCount': 9}});
		//
		// this.sendCmd({ops_path: '/CFE/ES_Noop'});

	  // this.sendCmd({ops_path: '/CFE/StopApp', args: {
		//   	'Payload.Application':'CF'}});

		// this.sendCmd({ops_path: '/CFE/StartApp', args: {
	  //      'Payload.AppEntryPoint':'CF_AppMain',
	  //      'Payload.Priority':100,
	  //      'Payload.Application':'CF',
	  //      'Payload.AppFileName':'/cf/apps/CF.so',
	  //      'Payload.StackSize':32769,
	  //      'Payload.ExceptionAction':1}});

//		this.requestVarDefinition('/CFE_ES_HkPacket_t/Payload/PerfTriggerMask', function(definition) {
//			console.log(definition);
//		});

		// this.subscribe('/CFE/ES_HK/Payload.PerfTriggerMask', function(update) {
		// 	console.log(update);
		// });

//		self.subscribe(['/CFE/ES_HK/Payload.ProcessorResets', '/CFE/ES_HK/Payload.CFEMinorVersion'], self.updateTelemetry);
		
//		setTimeout(function () {
//	  	    self.getCmdDefs({name: '/CFE/ES_Noop'}, function(definition) {
//			    //console.log(definition);
//	   	    });
//
//	  	    self.getCmdDefs({name: '/CFE/SetMaxPRCount'}, function(definition) {
//	  	        //console.log('**********************');
//				//console.log(definition);
//		   	});
//		}, 2000);
	//}, 1000);

    this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}



ClientConnector.prototype.updateTelemetry = function (update) {
 	console.log(update);
}



ClientConnector.prototype.sendCmd = function (cmdName, args) {
	this.instanceEmit(config.get('cmdSendStreamID'), cmdName, args);
}



ClientConnector.prototype.requestVarDefinition = function (varName, cb) {
	this.instanceEmitter.once(config.get('varDefRspStreamIDPrefix') + ':' + varName, function(definition) {
    	cb(definition);
	});

	this.instanceEmit(config.get('varDefReqStreamID'), varName);
}



ClientConnector.prototype.subscribe = function (varName, cb) {
	var self = this;
	
	this.instanceEmitter.emit(config.get('reqSubscribeStreamID'), {cmd: 'subscribe', opsPath: varName}, cb);
}



ClientConnector.prototype.unsubscribe = function (varName, cb) {
	var self = this;
	
	this.instanceEmitter.emit(config.get('reqSubscribeStreamID'), {cmd: 'unsubscribe', opsPath: varName}, cb);
}



ClientConnector.prototype.instanceEmit = function (streamID, msg)
{
	this.instanceEmitter.emit(streamID, msg);
}



/**
 * Inherits from `EventEmitter`.
 */
ClientConnector.prototype.__proto__ = Emitter.prototype;



ClientConnector.prototype.logDebugEvent = function (eventID, text) {
	this.instanceEmit('events-debug', {sender: this, component:'ClientConnector', eventID:eventID, text:text});
}



ClientConnector.prototype.logInfoEvent = function (eventID, text) {
	this.instanceEmit('events-info', {sender: this, component:'ClientConnector', eventID:eventID, text:text});
}



ClientConnector.prototype.logErrorEvent = function (eventID, text) {
	this.instanceEmit('events-error', {sender: this, component:'ClientConnector', eventID:eventID, text:text});
}



ClientConnector.prototype.logCriticalEvent = function (eventID, text) {
	this.instanceEmit('events-critical', {sender: this, component:'ClientConnector', eventID:eventID, text:text});
}



module.exports = ClientConnector;
