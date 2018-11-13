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

const net = require( 'net' );
var events = require( 'events' );
const Emitter = require( 'events' ).EventEmitter;
var convict = require( 'convict' );
const dgram = require( 'dgram' );
var convict = require( 'convict' );

/**
 * Event id's
 * @type {Object}
 */
var EventEnum = Object.freeze( {
  'INITIALIZED': 1,
  'UDP_ERROR': 2,
  'UDP_CONNECTOR_LISTENING': 3
} );

var emit = Emitter.prototype.emit;

exports.events = [];

/**
 * Count listeners
 * @type {Function}
 */
var listenerCount = Emitter.listenerCount ||
  function( emitter, type ) {
    return emitter.listeners( type ).length
  }

/**
 * Constructor for UdpStdProvider
 * @param       {String} configFile path to UdpStdProvider-config.json
 * @constructor
 */
function UdpStdProvider( configFile ) {
  this.listener = dgram.createSocket( 'udp4' );
  this.sender = dgram.createSocket( 'udp4' );

  /**
   * Define varibale server schema
   * @type {Object}
   */
  this.config = convict( {
    env: {
      doc: 'The application environment.',
      format: [ 'production', 'development', 'test' ],
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
  } );

  /* Load environment dependent configuration */
  this.config.loadFile( configFile );

  /* Perform validation */
  this.config.validate( {
    allowed: 'strict'
  } );

  this.inputStreamID = this.config.get( 'inputStreamID' );
  this.outputStreamID = this.config.get( 'outputStreamID' );

  this.listener.on( 'error', ( err ) => {
    this.logCriticalEvent( EventEnum.UDP_ERROR, `UDP connector error:\n${err}.` );
    // server.close(); // server not defined here
  } );

  this.listener.on( 'listening', () => {
    const address = this.listener.address();
    this.logInfoEvent( EventEnum.UDP_CONNECTOR_LISTENING, `UDP connector listening ${address.address}:${address.port}` );
  } );
};


/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
UdpStdProvider.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  this.instanceEmitter = newInstanceEmitter;
  var self = this;

  this.listener.on( 'message', ( msg, rinfo ) => {
    self.instanceEmitter.emit( self.config.get( 'outputStreamID' ), msg );
  } );

  this.instanceEmitter.on( this.config.get( 'inputStreamID' ), function( buffer ) {
    self.sender.send( buffer, 0, buffer.length, self.config.get( 'outPort' ), self.config.get( 'outAddress' ) );
  } );

  this.listener.bind( this.config.get( 'inPort' ) );

  this.logInfoEvent( EventEnum.INITIALIZED, `Starting binary UDP listener on port ${this.config.get('inPort')}` );
}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 */
UdpStdProvider.prototype.instanceEmit = function( streamID, msg ) {
  this.instanceEmitter.emit( streamID, msg );
}

/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
UdpStdProvider.prototype.__proto__ = Emitter.prototype;

/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
UdpStdProvider.prototype.logDebugEvent = function( eventID, text ) {
  this.instanceEmit( 'events-debug', {
    sender: this,
    component: 'UdpStdProvider',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
UdpStdProvider.prototype.logInfoEvent = function( eventID, text ) {
  this.instanceEmit( 'events-info', {
    sender: this,
    component: 'UdpStdProvider',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
UdpStdProvider.prototype.logErrorEvent = function( eventID, text ) {
  this.instanceEmit( 'events-error', {
    sender: this,
    component: 'UdpStdProvider',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
UdpStdProvider.prototype.logCriticalEvent = function( eventID, text ) {
  this.instanceEmit( 'events-critical', {
    sender: this,
    component: 'UdpStdProvider',
    eventID: eventID,
    text: text
  } );
}


exports = module.exports = UdpStdProvider;