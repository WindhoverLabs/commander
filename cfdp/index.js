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

const Emitter = require( 'events' );
var fs = require( 'fs' );
var convict = require( 'convict' );
var path = require( 'path' );
var cf = require( '../build/Debug/cfdp' );
var config = require( './config.js' );

/**
 * Event id's
 * @type {Object}
 */
var EventEnum = Object.freeze( {
  'INITIALIZED': 1,
  'LOG_EVENTS': 2,
  'PDU_EVENTS': 3,
  'GET_SUMMARY': 4,
  'GET_TRANS_STATUS': 5,
  'MIB_PARAMETERS': 6,
  'REGISTER_CALLBACKS': 7,
  'FUNCTION_NOT_IMPLEMENTED': 8,
  'INVALID_COMMAND_ARGUMENTS': 9,
  'COMMAND_DEFINITION': 10,
  'COMMAND_NOT_FOUND': 11
} );

var emit = Emitter.prototype.emit;

exports = module.exports = CFDP;
/**
 * Count listeners
 * @type {Function}
 */

var listenerCount = Emitter.listenerCount ||
  function( emitter, type ) {
    return emitter.listeners( type ).length
  }

/**
 * Constructor for configuring CFDP Engine
 * @param       {String} workspace  path to commander workspace
 * @param       {string} configFile path to cfdp-config.json
 * @constructor
 */
function CFDP( workspace, configFile ) {
  var self = this;
  this.configObj;
  this.workspace = workspace;
  this.instanceEmitter;

  /* Load environment dependent configuration */
  config.loadFile( configFile );

  /* Perform validation */
  config.validate( {
    allowed: 'strict'
  } );

  this.configObj = config;
};


/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
CFDP.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  var self = this;
  this.instanceEmitter = newInstanceEmitter;

  /* Set CFDP API configuration */
  cf.SetConfig( this.configObj.get( 'config' ) );

  /* Register Required Callbacks */
  cf.RegisterCallbackOn( 'info', ( value ) => {
    this.logInfoEvent( EventEnum.LOG_EVENTS, value );
  } );
  cf.RegisterCallbackOn( 'debug', ( value ) => {
    this.logDebugEvent( EventEnum.LOG_EVENTS, value );
  } );
  cf.RegisterCallbackOn( 'error', ( value ) => {
    this.logErrorEvent( EventEnum.LOG_EVENTS, value );
  } );
  cf.RegisterCallbackOn( 'warning', ( value ) => {
    this.logCriticalEvent( EventEnum.LOG_EVENTS, value );
  } );
  cf.RegisterCallbackOn( 'pduOutputOpen', ( value ) => {
    var op = "Src=" + value.srcValue.join( "." ) + " Dest=" + value.dstValue.join( "." );
    this.logInfoEvent( EventEnum.PDU_EVENTS, op );
  } );
  cf.RegisterCallbackOn( 'pduOutputReady', ( value ) => {
    var op = "Transac=" + value.transSrcValue.join( "." ) + " Dest=" + value.dstValue.join( "." );
    this.logInfoEvent( EventEnum.PDU_EVENTS, op );
  } );
  cf.RegisterCallbackOn( 'pduOutputSend', ( buffer ) => {
    var st = "";
    for ( var i = 0; i < buffer.length; i++ ) {
      if ( i != buffer.length - 1 ) {
        st += "0x" + buffer[ i ].toString( 16 ) + ", ";
      } else {
        st += "0x" + buffer[ i ].toString( 16 );
      }
    }
    this.logInfoEvent( EventEnum.PDU_EVENTS, st );
  } );
  cf.RegisterCallbackOn( 'showTransactionStatus', ( value ) => {
    //	  console.log(value );
  } );
  cf.RegisterCallbackOn( 'indication', ( value ) => {
    //	  console.log(value);
  } );

  /* Init CFDP Engine */
  cf.AppInit();
  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );

  /* Set MIB parmeters */
  var mibParams = this.configObj.get( 'mibParameters' );
  for ( var key in mibParams ) {
    cf.SetMibParams( key, mibParams[ key ] );
  }


  this.instanceEmitter.on( config.get( 'CfdpStreamID' ), function( query, data, cb ) {
    cb( [ query, data ] );
  } );


  // var test_1 = new Buffer( [ 0x04, 0x00, 0x31, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x07, 0x80, 0x00, 0x00, 0x00, 0x0d, 0x16, 0x2f, 0x63, 0x66, 0x2f, 0x64, 0x6f, 0x77, 0x6e, 0x6c, 0x6f, 0x61, 0x64, 0x2f, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x2e, 0x74, 0x78, 0x74, 0x13, 0x63, 0x66, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6e, 0x67, 0x2f, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x2e, 0x74, 0x78, 0x74 ] );
  // var test_2 = new Buffer( [ 0x14, 0x00, 0x11, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x00, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0x0a ] );
  // var test_3 = new Buffer( [ 0x04, 0x00, 0x0a, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x04, 0x00, 0x33, 0xf2, 0x47, 0xfc, 0x00, 0x00, 0x00, 0x0d ] );
  //
  //
  //
  // cf.StartCycle();
  //
  // cf.GivePdu( test_1, test_1.length );
  // cf.GivePdu( test_2, test_2.length );
  // cf.GivePdu( test_3, test_3.length );
  //
  // setTimeout( () => {
  //
  //   cf.RequestPdu( 1, "0.22", "/tmp/src/hello.txt", "cftesting/" );
  //
  // }, 5000 );
  //
  //
  //
  //
  //
  // // console.log( cf.GetSummaryStatus() );
  // // console.log( cf.GetIdFromString( "0.29" ) );
  // // cf.GetTransactionStatus( 1, 2, new Buffer( [ 0, 23 ] ) );
  // // console.log( "**************", cf.GetMibParams( "NAK_TIMEOUT" ) );
  // // console.log( "**************", cf.GetMibParams( "NAK_LIMIT" ) );
  //
  // setTimeout( () => {
  //   cf.StopCycle();
  // }, 15000 );
}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 */
CFDP.prototype.instanceEmit = function( streamID, msg ) {
  this.instanceEmitter.emit( streamID, msg );
}


/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
CFDP.prototype.__proto__ = Emitter.prototype;


/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
CFDP.prototype.logDebugEvent = function( eventID, text ) {
  this.instanceEmit( 'events-debug', {
    sender: this,
    component: 'CFDP',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
CFDP.prototype.logInfoEvent = function( eventID, text ) {
  this.instanceEmit( 'events-info', {
    sender: this,
    component: 'CFDP',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
CFDP.prototype.logErrorEvent = function( eventID, text ) {
  this.instanceEmit( 'events-error', {
    sender: this,
    component: 'CFDP',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
CFDP.prototype.logCriticalEvent = function( eventID, text ) {
  this.instanceEmit( 'events-critical', {
    sender: this,
    component: 'CFDP',
    eventID: eventID,
    text: text
  } );
}