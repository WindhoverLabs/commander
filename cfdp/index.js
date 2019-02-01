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
  'COMMAND_NOT_FOUND': 11,
  'MAKE_DIR': 12,
  'MAKE_FILE': 13
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


function stringGen( len ) {
  var text = "";

  var charset = "abcdefghijklmnopqrstuvwxyz0123456789 \n\r";

  for ( var i = 0; i < len; i++ )
    text += charset.charAt( Math.floor( Math.random() * charset.length ) );

  return text;
}

/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
CFDP.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  var self = this;
  this.instanceEmitter = newInstanceEmitter;
  this.bufferCollection = [];

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

  cf.RegisterCallbackOn( 'pduOutputSend', ( bufferObj ) => {
    var buffer = new Buffer( 512 );
    buffer.fill( 0x00 );
    buffer.writeUInt16BE( 4093, 0 );
    buffer.writeUInt16BE( 1, 2 );
    buffer.writeUInt16BE( 512 - 7, 4 );
    buffer.writeUInt8( 27, 6 );
    buffer.writeUInt8( 0, 7 );

    /* PDU Header */
    // buffer1.writeUInt8( buffer[ 0 ], 12 );
    //
    // buffer1.writeUInt8( buffer[ 2 ], 13 );
    // buffer1.writeUInt8( buffer[ 1 ], 14 );
    //
    // buffer1.writeUInt8( buffer[ 3 ], 15 );
    //
    // buffer1.writeUInt8( buffer[ 5 ], 16 );
    // buffer1.writeUInt8( buffer[ 4 ], 17 );
    //
    // buffer1.writeUInt8( buffer[ 9 ], 18 );
    // buffer1.writeUInt8( buffer[ 8 ], 19 );
    // buffer1.writeUInt8( buffer[ 7 ], 20 );
    // buffer1.writeUInt8( buffer[ 6 ], 21 );
    //
    // buffer1.writeUInt8( buffer[ 10 ], 22 );
    // buffer1.writeUInt8( buffer[ 11 ], 23 );

    for ( var i = 0; i < bufferObj.length; i++ ) {
      buffer.writeUInt8( bufferObj.pdu[ i ], 12 + i );
    }

    this.instanceEmit( config.get( 'cfdpOutputStream' ), buffer );
    this.logDebugEvent( EventEnum.PDU_EVENTS, buffer );
  } );


  cf.RegisterCallbackOn( 'showTransactionStatus', ( value ) => {
    //	  console.log(value );
  } );
  cf.RegisterCallbackOn( 'indication', ( value ) => {
    //	  console.log(value);
  } );

  /* Init CFDP Engine */
  cf.AppInit();


  /* Set MIB parmeters from config */
  var mibParams = this.configObj.get( 'mibParameters' );
  for ( var key in mibParams ) {
    cf.SetMibParams( key, mibParams[ key ] );
  }


  this.instanceEmitter.on( config.get( 'CfdpClientStreamID' ), function( obj ) {
    var outObj = {
      msg: 'undefined',
      value: undefined
    }

    if ( obj.cb == undefined ) {
      return;
    }

    if ( obj.query.length == 0 ) {
      obj.cb( outObj );
      return;
    }

    switch ( obj.query ) {
      case 'GET_MIB':
        obj.cb( self.GetMibParams( outObj, obj.data ) );
        break;
      case 'SET_MIB':
        obj.cb( self.SetMibParams( outObj, obj.data ) );
        break;
      case 'RESTART_ENGINE':
        obj.cb( self.RestartEngine( outObj, obj.data ) );
        break;
      case 'STOP_ENGINE':
        obj.cb( self.StopEngine( outObj, obj.data ) );
        break;
      case 'SEND_FROM_GND':
        obj.cb( self.SendFromGnd( outObj, obj.data ) );
        break;
      case 'GET_ID_FROM_STR':
        obj.cb( self.GetIdFromString( outObj, obj.data ) );
        break;
      case 'GET_TRANS_STATUS':
        cf.RegisterCallbackOn( 'showTransactionStatus',   obj.cb);
        self.GetTransactionStatus( outObj, obj.data ) ;
        break;
      case 'GET_SUMMARY_STATUS':
        obj.cb( self.GetSummaryStatus( outObj, obj.data ) );
        break;
      default:
        break;
    }
  } );

  this.instanceEmitter.on( config.get( 'cfdpInputStream' ), function( msg ) {
    /* Send buffer to ground cfdp engine */
    cf.GivePdu( msg.payload, msg.payload.length );
  } );

  cf.StartCycle();
  self.TransCycleStarted = true;
  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );
}

CFDP.prototype.GetIdFromString = function( outData, inData ) {
  outData.msg = "FAILIURE";
  if (inData.value.length == 1) {
    if (typeof(inData.value[0]) == "string") {
      outData.msg = "SUCCESS";
      outData.value = cf.GetIdFromString( inData.value[0] );
    }
  }
  return outData;
}

CFDP.prototype.GetTransactionStatus = function( outData, inData ) {
  outData.msg = "SUCCESS";
  outData.value = cf.GetTransactionStatus( 1, 2, new Buffer( [ 0, 24 ] ));
  return outData;
}

CFDP.prototype.GetSummaryStatus = function( outData, inData ) {
  outData.msg = "SUCCESS";
  outData.value = cf.GetSummaryStatus();
  return outData;
}

CFDP.prototype.RestartEngine = function( outData, inData ) {
  var self = this;
  if ( !self.TransCycleStarted ) {
    cf.StopCycle();
    cf.StartCycle();
    outData.msg = "SUCCESS";
    self.TransCycleStarted = true;
  } else {
    outData.msg = "FAILIURE";
  }
  return outData;
}

CFDP.prototype.StopEngine = function( outData, inData ) {
  cf.StopCycle();
  self.TransCycleStarted = false;
  outData.msg = "SUCCESS";
  return outData;
}

CFDP.prototype.SetMibParams = function( outData, inData ) {
  if ( inData.value.length == 2 ) {
    if ( typeof( inData.value[ 0 ] ) == 'string' & typeof( inData.value[ 1 ] ) == 'string' ) {
      cf.SetMibParams( inData.value[ 0 ], inData.value[ 1 ] );
      outData.msg = "SUCCESS";
    }
  }
  return outData;
}

CFDP.prototype.GetMibParams = function( outData, inData ) {
  if ( inData.value.length == 1 ) {
    if ( typeof( inData.value[ 0 ] ) == 'string' ) {

      outData.msg = "SUCCESS";
      outData.value = cf.GetMibParams( inData.value[ 0 ] );
    }
  }
  return outData;
}

CFDP.prototype.SendFromGnd = function( outData, inData ) {
  if ( inData.value.length == 4 ) {
    if ( inData.value[ 0 ] <= 2 & typeof( inData.value[ 1 ] ) == 'string' & typeof( inData.value[ 2 ] ) == 'string' & typeof( inData.value[ 3 ] ) == 'string' ) {
      cf.RequestPdu( inData.value[ 0 ], inData.value[ 1 ], inData.value[ 2 ], inData.value[ 3 ] );
      outData.msg = "SUCCESS";
    }
  }
  return outData;
}

var originPath = "/tmp/orgn";
var destPath = "cftesting/";
var numberOfFiles = 3;
var fileSizes = [ "b", "kb" ];




CFDP.prototype.CreateTestCases = function() {
  var fileCount = 0
  while ( fileCount < numberOfFiles ) {

    if ( fs.existsSync( originPath ) ) {

      if ( fileCount == 0 ) {
        fs.readdir( originPath, ( err, files ) => {
          if ( err ) throw err;

          for ( const file of files ) {
            fs.unlink( path.join( originPath, file ), err => {
              // if ( err ) throw err;
            } );
          }
        } );
      }

      var fileContent = "";
      var fileSize = 0;
      var fileCapacity = fileSizes[ Math.floor( Math.random() * fileSizes.length ) ];
      var maxFileSize = 5;
      var tempStr = "";
      var genName = "";

      if ( fileCapacity == "b" ) {
        maxFileSize = Math.floor( Math.random() * 900 )
      }

      if ( fileCapacity == "kb" ) {
        maxFileSize = Math.floor( Math.random() * ( 900 * 1000 ) )
      }


      while ( fileSize < maxFileSize ) {
        tempStr = stringGen( Math.floor( Math.random() * 15 ) ) + " ";
        fileSize += tempStr.length;
        fileContent += tempStr

      }
      genName = originPath + "/" + fileCapacity + "_" + fileSize + "_" + fileCapacity + ".txt";

      if ( genName != "" ) {
        fs.writeFile( genName, fileContent, ( err ) => {
          if ( err ) {
            this.logErrorEvent( EventEnum.MAKE_FILE, 'The file failed to save!' );
          } else {
            this.logInfoEvent( EventEnum.MAKE_FILE, 'The file was succesfully saved!' );
          }

        } );
      }


      fileCount += 1
    } else {
      fs.mkdir( originPath, {
        recursive: true
      }, ( err ) => {
        if ( err ) {
          this.logErrorEvent( EventEnum.MAKE_DIR, 'Failed to make directory `' + originPath + '`' );
          fileCount = numberOfFiles;
        }
      } );
    }
  }
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
