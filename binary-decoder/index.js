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
var Promise = require( 'promise' );
var mergeJSON = require( 'merge-json' );
var convict = require( 'convict' );
var config = require( './config.js' );
var Int64LE = require( 'int64-buffer' ).Int64LE;
var Int64BE = require( 'int64-buffer' ).Int64BE;
var Uint64LE = require( 'int64-buffer' ).Uint64LE;
var Uint64BE = require( 'int64-buffer' ).Uint64BE;
var path = require( 'path' );
var Long = require( 'long' );

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
  'TELEMETRY_NOT_FOUND': 8
} );

var emit = Emitter.prototype.emit;

exports = module.exports = BinaryDecoder;

exports.events = [
  'connect',
  'close',
  'error'
];

/**
 * Count listeners
 * @type {Function}
 */
var listenerCount = Emitter.listenerCount ||
  function( emitter, type ) {
    return emitter.listeners( type ).length
  }

/**
 * Constructor for binary decoder
 * @param       {String} workspace  path to commander workspace
 * @param       {String} configFile path to binary-decoder-config.json
 * @constructor
 */
function BinaryDecoder( workspace, configFile ) {
  this.defs;
  this.workspace = workspace;
  this.cmdHeaderLength = 64;
  this.sequence = 0;
  this.cdd = {};
  var self = this;
  this.instanceEmitter;
  this.endian;

  /* Load environment dependent configuration */
  config.loadFile( configFile );

  /* Perform validation */
  config.validate( {
    allowed: 'strict'
  } );

  var inMsgDefs = config.get( 'msgDefs' )

  for ( var i = 0; i < inMsgDefs.length; ++i ) {
    if ( typeof process.env.AIRLINER_MSG_DEF_PATH === 'undefined' ) {
      var fullPath = path.join( this.workspace, config.get( 'msgDefPath' ), inMsgDefs[ i ].file );
    } else {
      var fullPath = path.join( process.env.AIRLINER_MSG_DEF_PATH, inMsgDefs[ i ].file );
    }
    var msgDefInput = JSON.parse( fs.readFileSync( fullPath, 'utf8' ) );
    this.defs = mergeJSON.merge( this.defs, msgDefInput );
  }

  if ( this.defs.Airliner.little_endian ) {
    this.endian = 'little';
  } else {
    this.endian = 'big';
  }

  this.ccsdsPriHdr = new Parser()
    .endianess( 'big' )
    .bit3( 'version' )
    .bit1( 'pktType' )
    .bit1( 'secHdr' )
    .bit11( 'apid' )
    .bit2( 'segment' )
    .bit14( 'sequence' )
    .uint16( 'length' );

  if ( this.endian == 'little' ) {
    this.ccsdsCmdSecHdr = new Parser()
      .endianess( 'little' )
      .bit1( 'reserved' )
      .bit7( 'code' )
      .uint8( 'checksum' );
  } else {
    this.ccsdsCmdSecHdr = new Parser()
      .endianess( 'big' )
      .uint8( 'checksum' )
      .bit1( 'reserved' )
      .bit7( 'code' )
  }

  switch ( config.get( 'CFE_SB_PACKET_TIME_FORMAT' ) ) {
    case 'CFE_SB_TIME_32_16_SUBS':
      this.ccsdsTlmSecHdr = new Parser()
        .endianess( this.endian )
        .uint32( 'seconds' )
        .uint16( 'subseconds' );
      this.tlmHeaderLength = 96;
      break;

    case 'CFE_SB_TIME_32_32_SUBS':
      this.ccsdsTlmSecHdr = new Parser()
        .endianess( this.endian )
        .uint32( 'seconds' )
        .uint32( 'subseconds' );
      this.tlmHeaderLength = 98;
      break;

    case 'CFE_SB_TIME_32_32_M_20':
      this.ccsdsTlmSecHdr = new Parser()
        .endianess( this.endian )
        .uint32( 'seconds' )
        .uint32( 'subseconds' );
      this.tlmHeaderLength = 98;
      break;

    default:
      break;
  }

  this.ccsds = new Parser()
    .endianess( this.endian )
    .nest( 'PriHdr', {
      type: this.ccsdsPriHdr
    } )
    .choice( 'SecHdr', {
      tag: 'PriHdr.pktType',
      choices: {
        0: this.ccsdsTlmSecHdr,
        1: this.ccsdsCmdSecHdr
      }
    } )
    .buffer( 'payload', {
      readUntil: 'eof'
    } );
};


/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
BinaryDecoder.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  var self = this;
  this.instanceEmitter = newInstanceEmitter;

  this.instanceEmitter.on( config.get( 'binaryInputStreamID' ), function( buffer ) {
    self.processBinaryMessage( buffer );
  } );

  this.instanceEmitter.on( config.get( 'tlmDefReqStreamID' ), function( tlmReqs, cb ) {
    if ( typeof tlmReqs.length === 'number' ) {
      /* This must be an array. */
      var outTlmDefs = [];
      for ( var i = 0; i < tlmReqs.length; ++i ) {
        var tlmDef = self.getTlmDefByName( self.stripArrayIdentifiers( tlmReqs[ i ].name ) );
        if ( typeof tlmDef !== 'undefined' ) {
          tlmDef.opsPath = tlmReqs[ i ].name;
          outTlmDefs.push( tlmDef );
        } else {
          self.logErrorEvent( EventEnum.TELEMETRY_NOT_FOUND, 'TlmDefReq: Telemetry not found.  \'' + tlmReqs[ i ].name + '\'' );
        }
      }
      cb( outTlmDefs );
    } else {
      /* This is a single request. */
      var tlmDef = self.getTlmDefByName( self.stripArrayIdentifiers( tlmReqs.name ) );
      if ( typeof tlmDef === 'undefined' ) {
        self.logErrorEvent( EventEnum.TELEMETRY_NOT_FOUND, 'TlmDefReq: Telemetry not found.  \'' + tlmReqs.name + '\'' );
      } else {
        tlmDef.opsPath = tlmReqs.name;
      }
      cb( tlmDef );
    }
  } );

  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );
}


/**
 * Gets telemetry definition by name
 * @param  {String} name telemetry operation name
 * @return {Object}      telemetry definition object
 */
BinaryDecoder.prototype.getTlmDefByName = function( name ) {
  var fieldDef = this.getTlmDefByPath( name );

  if ( typeof fieldDef === 'undefined' ) {
    return undefined;
  } else {
    var outTlmDef = {
      opsPath: name
    };
    switch ( fieldDef.airliner_type ) {
      case 'char':
      case 'uint8':
      case 'int8':
      case 'string':
      case 'uint16':
      case 'int16':
      case 'uint32':
      case 'int32':
      case 'float':
      case 'double':
      case 'boolean':
      case 'uint64':
      case 'int64':
        outTlmDef.dataType = fieldDef.airliner_type;
        break;

      default:
        switch ( fieldDef.pb_type ) {
          case 'char':
          case 'uint8':
          case 'int8':
          case 'string':
          case 'uint16':
          case 'int16':
          case 'uint32':
          case 'int32':
          case 'float':
          case 'double':
          case 'boolean':
          case 'uint64':
          case 'int64':
            outTlmDef.dataType = fieldDef.pb_type;
            break;

          default:
            // console.log( "Data type not found" );
            outTlmDef.dataType = undefined;
        }
    }

    if ( fieldDef.array_length != 0 ) {
      outTlmDef.arrayLength = fieldDef.array_length;
    }

    return outTlmDef;
  }
}


/**
 * Parse and return app name
 * @param  {String} path telemetry path
 * @return {String}      App name
 */
BinaryDecoder.prototype.getAppNameFromPath = function( path ) {
  if ( typeof path === 'string' ) {
    var splitName = path.split( '/' );
    return splitName[ 1 ];
  }
  return undefined;
}


/**
 * Parse and return operation name
 * @param  {String} path telemetry path
 * @return {String}      Operation name
 */
BinaryDecoder.prototype.getOperationFromPath = function( path ) {
  if ( typeof path === 'string' ) {
    var splitName = path.split( '/' );
    return splitName[ 2 ];
  }
  return undefined;
}


/**
 * Gets application definition from application name
 * @param  {String} appName application name
 * @return {Object}         application object
 */
BinaryDecoder.prototype.getAppDefinition = function( appName ) {
  for ( var appID in this.defs.Airliner.apps ) {
    var app = this.defs.Airliner.apps[ appID ];
    if ( app.app_name == appName ) {
      return app;
    }
  }
}


/**
 * Gets telemetry definition by telemetry path
 * @param  {String} path telemetry path
 * @return {Object}      telemetry definition
 */
BinaryDecoder.prototype.getTlmDefByPath = function( path ) {
  var self = this;
  var appName = self.getAppNameFromPath( path );
  var operationName = self.getOperationFromPath( path );
  if ( typeof operationName === 'undefined' ) {
    this.logErrorEvent( EventEnum.OPS_PATH_NOT_FOUND, 'getTlmDefByPath: Ops path not found. \'' + path + '\'' );
    return undefined;
  } else {
    var appDefinition = this.getAppDefinition( appName );

    if ( typeof appDefinition === 'undefined' ) {
      this.logErrorEvent( EventEnum.APP_NOT_FOUND, 'getTlmDefByPath: App not found. \'' + appName + '\'' );
      return undefined;
    } else {
      var operation = appDefinition.operations[ operationName ];
      if ( typeof operation !== 'undefined' ) {
        if ( operation.hasOwnProperty( 'airliner_msg' ) ) {
          var msgDef = this.getMsgDefByName( operation.airliner_msg );

          if ( typeof msgDef === 'undefined' ) {
            return undefined;
          } else {
            var splitName = path.split( '/' );
            var opNameID = self.stripArrayIdentifier( splitName[ 3 ] );

            var fieldObj = msgDef.operational_names[ opNameID ];

            if ( typeof fieldObj === 'undefined' ) {
              return undefined;
            } else {
              var fieldPath = fieldObj.field_path;

              if ( typeof fieldPath === 'undefined' ) {
                return undefined;
              } else {
                var fieldDef = self.getFieldFromOperationalName( msgDef, fieldPath, 0 );

                return fieldDef.fieldDef;
              }
            }
          }
        }
      }
    }
  }
}


/**
 * Checks if opName is a string array
 * @param  {String} opName operation name
 * @return {Boolean}        true if opName is a string array otherwise false
 */
BinaryDecoder.prototype.isOpNameAnArray = function( opName ) {
  if ( typeof opName == 'string' ) {
    var start = opName.indexOf( '[' );

    if ( start > 0 ) {
      var end = opName.indexOf( ']' );

      if ( end > start ) {
        return true;
      }
    }
  }
  return false;
}


/**
 * String array for telemetry identifier
 * @param  {String} opName operation name
 * @return {String}        indentifier
 */
BinaryDecoder.prototype.stripArrayIdentifier = function( opName ) {
  var self = this;
  if ( self.isOpNameAnArray( opName ) == true ) {
    var start = 0;
    var end = opName.indexOf( '[' );

    if ( end > 0 ) {
      var outString = opName.substring( start, end );
      return outString;
    }
  }
  return opName;
}


/**
 * String array for telemetry identifiers
 * @param  {String} opName operation name
 * @return {String}        indentifiers
 */
BinaryDecoder.prototype.stripArrayIdentifiers = function( opName ) {
  var self = this;
  if ( typeof opName == 'string' ) {
    var splitPath = opName.split( '.' );

    for ( var i = 0; i < splitPath.length; ++i ) {
      splitPath[ i ] = self.stripArrayIdentifier( splitPath[ i ] );
    }
    return splitPath.join( '.' );
  }
  return undefined;


}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 */
BinaryDecoder.prototype.instanceEmit = function( streamID, msg ) {
  this.instanceEmitter.emit( streamID, msg );
}




/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
BinaryDecoder.prototype.__proto__ = Emitter.prototype;


/**
 * Get telemetry definiton by telemetry name
 * @param  {String} msgName message name
 * @return {Object}         telemetry defintion
 */
BinaryDecoder.prototype.getMsgDefByName = function( msgName ) {
  var self = this;
  try {
    for ( var appID in this.defs.Airliner.apps ) {
      var app = this.defs.Airliner.apps[ appID ];
      for ( var protoID in app.proto_msgs ) {
        var protomsg = app.proto_msgs[ protoID ];
        if ( protoID == msgName ) {
          return protomsg;
        }
      }
    }
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getMsgDefByName: Cannot get definition by name.' );
  }
  return undefined;
}


/**
 * Get telemetry definition by message id
 * @param  {Number} msgID message id
 * @return {Object}       telemetry definition object
 */
BinaryDecoder.prototype.getMsgDefByMsgID = function( msgID ) {
  for ( var appID in this.defs.Airliner.apps ) {
    var app = this.defs.Airliner.apps[ appID ];
    for ( var opID in app.operations ) {
      var operation = app.operations[ opID ];
      if ( typeof msgID === 'number' && operation.airliner_mid == msgID ) {
        var opsPath = '/' + appID + '/' + opID;
        return {
          opsPath: opsPath,
          msgDef: this.getMsgDefByName( operation.airliner_msg )
        };
      }
    }
  }
  return undefined;
}


/**
 * Get field from protobuf message
 * @param  {Object} pbMsgDef       protobuf message
 * @param  {Object} fieldPathArray field path array
 * @param  {Number} bitOffset      bit offset
 * @return {Object}                field object
 */
BinaryDecoder.prototype.getFieldObjFromPbMsg = function( pbMsgDef, fieldPathArray, bitOffset ) {
  var self = this;
  if ( fieldPathArray.hasOwnProperty( 'length' ) ) {
    try {
      var fieldName = fieldPathArray[ 0 ];
      var fieldDef = pbMsgDef.fields[ fieldName ];
      var pbType = fieldDef.pb_type;
    } catch ( e ) {
      self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getFieldObjFromPbMsg: Unable to retrive field.  \'' + e + '\'' );
    }
    if ( fieldPathArray.length == 1 ) {
      return {
        fieldDef: fieldDef,
        bitOffset: fieldDef.bit_offset + bitOffset
      };
    } else {
      try {
        var childMsgDef = pbMsgDef.required_pb_msgs[ fieldDef.pb_type ];

        fieldPathArray.shift();

        return self.getFieldObjFromPbMsg( childMsgDef, fieldPathArray, fieldDef.bit_offset + bitOffset );
      } catch ( e ) {
        self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getFieldObjFromPbMsg: Unable to retrive field.  \'' + e + '\'' );
      }
    }
  }
  return undefined;
}


/**
 * Gets field from operation name
 * @param  {Object} msgDef    message def
 * @param  {string} opName    operation name
 * @param  {Number} bitOffset bit offset
 * @return {Object}           field object
 */
BinaryDecoder.prototype.getFieldFromOperationalName = function( msgDef, opName, bitOffset ) {
  var self = this;
  var pbMsg = undefined;
  try {
    var op = msgDef.operational_names[ opName ];
    var fieldPathArray = opName.split( '.' );
    pbMsg = self.getFieldObjFromPbMsg( msgDef, fieldPathArray, bitOffset );
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getFieldFromOperationalName: Unable to retrive field.  \'' + e + '\'' );
  }
  return pbMsg;
}


/**
 * Processes binary message
 * @param  {Object} buffer buffer object
 */
BinaryDecoder.prototype.processBinaryMessage = function( buffer ) {
  var self = this;
  try {
    var msgID = buffer.readUInt16BE( 0 );

    var message = this.ccsds.parse( buffer );

    var msgTime = this.cfeTimeToJsTime( message.SecHdr.seconds, message.SecHdr.subSeconds );

    var def = this.getMsgDefByMsgID( msgID );

    var tlmObj = {};

    if ( typeof def !== 'undefined' ) {
      if ( def.hasOwnProperty( 'msgDef' ) ) {
        if ( typeof def.msgDef !== 'undefined' ) {
          var fields = def.msgDef.fields;
          for ( var fieldName in fields ) {
            var field = fields[ fieldName ];
            tlmObj[ fieldName ] = this.getFieldValue( buffer, field, field.bit_offset, def.msgDef );
          }

          var pbMsg = def.msgDef.proto_msg;
          var symbolName = pbMsg.substring( 0, pbMsg.length - 3 );
          
          this.instanceEmit( config.get( 'jsonOutputStreamID' ), {
            content: tlmObj,
            opsPath: def.opsPath,
            symbol: symbolName,
            msgID: symbolName,
            msgTime: msgTime
          } );
        }
      }
    }
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'processBinaryMessage: Unable decode buffer.  \'' + e + '\'' );
  }
};


/**
 * Gets field value ad protobuf type
 * @param  {Object} buffer    buffer object
 * @param  {Object} fieldDef  field definition
 * @param  {Number} bitOffset bit offset
 * @param  {Object} rootDef   root definition
 * @return {Object}           value object
 */
BinaryDecoder.prototype.getFieldValueAsPbType = function( buffer, fieldDef, bitOffset, rootDef ) {
  var self = this;

  try {
    var value;

    if ( fieldDef.airliner_type === 'CFE_SB_PipeId_t' ) {
      fieldDef.pb_type = 'uint8';
    }

    if ( fieldDef.array_length > 1 ) {
      var value = [];
      switch ( fieldDef.pb_type ) {
        case 'uint8':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            value.push( buffer.readUInt8( ( bitOffset / 8 ) + i ) );
          }
          break;

        case 'int8':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            value.push( buffer.readInt8( ( bitOffset / 8 ) + i ) );
          }
          break;

        case 'string':
          value = buffer.toString( 'utf8', bitOffset / 8, ( bitOffset / 8 ) + fieldDef.array_length );
          break;

        case 'char':
            value = buffer.toString( 'utf8', bitOffset / 8, ( bitOffset / 8 ) + fieldDef.array_length );
          break;

        case 'uint16':
        case 'CFE_SB_MsgId_t':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readUInt16LE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            } else {
              value.push( buffer.readUInt16BE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            }
          }
          break;

        case 'int16':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readInt16LE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            } else {
              value.push( buffer.readInt16BE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            }
          }
          break;

        case 'uint32':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readUInt32LE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            } else {
              value.push( buffer.readUInt32BE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            }
          }
          break;

        case 'int32':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readInt32LE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            } else {
              value.push( buffer.readInt32BE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            }
          }
          break;

        case 'float':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readFloatLE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            } else {
              value.push( buffer.readFloatBE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            }
          }
          break;

        case 'double':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readDoubleLE( ( bitOffset / 8 ) + ( i * 8 ) ) );
            } else {
              value.push( buffer.readDoubleBE( ( bitOffset / 8 ) + ( i * 8 ) ) );
            }
          }
          break;

        case 'boolean':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            value.push( buffer.readUInt8( ( bitOffset / 8 ) + ( i * 4 ) ) );
          }
          break;

        case 'uint64':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              var uint64Value = new Uint64LE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            } else {
              var uint64Value = new Uint64BE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            }
            value.push( uint64Value.toString( 10 ) );
          }
          break;

        case 'int64':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              var int64Value = new Int64LE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            } else {
              var int64Value = new Int64BE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            }
            value.push( int64Value.toString( 10 ) );
          }
          break;

        default:
          var nextFieldDef = rootDef.required_pb_msgs[fieldDef.pb_type];
          var elementBitSize = fieldDef.bit_size / fieldDef.array_length;
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            var nextBitOffset =  bitOffset + ( elementBitSize * i );
            
            var nextValue = {};
            var fields = nextFieldDef.fields;
            for ( var fieldName in fields ) {
              var field = fields[ fieldName ];

              nextValue[ fieldName ] = self.getFieldValueAsPbType( buffer, field, nextBitOffset + field.bit_offset, rootDef );
            }
            value.push(nextValue);
          }
      }
    } else {
      switch ( fieldDef.pb_type ) {
        case 'char':
          value = buffer.readUInt8( bitOffset / 8 );
          break;

        case 'uint8':
          value = buffer.readUInt8( bitOffset / 8 );
          break;

        case 'int8':
          value = buffer.readInt8( bitOffset / 8 );
          break;

        case 'uint16':
        case 'CFE_SB_MsgId_t':
          if ( this.endian == 'little' ) {
            value = buffer.readUInt16LE( bitOffset / 8 );
          } else {
            value = buffer.readUInt16BE( bitOffset / 8 );
          }
          break;

        case 'int16':
          if ( this.endian == 'little' ) {
            value = buffer.readInt16LE( bitOffset / 8 );
          } else {
            value = buffer.readInt16BE( bitOffset / 8 );
          }
          break;

        case 'uint32':
          if ( this.endian == 'little' ) {
            value = buffer.readUInt32LE( bitOffset / 8 );
          } else {
            value = buffer.readUInt32BE( bitOffset / 8 );
          }
          break;

        case 'int32':
          if ( this.endian == 'little' ) {
            value = buffer.readInt32LE( bitOffset / 8 );
          } else {
            value = buffer.readInt32BE( bitOffset / 8 );
          }
          break;

        case 'float':
          if ( this.endian == 'little' ) {
            value = buffer.readFloatLE( bitOffset / 8 );
          } else {
            value = buffer.readFloatBE( bitOffset / 8 );
          }
          break;

        case 'double':
          if ( this.endian == 'little' ) {
            value = buffer.readDoubleLE( bitOffset / 8 );
          } else {
            value = buffer.readDoubleBE( bitOffset / 8 );
          }
          break;

        case 'boolean':
          value = buffer.readUInt8( bitOffset / 8 );
          break;

        case 'uint64':
          if ( this.endian == 'little' ) {
            var uint64Value = new Uint64LE( buffer, bitOffset / 8 );
          } else {
            var uint64Value = new Uint64BE( buffer, bitOffset / 8 );
          }
          value = uint64Value.toString( 10 );
          break;

        case 'int64':
          if ( this.endian == 'little' ) {
            var int64Value = new Int64LE( buffer, bitOffset / 8 );
          } else {
            var int64Value = new Int64BE( buffer, bitOffset / 8 );
          }
          value = int64Value.toString( 10 );
          break;

        default:
          var nextFieldDef = rootDef.required_pb_msgs[fieldDef.pb_type];
          var elementBitSize = fieldDef.bit_size;
          var nextBitOffset =  elementBitSize;
                        
          var value = {};
          var fields = nextFieldDef.fields;
          for ( var fieldName in fields ) {
            var field = fields[ fieldName ];

            value[ fieldName ] = self.getFieldValueAsPbType( buffer, field, bitOffset + field.bit_offset, rootDef );
          }
      }
    }
  } catch ( err ) {
    this.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getFieldValueAsPbType: Unhandled exception. \'' + err + ' - ' + err.stack + '\'' );
  }

  return value;
}


/**
 * Gets the telemetry field value
 * @param  {Object} buffer    buffer object
 * @param  {Object} fieldDef  field definition
 * @param  {Object} bitOffset bit offset
 * @param  {Object} rootDef   root definition
 * @return {Object}           value object
 */
BinaryDecoder.prototype.getFieldValue = function( buffer, fieldDef, bitOffset, rootDef ) {
  try {
    var value;

    if ( fieldDef.array_length > 1 ) {
      var value = [];
      switch ( fieldDef.airliner_type ) {
        case 'char':
          value = buffer.toString( 'utf8', bitOffset / 8, ( bitOffset / 8 ) + fieldDef.array_length );
          break;

        case 'uint8':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            value.push( buffer.readUInt8( ( bitOffset / 8 ) + i ) );
          }
          break;

        case 'int8':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            value.push( buffer.readInt8( ( bitOffset / 8 ) + i ) );
          }
          break;

        case 'string':
          value = buffer.toString( 'utf8', bitOffset / 8, ( bitOffset / 8 ) + fieldDef.array_length );
          break;

        case 'uint16':
        case 'CFE_SB_MsgId_t':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readUInt16LE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            } else {
              value.push( buffer.readUInt16BE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            }
          }
          break;

        case 'int16':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readInt16LE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            } else {
              value.push( buffer.readInt16BE( ( bitOffset / 8 ) + ( i * 2 ) ) );
            }
          }
          break;

        case 'uint32':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readUInt32LE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            } else {
              value.push( buffer.readUInt32BE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            }
          }
          break;

        case 'int32':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readInt32LE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            } else {
              value.push( buffer.readInt32BE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            }
          }
          break;

        case 'float':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readFloatLE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            } else {
              value.push( buffer.readFloatBE( ( bitOffset / 8 ) + ( i * 4 ) ) );
            }
          }
          break;

        case 'double':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              value.push( buffer.readDoubleLE( ( bitOffset / 8 ) + ( i * 8 ) ) );
            } else {
              value.push( buffer.readDoubleBE( ( bitOffset / 8 ) + ( i * 8 ) ) );
            }
          }
          break;

        case 'boolean':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            value.push( buffer.readUInt8( ( bitOffset / 8 ) + ( i * 4 ) ) );
          }
          break;

        case 'uint64':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              var uint64Value = new Uint64LE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            } else {
              var uint64Value = new Uint64BE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            }
            value.push( uint64Value.toString( 10 ) );
          }
          break;

        case 'int64':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( this.endian == 'little' ) {
              var int64Value = new Int64LE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            } else {
              var int64Value = new Int64BE( buffer, ( bitOffset / 8 ) + ( i * 8 ) );
            }
            value.push( int64Value.toString( 10 ) );
          }
          break;

        default:
          var nextFieldDef = this.getMsgDefByName( fieldDef.airliner_type );

          if ( typeof nextFieldDef === 'undefined' ) {
              value = this.getFieldValueAsPbType( buffer, fieldDef, bitOffset, rootDef );
          } else {
            var nextFields = nextFieldDef.fields;
            var value = [];
            for ( var i = 0; i < fieldDef.array_length; ++i ) {
              var nextValue = {};
              var elementBitSize = fieldDef.bit_size / fieldDef.array_length;
              var nextBitOffset = bitOffset + ( ( fieldDef.bit_size / fieldDef.array_length ) * i );

              for ( var fieldName in nextFields ) {
                var nextField = nextFields[ fieldName ];
                nextValue[ fieldName ] = this.getFieldValue( buffer, nextField, nextField.bit_offset + nextBitOffset, nextFieldDef );
              }
              value.push( nextValue );
            }
          }
      }
    } else {
      switch ( fieldDef.airliner_type ) {
        case 'char':
          value = buffer.readUInt8( bitOffset / 8 );
          break;

        case 'uint8':
          value = buffer.readUInt8( bitOffset / 8 );
          break;

        case 'int8':
          value = buffer.readInt8( bitOffset / 8 );
          break;

        case 'uint16':
        case 'CFE_SB_MsgId_t':
          if ( this.endian == 'little' ) {
            value = buffer.readUInt16LE( bitOffset / 8 );
          } else {
            value = buffer.readUInt16BE( bitOffset / 8 );
          }
          break;

        case 'int16':
          if ( this.endian == 'little' ) {
            value = buffer.readInt16LE( bitOffset / 8 );
          } else {
            value = buffer.readInt16BE( bitOffset / 8 );
          }
          break;

        case 'uint32':
          if ( this.endian == 'little' ) {
            value = buffer.readUInt32LE( bitOffset / 8 );
          } else {
            value = buffer.readUInt32BE( bitOffset / 8 );
          }
          break;

        case 'int32':
          if ( this.endian == 'little' ) {
            value = buffer.readInt32LE( bitOffset / 8 );
          } else {
            value = buffer.readInt32BE( bitOffset / 8 );
          }
          break;

        case 'float':
          if ( this.endian == 'little' ) {
            value = buffer.readFloatLE( bitOffset / 8 );
          } else {
            value = buffer.readFloatBE( bitOffset / 8 );
          }
          break;

        case 'double':
          if ( this.endian == 'little' ) {
            value = buffer.readDoubleLE( bitOffset / 8 );
          } else {
            value = buffer.readDoubleBE( bitOffset / 8 );
          }
          break;

        case 'boolean':
          value = buffer.readUInt8( bitOffset / 8 );
          break;

        case 'uint64':
          if ( this.endian == 'little' ) {
            var uint64Value = new Uint64LE( buffer, bitOffset / 8 );
          } else {
            var uint64Value = new Uint64BE( buffer, bitOffset / 8 );
          }
          value = uint64Value.toString( 10 );
          break;

        case 'uint64':
          if ( this.endian == 'little' ) {
            var int64Value = new Int64LE( buffer, bitOffset / 8 );
          } else {
            var int64Value = new Int64BE( buffer, bitOffset / 8 );
          }
          value = int64Value.toString( 10 );
          break;

        default:
          var nextFieldDef = this.getMsgDefByName( fieldDef.airliner_type );

          if ( typeof nextFieldDef === 'undefined' ) {
            value = this.getFieldValueAsPbType( buffer, fieldDef, bitOffset, rootDef );
          } else {
            var nextFields = nextFieldDef.fields;
            var value = {};
            for ( var fieldName in nextFields ) {
              var nextField = nextFields[ fieldName ];
              value[ fieldName ] = this.getFieldValue( buffer, nextField, nextField.bit_offset + bitOffset, nextFieldDef );
            }
          }
      }
    }

    return value;
  } catch ( err ) {
    this.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getField: Unhandled exception. \'' + err + ' - ' + err.stack + '\'' );

    return undefined;
  }
}


/**
 * Gets telemetry definition by message id
 * @param  {Number} msgID message id
 * @return {Object}       telemetry definition object
 */
BinaryDecoder.prototype.getTlmDefByMsgID = function( msgID ) {
  for ( var name in this.defs ) {
    var tlm = this.defs[ name ];
    if ( tlm.msgID == msgID ) {
      return tlm;
    }
  }
}


/**
 * Convert CFE time to javascript time
 * @param  {Number} seconds    CFE seconds
 * @param  {Number} subseconds CFE subseconds
 * @return {Object}            javascript date object
 */
BinaryDecoder.prototype.cfeTimeToJsTime = function( seconds, subseconds ) {
  var microseconds;

  /* 0xffffdf00 subseconds = 999999 microseconds, so anything greater
   * than that we set to 999999 microseconds, so it doesn't get to
   * a million microseconds */

  if ( subseconds > 0xffffdf00 ) {
    microseconds = 999999;
  } else {
    /*
     **  Convert a 1/2^32 clock tick count to a microseconds count
     **
     **  Conversion factor is  ( ( 2 ** -32 ) / ( 10 ** -6 ) ).
     **
     **  Logic is as follows:
     **    x * ( ( 2 ** -32 ) / ( 10 ** -6 ) )
     **  = x * ( ( 10 ** 6  ) / (  2 ** 32 ) )
     **  = x * ( ( 5 ** 6 ) ( 2 ** 6 ) / ( 2 ** 26 ) ( 2 ** 6) )
     **  = x * ( ( 5 ** 6 ) / ( 2 ** 26 ) )
     **  = x * ( ( 5 ** 3 ) ( 5 ** 3 ) / ( 2 ** 7 ) ( 2 ** 7 ) (2 ** 12) )
     **
     **  C code equivalent:
     **  = ( ( ( ( ( x >> 7) * 125) >> 7) * 125) >> 12 )
     */

    microseconds = ( ( ( ( ( subseconds >> 7 ) * 125 ) >> 7 ) * 125 ) >> 12 );

    /* if the subseconds % 0x4000000 != 0 then we will need to
     * add 1 to the result. the & is a faster way of doing the % */
    if ( ( subseconds & 0x3ffffff ) != 0 ) {
      microseconds++;
    }

    /* In the Micro2SubSecs conversion, we added an extra anomaly
     * to get the subseconds to bump up against the end point,
     * 0xFFFFF000. This must be accounted for here. Since we bumped
     * at the half way mark, we must "unbump" at the same mark
     */
    if ( microseconds > 500000 ) {
      microseconds--;
    }
  } /* end else */

  /* Get a date with the correct year. */
  var jsDateTime = new Date( "12/1/" + config.get( 'CFE_TIME_EPOCH_YEAR' ) );

  /* Adjust days. */
  jsDateTime.setDate( jsDateTime.getDate() + ( config.get( 'CFE_TIME_EPOCH_DAY' ) - 1 ) );

  /* Adjust hours minutes and seconds. */
  jsDateTime.setTime( jsDateTime.getTime() +
    ( config.get( 'CFE_TIME_EPOCH_HOUR' ) * 3600000 ) +
    ( config.get( 'CFE_TIME_EPOCH_MINUTE' ) * 60000 ) +
    ( config.get( 'CFE_TIME_EPOCH_SECOND' ) * 1000 ) );

  /* Add the CFE seconds. */
  jsDateTime.setTime( jsDateTime.getTime() + ( seconds * 1000 ) );

  /* Finally, add the CFE microseconds. */
  jsDateTime.setMilliseconds( jsDateTime.getMilliseconds() + ( microseconds / 1000 ) );

  return jsDateTime;
}


/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryDecoder.prototype.logDebugEvent = function( eventID, text ) {
  this.instanceEmit( 'events-debug', {
    sender: this,
    component: 'BinaryDecoder',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryDecoder.prototype.logInfoEvent = function( eventID, text ) {
  this.instanceEmit( 'events-info', {
    sender: this,
    component: 'BinaryDecoder',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryDecoder.prototype.logErrorEvent = function( eventID, text ) {
  this.instanceEmit( 'events-error', {
    sender: this,
    component: 'BinaryDecoder',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryDecoder.prototype.logCriticalEvent = function( eventID, text ) {
  this.instanceEmit( 'events-critical', {
    sender: this,
    component: 'BinaryDecoder',
    eventID: eventID,
    text: text
  } );
}