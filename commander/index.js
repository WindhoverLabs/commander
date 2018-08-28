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
var Emitter = require('events');
var fs = require('fs');
const util = require('util');
var protobuf = require('protobufjs');
var mergeJSON = require('merge-json');
var convict = require('convict');
var CommanderInstance = require('./commander_instance.js');
var CommanderApp = require('./commander_app.js');

var emit = Emitter.prototype.emit;
var sparkles = require('sparkles')();

exports = module.exports = Commander;

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

var config = require('./config.js');

const ROOT_INSTANCE_NAME = 'ROOT';

function Commander(configFile) {
    this.instances = {};
    
    /* Load environment dependent configuration */
    config.loadFile(configFile);

    /* Perform validation */
    config.validate({allowed: 'strict'});

    /* Add the root instance. */
    this.addInstance(ROOT_INSTANCE_NAME);
    
    var cfgInstances = config.get('instances');
    
    for(var i = 0; i < cfgInstances.length; ++i) {
		this.instances[cfgInstances[i].name] = new CommanderInstance(this, cfgInstances[i]);
    }
    
    return this;
}


/**
 * Inherits from `EventEmitter`.
 */
Commander.prototype.__proto__ = Emitter.prototype;



Commander.prototype.addApp = function (name, appObj) {
	this.instances[ROOT_INSTANCE_NAME].addApp(name, appObj);
}



Commander.prototype.addInstance = function (name, cb) {
	this.instances[name] = new CommanderInstance(name, this);
	
	if(typeof cb === 'function') {
		cb(this.instances[name]);
	};
}



Commander.prototype.logEvent = function (instance, plugin, component, eventID, criticality, text) {
	/* TODO - Write something more formal, like file logging and filtering. */

	var date = new Date(); 
	var timestamp = date.getTime();
	
	const Bright = "\x1b[1m";
	const Dim = "\x1b[2m";
    const Underscore = "\x1b[4m";
    const Blink = "\x1b[5m";
    const Reverse = "\x1b[7m";
	const Hidden = "\x1b[8m";
		 
	const FgBlack = "\x1b[30m";
	const FgRed = "\x1b[31m";
	const FgGreen = "\x1b[32m";
	const FgYellow = "\x1b[33m";
	const FgBlue = "\x1b[34m";
	const FgMagenta = "\x1b[35m";
	const FgCyan = "\x1b[36m";
	const FgWhite = "\x1b[37m";
		 
	const BgBlack = "\x1b[40m";
	const BgRed = "\x1b[41m";
	const BgGreen = "\x1b[42m";
	const BgYellow = "\x1b[43m";
	const BgBlue = "\x1b[44m";
	const BgMagenta = "\x1b[45m";
	const BgCyan = "\x1b[46m";
	const BgWhite = "\x1b[47m";
	
	var dateString =
	    date.getUTCFullYear() + "/" +
	    ("0" + (date.getUTCMonth()+1)).slice(-2) + "/" +
	    ("0" + date.getUTCDate()).slice(-2) + " " +
	    ("0" + date.getUTCHours()).slice(-2) + ":" +
	    ("0" + date.getUTCMinutes()).slice(-2) + ":" +
	    ("0" + date.getUTCSeconds()).slice(-2);

	switch(criticality) {
	    case 'DEBUG':
	    	console.log(FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + plugin + ' | ' + FgWhite + component + ' | ' + FgWhite + eventID + ' | ' + FgWhite + criticality + ' | ' + FgWhite + text);
	        break;
	        
	    case 'INFO':
	    	console.log(FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + plugin + ' | ' + FgWhite + component + ' | ' + FgWhite + eventID + ' | ' + FgWhite + criticality + ' | ' + FgWhite + text);
	        break;
	        
	    case 'ERROR':
	    	console.log(FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + plugin + ' | ' + FgWhite + component + ' | ' + FgWhite + eventID + ' | ' + FgRed + criticality + ' | ' + FgWhite + text);
	        break;
	        
	    case 'CRIT':
	    	console.log(FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + plugin + ' | ' + FgWhite + component + ' | ' + FgWhite + eventID + ' | ' + BgRed + FgBlack + Blink + criticality + BgBlack + FgWhite + ' | ' + BgRed + FgBlack + Blink + text + BgBlack + FgWhite);
	        break;
	    
	    default:
	    	console.log(FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + plugin + ' | ' + FgWhite + component + ' | ' + FgWhite + eventID + ' | ' + FgMagenta + criticality + ' | ' + FgMagenta + text + FgWhite);
	        break;
	}
}





































