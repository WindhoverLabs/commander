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
  'MAKE_FILE': 13,
  'IMPROPER_REQ': 14
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

  /* Load environment dependent configuration */
  config.loadFile( configFile );
  /* Perform validation */
  config.validate( {
    allowed: 'strict'
  } );
  /* Make it accessable by this instance's members */
  this.config = config;

  /* test kit */
  this.testkit = {}
  this.testkit.originPath = "/tmp/orgn";
  this.testkit.destPath = "/cf/log/";
  this.testkit.numberOfFilesGenerated = 3;
  this.testkit.fileSizeSpectrum = [ "b", "kb" ];
  this.testkit.genFileList = [];

};



/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
CFDP.prototype.setInstanceEmitter = function( newInstanceEmitter ) {

  var self = this;
  this.instanceEmitter = newInstanceEmitter;
  this.outGoingFileChunkSize = parseInt( this.config.get( 'mibParameters' )[ 'OUTGOING_FILE_CHUNK_SIZE' ] ) + 100;

  /* Set CFDP API configuration */
  cf.SetConfig( this.config.get( 'config' ) );

  /* Register Required Callbacks */
  /* End users may not be able to alter following callbacks */
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
    this.logInfoEvent( EventEnum.LOG_EVENTS, value );
  } );

  cf.RegisterCallbackOn( 'pduOutputOpen', () => {} );
  cf.RegisterCallbackOn( 'pduOutputReady', () => {} );
  cf.RegisterCallbackOn( 'indication', () => {} );


  cf.RegisterCallbackOn( 'pduOutputSend', ( bufferObj ) => {


    var buffer = new Buffer( self.outGoingFileChunkSize );
    buffer.fill( 0x00 );
    /* CCSDS MSG ID for sending pdu to space - 4093*/
    buffer.writeUInt16BE( 4093, 0 );
    /* Sequence Number */
    buffer.writeUInt16BE( 1, 2 );
    /* Pdu length*/
    buffer.writeUInt16BE( self.outGoingFileChunkSize - 7, 4 );
    /* Has no command code and sub code */
    buffer.writeUInt8( 0, 6 );
    buffer.writeUInt8( 0, 7 );

    /* Copy buffer */
    for ( var i = 0; i < bufferObj.length; i++ ) {
      buffer.writeUInt8( bufferObj.pdu[ i ], 12 + i );
    }

    this.instanceEmit( config.get( 'cfdpOutputStream' ), buffer );
    this.logDebugEvent( EventEnum.PDU_EVENTS, buffer );

  } );

  /* Init CFDP Engine */
  cf.AppInit();

  /* Set MIB parmeters from default config */
  var mibParams = this.config.get( 'mibParameters' );
  for ( var key in mibParams ) {
    cf.SetMibParams( key, mibParams[ key ] );
  }

  this.instanceEmitter.on( config.get( 'CfdpClientStreamID' ), function( obj ) {
    self.handleClientRequest( obj );
  } );

  this.instanceEmitter.on( config.get( 'cfdpInputStream' ), function( msg ) {
    /* Send buffer to ground cfdp engine */
    cf.GivePdu( msg.payload, msg.payload.length );
  } );

  /* Start Cycling Trasactions */
  cf.StartCycle();
  this.TransCycleStarted = true;
  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );
}

CFDP.prototype.handleClientRequest = function( obj ) {
  var self = this;
  var outObj = {
    msg: 'FAILIURE',
    value: undefined
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

    case 'GET_TRANS_STATUS':
      obj.cb( self.GetTransactionStatus( outObj, obj.data ) );
      break;

    case 'GET_SUMMARY_STATUS':
      obj.cb( self.GetSummaryStatus( outObj, obj.data ) );
      break;

    case 'REG_PDU_OPEN_CB':
      if ( obj.cb == undefined ) {
        self.logErrorEvent( EventEnum.IMPROPER_REQ, "No callback found" );
        break;
      }
      cf.RegisterCallbackOn( 'pduOutputOpen', obj.cb );
      break;

    case 'REG_PDU_READY_CB':
      if ( obj.cb == undefined ) {
        self.logErrorEvent( EventEnum.IMPROPER_REQ, "No callback found" );
        break;
      }
      cf.RegisterCallbackOn( 'pduOutputReady', obj.cb );
      break;

    case 'REG_TRANS_STATUS_CB':
      if ( obj.cb == undefined ) {
        self.logErrorEvent( EventEnum.IMPROPER_REQ, "No callback found" );
        break;
      }
      cf.RegisterCallbackOn( 'showTransactionStatus', obj.cb );
      break;

    case 'REG_INDICATION_CB':
      if ( obj.cb == undefined ) {
        self.logErrorEvent( EventEnum.IMPROPER_REQ, "No callback found" );
        break;
      }
      cf.RegisterCallbackOn( 'indication', obj.cb );
      break;

    case 'MAKE_TEST_CASES':
      self.makeTestCases();
      break;

    case 'RUN_TEST':
      self.runTest();
      break;

    case 'VALIDATE_TEST':
      if ( obj.cb == undefined ) {
        self.logErrorEvent( EventEnum.IMPROPER_REQ, "No callback found" );
        break;
      }
      obj.cb( self.valTest() );
      break;

    default:
      self.logErrorEvent( EventEnum.IMPROPER_REQ, "Unknown Query" );
      break;
  }
}

/**
 * Gets value of MIB parameter
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
CFDP.prototype.GetMibParams = function( outData, inData ) {
  /* inData  is a list of arguments */
  if ( inData.length == 1 ) {
    if ( typeof( inData[ 0 ] ) == 'string' ) {
      outData.msg = "SUCCESS";
      outData.value = {}
      outData.value.mib_name = ( inData[ 0 ].toUpperCase() );
      outData.value.mib_value = cf.GetMibParams( inData[ 0 ] );
      if ( outData.value.mib_value == '' ) {
        outData.msg = "FAILIURE";
        outData.value.mib_value = undefined;
      }
    }
  }
  return outData;
}

/**
 * Sets MIB parameter
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
CFDP.prototype.SetMibParams = function( outData, inData ) {
  if ( inData.length == 2 ) {
    if ( typeof( inData[ 0 ] ) == 'string' & typeof( inData[ 1 ] ) == 'string' ) {
      var resp = cf.SetMibParams( inData[ 0 ], inData[ 1 ] );
      if ( resp == 'PASS' ) {
        outData.msg = "SUCCESS";
      } else {
        outData.msg = "FAILIURE"
      }
    }
  }
  return outData;
}

/**
 * Restarts Transaction Cycle
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
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

/**
 * Stops Transaction Cycle
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
CFDP.prototype.StopEngine = function( outData, inData ) {
  cf.StopCycle();
  self.TransCycleStarted = false;
  outData.msg = "SUCCESS";
  return outData;
}

/**
 * Sends files from ground to space
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
CFDP.prototype.SendFromGnd = function( outData, inData ) {
  if ( inData.length == 4 ) {
    if ( inData[ 0 ] <= 2 & typeof( inData[ 1 ] ) == 'string' & typeof( inData[ 2 ] ) == 'string' & typeof( inData[ 3 ] ) == 'string' ) {
      cf.RequestPdu( inData[ 0 ], inData[ 1 ], inData[ 2 ], inData[ 3 ] );
      outData.msg = "SUCCESS";
    }
  }
  return outData;
}

/**
 * Get Status Summary
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
CFDP.prototype.GetSummaryStatus = function( outData, inData ) {
  outData.msg = "SUCCESS";
  outData.value = cf.GetSummaryStatus();
  return outData;
}

/**
 * Signals engine to send transaction status on callback.
 * @param  {Object} outData default response object
 * @param  {Objext} inData  input object
 * @return {Object}         response object
 */
CFDP.prototype.GetTransactionStatus = function( outData, inData ) {
  outData.msg = "FAILIURE";
  if ( inData.length == 2 ) {
    if ( typeof( inData[ 0 ] ) == "number" & typeof( inData[ 1 ] ) == "string" ) {
      var transIDObj = cf.GetIdFromString( inData[ 1 ] );
      cf.GetTransactionStatus( inData[ 0 ], transIDObj.length, new Buffer( transIDObj.value ) );
      outData.msg = "SUCCESS";
    }
  }
  return outData;
}

/**
 * Given a length will generate a string or a paragraph of that length
 * @param  {Number} len length of the requested string
 * @return {String}     response string
 */
function stringGen( len ) {
  var text = "";

  var charset = "abcdefghijklmnopqrstuvwxyz0123456789 \n\r";

  for ( var i = 0; i < len; i++ )
    text += charset.charAt( Math.floor( Math.random() * charset.length ) );

  return text;
}

/**
 * Makes necessary files to perform uplink test
 */
CFDP.prototype.makeTestCases = function() {
  var self = this;
  var fileCount = 0
  // console.log( 'heloo', self.testkit.numberOfFilesGenerated )

  while ( fileCount < self.testkit.numberOfFilesGenerated ) {

    if ( fs.existsSync( self.testkit.originPath ) ) {
      if ( fileCount == 0 ) {
        fs.readdir( self.testkit.originPath, ( err, files ) => {
          // if ( err ) throw err;
          for ( const file of files ) {
            fs.unlink( path.join( self.testkit.originPath, file ), err => {
              // if ( err ) throw err;
            } );
          }
        } );
      }

      var fileContent = "";
      var fileSize = 0;
      var fileCapacity = self.testkit.fileSizeSpectrum[ Math.floor( Math.random() * self.testkit.fileSizeSpectrum.length ) ];
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
      genName = self.testkit.originPath + "/" + fileCapacity + "_" + fileSize + "_" + fileCapacity + ".txt";

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
      fs.mkdir( self.testkit.originPath, {
        recursive: true
      }, ( err ) => {
        if ( err ) {
          this.logErrorEvent( EventEnum.MAKE_DIR, 'Failed to make directory `' + self.testkit.originPath + '`' );
          fileCount = self.testkit.numberOfFilesGenerated;
        }
      } );
    }
  }
}

/**
 * Run a test to check cdfp ground node work
 */
CFDP.prototype.runTest = function() {
  var self = this;
  self.testkit.genFileList = [];
  fs.readdir( self.testkit.originPath, ( err, files ) => {
    if ( err ) throw err;

    for ( const file of files ) {
      cf.RequestPdu( 1, "0.24", path.join( self.testkit.originPath, file ), path.join( self.testkit.destPath, file ) );
      self.testkit.genFileList.push( path.join( self.testkit.destPath, file ) );
    }
  } );
}

/**
 * Validates the test that ran in this instance
 */
CFDP.prototype.valTest = function() {
  var self = this;
  var Status = 'SUCCESS'
  for ( var i in self.testkit.genFileList ) {
    if ( !fs.existsSync( self.testkit.genFileList[ i ] ) ) {
      Status = 'FAILIURE'
    }
  }
  return {
    msg: Status
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