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
var dot = require('dot-object');
var Long = require('long');
const dgram = require( 'dgram' );

/**
 * Event id's
 * @type {Object}
 */
var EventEnum = Object.freeze({
	'INITIALIZED' : 1,
	'OPS_PATH_NOT_FOUND' : 2,
	'MSG_OPS_PATH_NOT_FOUND' : 3,
	'MSG_DEF_NOT_FOUND' : 4,
	'APP_NOT_FOUND' : 5
});

var emit = Emitter.prototype.emit;

exports = module.exports = ArtNetSim;

exports.events = [ 'connect', 'close', 'error' ];

/**
 * Count listeners
 * @type {Function}
 */
var listenerCount = Emitter.listenerCount || function(emitter, type) {
	return emitter.listeners(type).length
}

/**
 * Generates an array of paths of files that are located in the
 * base directory which matches the extention passed into parameters.
 * @param  {String} base   base directory path
 * @param  {String} ext    file extention
 * @param  {Object} files  file read object or undefined
 * @param  {Object} result empty array or undefined
 * @return {Object}        array of matching paths
 */
function recFindByExt(base, ext, files, result) {
	files = files || fs.readdirSync(base)
	result = result || []

	files
			.forEach(function(file) {
				var newbase = path.join(base, file)
				if (fs.statSync(newbase).isDirectory()) {
					result = recFindByExt(newbase, ext,
							fs.readdirSync(newbase), result)
				} else {
					if (file.substr(-1 * (ext.length + 1)) == '.' + ext) {
						result.push(newbase)
					}
				}
			})
	return result
}

/**
 * Constructor for protobuf encoder
 * @param       {String} workspace  path to workspace
 * @param       {String} configFile path to protobuf-encoder-config.json
 * @constructor
 */
function ArtNetSim(workspace, configFile) {
	this.parsers = {};
	this.instanceEmitter;
	this.defs = {};
	this.workspace = workspace;
    this.subscribers = [];
	this.listener = dgram.createSocket( 'udp4' );
	this.sender = dgram.createSocket( 'udp4' );

	/* Load environment dependent configuration */
	config.loadFile(configFile);

	/* Perform validation */
	config.validate({
		allowed : 'strict'
	});

//	this.ccsdsPriHdr = new Parser().endianess('big').bit3('version').bit1(
//			'pktType').bit1('secHdr').bit11('apid').bit2('segment').bit14(
//			'sequence').uint16('length');
//
//	this.ccsdsCmdSecHdr = new Parser().endianess('little').bit1('reserved')
//			.bit7('code').uint8('checksum');
//
//	switch (config.get('CFE_SB_PACKET_TIME_FORMAT')) {
//	case 'CFE_SB_TIME_32_16_SUBS':
//		this.ccsdsTlmSecHdr = new Parser().endianess('little')
//				.uint32('seconds').uint16('subseconds');
//		this.tlmHeaderLength = 96;
//		break;
//
//	case 'CFE_SB_TIME_32_32_SUBS':
//		this.ccsdsTlmSecHdr = new Parser().endianess('little')
//				.uint32('seconds').uint32('subseconds');
//		this.tlmHeaderLength = 98;
//		break;
//
//	case 'CFE_SB_TIME_32_32_M_20':
//		this.ccsdsTlmSecHdr = new Parser().endianess('little')
//				.uint32('seconds').uint32('subseconds');
//		this.tlmHeaderLength = 98;
//		break;
//
//	default:
//		break;
//	}
//
//	this.ccsds = new Parser().endianess('little').nest('PriHdr', {
//		type : this.ccsdsPriHdr
//	}).choice('SecHdr', {
//		tag : 'PriHdr.pktType',
//		choices : {
//			0 : this.ccsdsTlmSecHdr,
//			1 : this.ccsdsCmdSecHdr
//		}
//	}).buffer('payload', {
//		readUntil : 'eof'
//	});
};

/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
ArtNetSim.prototype.setInstanceEmitter = function(newInstanceEmitter) {
	var self = this;
	this.instanceEmitter = newInstanceEmitter;
//	var inMsgDefs = config.get('msgDefs')

//	for (var i = 0; i < inMsgDefs.length; ++i) {
//		if (typeof process.env.AIRLINER_MSG_DEF_PATH === 'undefined') {
//			var fullPath = path.join(this.workspace, config.get('msgDefPath'),
//					inMsgDefs[i].file);
//		} else {
//			console.log()
//			var fullPath = path.join(process.env.AIRLINER_MSG_DEF_PATH,
//					inMsgDefs[i].file);
//		}
//
//		var msgDefInput = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
//		this.defs = mergeJSON.merge(this.defs, msgDefInput);
//	}
	
    this.instanceEmitter.on( config.get( 'binaryInputStreamID' ), function( buffer ) {
        var id = buffer.toString( 'utf8', 0, 7);
	    if(id === 'Art-Net') {
	    	var opCode = buffer.readUInt16LE(8);
	    	var protVer = buffer.readUInt16BE(10);
	    	
	    	if(protVer !== 14) {
	    		console.log('Protocol version ' + protVer + ' unsupported.');
	    	}
	    	
	    	//var talkToMe = buffer.readUInt8(12); 
	    	
	    	switch(opCode) {
	    		case 0x2000:
	    			/* OpPoll */
	    			console.log('OpPoll not supported');
	    			break;
	    			
	    		case 0x2100:
	    			/* OpPollReply */
	    			console.log('OpPollReply not supported');
	    			break;
	    			
	    		case 0x2300:
	    			/* OpDiagData */
	    			console.log('OpDiagData not supported');
	    			break;
	    			
	    		case 0x2400:
	    			/* OpCommand */
	    			console.log('OpCommand not supported');
	    			break;
	    			
	    		case 0x5000:
	    			/* OpOutput / OpDmx */
	    	    	var sequence = buffer.readUInt8(12);
	    	    	var physical = buffer.readUInt8(13);
	    	    	var universe = buffer.readUInt16LE(14);
	    	    	var length   = buffer.readUInt16BE(16);
	    	    	var dmxChannel = new Array(length);
	    	    	
    	            for ( var i = 0; i < length; ++i ) {
    	            	dmxChannel[i] = buffer.readUInt8( 18 + i );
	    	        }
    	            
                    for(var idxSubs = 0; idxSubs < self.subscribers.length; idxSubs++) {                    	
                    	var idxPhysical = self.getPhysicalIDFromPath(self.subscribers[idxSubs].opsPath);
                    	var idxUniverse = self.getUniverseIDFromPath(self.subscribers[idxSubs].opsPath);
                    	
                    	if(physical == idxPhysical) {
                    		if(universe == idxUniverse) {
                            	var sample = {};
                            	sample[self.subscribers[idxSubs].opsPath] = {sample:[{value: dmxChannel, msgTime: Date(), gndTime: Date()}]};

                                self.subscribers[idxSubs].cb(sample);
                    		}
                    	}
                    }

	    			break;
	    			
	    		case 0x5100:
	    			/* OpNzs */
	    			console.log('OpNzs not supported');
	    			break;
	    			
	    		case 0x5200:
	    			/* OpSync */
	    			console.log('OpSync not supported');
	    			break;
	    			
	    		case 0x6000:
	    			/* OpAddress */
	    			console.log('OpAddress not supported');
	    			break;
	    			
	    		case 0x7000:
	    			/* OpInput */
	    			console.log('OpInput not supported');
	    			break;
	    			
	    		case 0x8000:
	    			/* OpTodRequest */
	    			console.log('OpTodRequest not supported');
	    			break;

	    		case 0x8100:
	    			/* OpTodData */
	    			console.log('OpTodData not supported');
	    			break;
	    			
	    		case 0x8200:
	    			/* OpTodControl */
	    			console.log('OpTodControl not supported');
	    			break;
	    			
	    		case 0x8300:
	    			/* OpRdm */
	    			console.log('OpRdm not supported');
	    			break;
	    			
	    		case 0x8400:
	    			/* OpRdmSub */
	    			console.log('OpRdmSub not supported');
	    			break;
	    			
	    		case 0xa010:
	    			/* OpVideoSetup */
	    			console.log('OpVideoSetup not supported');
	    			break;
	    			
	    		case 0xa020:
	    			/* OpVideoPalette */
	    			console.log('OpVideoPalette not supported');
	    			break;
	    			
	    		case 0xa040:
	    			/* OpVideoData */
	    			console.log('OpVideoData not supported');
	    			break;
	    			
	    		case 0xf000:
	    			/* OpMacMaster */
	    			console.log('OpMacMaster not supported');
	    			break;
	    			
	    		case 0xf100:
	    			/* OpMacSlave */
	    			console.log('OpMacSlave not supported');
	    			break;
	    			
	    		case 0xf200:
	    			/* OpFirmwareMaster */
	    			console.log('OpFirmwareMaster not supported');
	    			break;

	    		case 0xf300:
	    			/* OpFirmwareReply */
	    			console.log('OpFirmwareReply not supported');
	    			break;
	    			
	    		case 0xf400:
	    			/* OpFileTnMaster */
	    			console.log('OpFileTnMaster not supported');
	    			break;
	    			
	    		case 0xf500:
	    			/* OpFileFnMaster */
	    			console.log('OpFileFnMaster not supported');
	    			break;
	    			
	    		case 0xf600:
	    			/* OpFileFnReply */
	    			console.log('OpFileFnReply not supported');
	    			break;
	    			
	    		case 0xf800:
	    			/* OpIpProg */
	    			console.log('OpIpProg not supported');
	    			break;
	    			
	    		case 0xf900:
	    			/* OpIpProgReply */
	    			console.log('OpIpProgReply not supported');
	    			break;
	    			
	    		case 0x9000:
	    			/* OpMedia */
	    			console.log('OpMedia not supported');
	    			break;
	    			
	    		case 0x9100:
	    			/* OpMediaPatch */
	    			console.log(' not supported');
	    			break;
	    			
	    		case 0x9200:
	    			/* OpMediaControl */
	    			console.log('OpMediaControl not supported');
	    			break;
	    			
	    		case 0x9300:
	    			/* OpMediaContrlReply */
	    			console.log('OpMediaContrlReply not supported');
	    			break;
	    			
	    		case 0x9700:
	    			/* OpTimeCode */
	    			console.log('OpTimeCode not supported');
	    			break;
	    			
	    		case 0x9800:
	    			/* OpTimeSync */
	    			console.log('OpTimeSync not supported');
	    			break;
	    			
	    		case 0x9900:
	    			/* OpTrigger */
	    			console.log('OpTrigger not supported');
	    			break;
	    			
	    		case 0x9a00:
	    			/* OpDirectory */
	    			console.log('OpDirectory not supported');
	    			break;
	    			
	    		case 0x9b00:
	    			console.log('OpDirectoryReply not supported');
	    			/* OpDirectoryReply */
	    			break;
	    	}
	    }
	} );

    this.instanceEmitter.on( config.get( 'reqSubscribeStreamID' ), function( req, cb ) {
        if ( req.cmd === 'subscribe' ) {
            if ( typeof req.opsPath === 'string' || req.opsPath instanceof String ) {
            	if(self.getAppNameFromPath(req.opsPath) === 'ANS') {
                    self.subscribers.push({opsPath: req.opsPath, cb: cb});
            	}
            } else if ( Array.isArray( req.opsPath ) ) {
                for ( var i = 0; i < req.opsPath.length; ++i ) {
                	if(self.getAppNameFromPath(req.opsPath[i]) === 'ANS') {
                	    self.subscribers.push({opsPath: req.opsPath[i], cb: cb} );
                	}
                }
            } else {
                self.logErrorEvent( EventEnum.INVALID_SUBSCRIPTION_REQUEST, 'Subscription request invalid. \'' + req + '\'' );
            }
        } else if ( req.cmd === 'unsubscribe' ) {
            if ( typeof req.opsPath === 'string' || req.opsPath instanceof String ) {
                self.removeSubscriber( req, cb );
            } else if ( Array.isArray( req.opsPath ) ) {
                for ( var i = 0; i < req.opsPath.length; ++i ) {
                    self.removeSubscriber( req.opsPath[ i ], cb );
                }
            } else {
                self.logErrorEvent( EventEnum.INVALID_SUBSCRIPTION_REQUEST, 'Subscription request invalid. \'' + req + '\'' );
            }
        }
        console.log(req);
    } );

//	this.instanceEmitter.on(config.get('jsonInputStreamID'), function(message) {
//		var tlmDef = self.getTlmDefByPath(message.opsPath);
		
		//console.log(message);

//		if (typeof tlmDef === 'undefined') {
//			/* TODO */
//		} else {
//			var msgDef = self.getMsgDefByName(tlmDef.airliner_msg);
//
//			if (typeof msgDef === 'undefined') {
//				/* TODO */
//			} else {
//			    this.sender.send( buffer, message, this.config.get( 'outPort' ), this.config.get( 'outAddress' ) );
//				if (msgDef.hasOwnProperty('proto_root')) {
//					var symbolName = self
//							.getSymbolNameFromOpsPath(message.opsPath);
//					var msgID = tlmDef.airliner_mid;
//
//					if (typeof symbolName !== 'undefined') {
//
//						var pbMsgDef = msgDef.proto_root.lookupType(symbolName	+ '_pb');
//						var pbMsg = pbMsgDef.create(message.content);
//
//						var pbBuffer = pbMsgDef.encode(pbMsg).finish();
//
//						var hdrBuffer = new Buffer(12)
//						hdrBuffer.writeUInt16BE(msgID, 0);
//						hdrBuffer.writeUInt16BE(1, 2);
//						hdrBuffer.writeUInt16BE(pbBuffer.length - 1, 4);
//						hdrBuffer.writeUInt16BE(0, 6);
//						hdrBuffer.writeUInt16BE(0, 8);
//						hdrBuffer.writeUInt16BE(0, 10);
//
//						var msgBuffer = Buffer.concat([ hdrBuffer, pbBuffer ]);
//						self.instanceEmit(config.get('binaryOutputStreamID'),
//								msgBuffer);
//					}
//				}
//			}
//		}
//	});

	this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}

/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 */
ArtNetSim.prototype.instanceEmit = function(streamID, msg) {
	if (typeof this.instanceEmitter === 'object') {
		this.instanceEmitter.emit(streamID, msg);
	} else {
		console.log('--- ' + msg.component + ', ' + msg.eventID + ', '
				+ msg.text);
	}
}

/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
ArtNetSim.prototype.__proto__ = Emitter.prototype;

/**
 * Gets telemetry operations path from full telemetry path
 * @param  {String} opsPath telemetry path
 * @return {String}         telemetry operation path
 */
ArtNetSim.prototype.getMsgOpsPathFromFullOpsPath = function(opsPath) {
	var appName = this.getAppNameFromPath(opsPath);
	var opName = this.getOperationFromPath(opsPath);

	var msgOpsPath = '/' + appName + '/' + opName;

	return msgOpsPath;
}

/**
 * Gets telemetry symbol name from operation path
 * @param  {String} opsPath operation path
 * @return {string}         symbol name
 */
ArtNetSim.prototype.getSymbolNameFromOpsPath = function(opsPath) {
	var msgOpsPath = this.getMsgOpsPathFromFullOpsPath(opsPath);

	if (typeof msgOpsPath === 'undefined') {
		this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND,
				'getSymbolNameFromOpsPath: Ops path not found.');
	} else {
		var msgDef = this.getTlmDefByPath(msgOpsPath);

		if (typeof msgDef === 'undefined') {
			this.logErrorEvent(EventEnum.MSG_OPS_PATH_NOT_FOUND,
					'getSymbolNameFromOpsPath: Message ops path not found.');
			return undefined;
		} else {
			return msgDef.airliner_msg;
		}
	}
}

/**
 * Adds operation paths to passed json
 * @param  {Object} inJSON input json
 * @return {Object}        output json
 */
ArtNetSim.prototype.convertJsonToProtoJson = function(inJSON) {
	var outJSON = {};

	for ( var itemID in inJSON) {
		var msgOpsPath = this.getMsgOpsPathFromFullOpsPath(itemID);

		var updatedItemID = itemID.replace(msgOpsPath + '/', '');
		updatedItemID = updatedItemID.replace('/', '.');

		outJSON[updatedItemID] = inJSON[itemID].value;
	}

	dot.object(outJSON);

	return outJSON;
}

/**
 * Gets message definition by message name
 * @param  {String} msgName message nsme
 * @return {Object}         message definition
 */
ArtNetSim.prototype.getMsgDefByName = function(msgName) {
	for ( var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		for ( var protoID in app.proto_msgs) {
			var protomsg = app.proto_msgs[protoID];
			if (protoID == msgName) {
				return protomsg;
			}
		}
	}
}

/**
 * Parses protobuf file and get schema specific protobuf object
 * @param  {String} filePath protobuf file path
 */
ArtNetSim.prototype.parseProtoFile = function(filePath) {
	var self = this;

	var fileName = filePath.replace(/^.*[\\\/]/, '');
	var structureName = fileName.replace(/\.[^/.]+$/, '');

	var msgDef = this.getMsgDefByName(structureName);

	if (typeof msgDef === 'undefined') {
		this.logErrorEvent(EventEnum.MSG_DEF_NOT_FOUND, 'parseProtoFile (\''
				+ filePath + '\'): Message definition not found. \''
				+ structureName + '\'.');
	} else {
		msgDef.proto_root = new protobuf.Root();

		protobuf.loadSync(filePath, msgDef.proto_root);
	}
}

/**
 * Parse and return app name
 * @param  {String} path telemetry path
 * @return {String}      App name
 */
ArtNetSim.prototype.getAppNameFromPath = function(path) {
	var splitName = path.split('/');
	return splitName[1];
}

/**
 * Parse and return operation name
 * @param  {String} path telemetry path
 * @return {String}      Operation name
 */
ArtNetSim.prototype.getOperationFromPath = function(path) {
	var splitName = path.split('/');
	return splitName[2];
}

ArtNetSim.prototype.getPhysicalIDFromPath = function(path) {
	var operation = this.getOperationFromPath(path);
	
	var splitName = operation.split('.');
	
	if(splitName[0].startsWith('physical')) {
		var idxPhysical = parseInt(splitName[0].substring(splitName[0].length-1, 9));
	}

	console.log(idxPhysical);
	return idxPhysical
}

ArtNetSim.prototype.getUniverseIDFromPath = function(path) {
	var operation = this.getOperationFromPath(path);
	
	var splitName = operation.split('.');
	
	if(splitName[1].startsWith('universe')) {
		var idxUniverse = parseInt(splitName[1].substring(splitName[1].length-1, 9));
	}
	
	return idxUniverse
}

/**
 * Gets application definition by application name
 * @param  {String} appName application name
 * @return {Object}         application definition object
 */
ArtNetSim.prototype.getAppDefinition = function(appName) {
	for ( var appID in this.defs.Airliner.apps) {
		var app = this.defs.Airliner.apps[appID];
		if (app.app_name == appName) {
			return app;
		}
	}
}

/**
 * Gets message definition by telemetry path name
 * @param  {String} path telemetry path name
 * @return {Object}      telemetry definition object
 */
ArtNetSim.prototype.getMsgDefByPath = function(path) {
	var tlmDef = this.getTlmDefByPath(path);

	if (typeof tlmDef === 'undefined') {
		this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND,
				'getMsgDefByPath:  Ops path not found. \'' + path + '\'.');
		return undefined;
	} else {
		return tlmDef.airliner_msg;
	}
}

/**
 * Gets telemetry definition by path name
 * @param  {String} path telemetry path name
 * @return {Object}      telemetry definition object
 */
ArtNetSim.prototype.getTlmDefByPath = function(path) {
	var appName = this.getAppNameFromPath(path);
	if (typeof appName === 'undefined') {
		this.logErrorEvent(EventEnum.APP_NOT_FOUND,
				'getTlmDefByPath:  App not found in path. \'' + path + '\'.');
	} else {
		var operationName = this.getOperationFromPath(path);
		if (typeof operationName === 'undefined') {
			this.logErrorEvent(EventEnum.OPS_PATH_NOT_FOUND,
					'getTlmDefByPath:  Ops path not found. \'' + path + '\'.');
			return undefined;
		} else {
			var appDefinition = this.getAppDefinition(appName);

			if (typeof appDefinition === 'undefined') {
				this
						.logErrorEvent(EventEnum.APP_NOT_FOUND,
								'getTlmDefByPath:  App not found. \'' + appName
										+ '\'.');
				return undefined;
			} else {
				return appDefinition.operations[operationName];
			}
		}
	}
}

/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ArtNetSim.prototype.logDebugEvent = function(eventID, text) {
	this.instanceEmit('events-debug', {
		sender : this,
		component : 'PE',
		eventID : eventID,
		text : text
	});
}

/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ArtNetSim.prototype.logInfoEvent = function(eventID, text) {
	this.instanceEmit('events-info', {
		sender : this,
		component : 'PE',
		eventID : eventID,
		text : text
	});
}

/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ArtNetSim.prototype.logErrorEvent = function(eventID, text) {
	this.instanceEmit('events-error', {
		sender : this,
		component : 'PE',
		eventID : eventID,
		text : text
	});
}

/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ArtNetSim.prototype.logCriticalEvent = function(eventID, text) {
	this.instanceEmit('events-critical', {
		sender : this,
		component : 'PE',
		eventID : eventID,
		text : text
	});
}