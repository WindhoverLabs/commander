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

var Parser = require( "binary-parser" ).Parser;
const net = require( 'net' );
const Emitter = require( 'events' );
var fs = require( 'fs' );
const util = require( 'util' );
var mergeJSON = require( 'merge-json' );
var convict = require( 'convict' );
var path = require( 'path' );
var config = require( './config.js' );
var jp = require( 'jsonpath' );

/**
 * Event id's
 * @type {Object}
 */
var EventEnum = Object.freeze( {
  'INITIALIZED': 1,
  'OPS_PATH_NOT_FOUND': 2,
  'MSG_ID_NOT_FOUND': 3,
  'INVALID_REQUEST': 4,
  'APP_NOT_FOUND': 5,
  'UNKNOWN_DATA_TYPE': 6,
  'UNHANDLED_EXCEPTION': 7,
  'FUNCTION_NOT_IMPLEMENTED': 8,
  'INVALID_COMMAND_ARGUMENTS': 10,
  'COMMAND_DEFINITION': 11,
  'COMMAND_NOT_FOUND': 12
} );

var emit = Emitter.prototype.emit;

exports = module.exports = ConfigDatabase;

/**
 * Count listeners
 * @type {Function}
 */
var listenerCount = Emitter.listenerCount ||
  function( emitter, type ) {
    return emitter.listeners( type ).length
  }

/**
 * Constructor for configuring databse
 * @param       {String} workspace  path to commander workspace
 * @param       {string} configFile path to config-database-config.json
 * @constructor
 */
function ConfigDatabase( workspace, configFile ) {
  var self = this;
  this.defs;
  this.workspace = workspace;
  this.instanceEmitter;

  /* Load environment dependent configuration */
  config.loadFile( configFile );

  /* Perform validation */
  config.validate( {
    allowed: 'strict'
  } );

  var inMsgDefs = config.get( 'msgDefs' );

  for ( var i = 0; i < inMsgDefs.length; ++i ) {
    if ( typeof process.env.AIRLINER_MSG_DEF_PATH === 'undefined' ) {
      var fullPath = path.join( this.workspace, config.get( 'msgDefPath' ), inMsgDefs[ i ].file );
    } else {
      var fullPath = path.join( process.env.AIRLINER_MSG_DEF_PATH, inMsgDefs[ i ].file );
    }
    var msgDefInput = JSON.parse( fs.readFileSync( fullPath, 'utf8' ) );
    this.defs = mergeJSON.merge( this.defs, msgDefInput );
  }
};


/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
ConfigDatabase.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  var self = this;
  this.instanceEmitter = newInstanceEmitter;

  this.instanceEmitter.on( config.get( 'queryConfigStreamID' ), function( query, cb ) {
    var result = jp.query( self.defs, query );
    cb( result );
  } );

  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );
}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 */
ConfigDatabase.prototype.instanceEmit = function( streamID, msg ) {
  this.instanceEmitter.emit( streamID, msg );
}



/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
ConfigDatabase.prototype.__proto__ = Emitter.prototype;


/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ConfigDatabase.prototype.logDebugEvent = function( eventID, text ) {
  this.instanceEmit( 'events-debug', {
    sender: this,
    component: 'ConfigDatabase',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ConfigDatabase.prototype.logInfoEvent = function( eventID, text ) {
  this.instanceEmit( 'events-info', {
    sender: this,
    component: 'ConfigDatabase',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ConfigDatabase.prototype.logErrorEvent = function( eventID, text ) {
  this.instanceEmit( 'events-error', {
    sender: this,
    component: 'ConfigDatabase',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
ConfigDatabase.prototype.logCriticalEvent = function( eventID, text ) {
  this.instanceEmit( 'events-critical', {
    sender: this,
    component: 'ConfigDatabase',
    eventID: eventID,
    text: text
  } );
}