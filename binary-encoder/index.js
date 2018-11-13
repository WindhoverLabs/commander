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

exports = module.exports = BinaryEncoder;

/**
 * Count listeners
 * @type {Function}
 */
var listenerCount = Emitter.listenerCount ||
  function( emitter, type ) {
    return emitter.listeners( type ).length
  }

/**
 * Constructor for binary encoder
 * @param       {String} workspace  path to commander workspace
 * @param       {String} configFile path to binary-encoder-config.json
 * @constructor
 */
function BinaryEncoder( workspace, configFile ) {
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
        .endianess( 'big' )
        .uint32( 'seconds' )
        .uint16( 'subseconds' );
      this.tlmHeaderLength = 96;
      break;

    case 'CFE_SB_TIME_32_32_SUBS':
      this.ccsdsTlmSecHdr = new Parser()
        .endianess( 'big' )
        .uint32( 'seconds' )
        .uint32( 'subseconds' );
      this.tlmHeaderLength = 98;
      break;

    case 'CFE_SB_TIME_32_32_M_20':
      this.ccsdsTlmSecHdr = new Parser()
        .endianess( 'big' )
        .uint32( 'seconds' )
        .uint32( 'subseconds' );
      this.tlmHeaderLength = 98;
      break;

    default:
      break;
  }

  this.ccsds = new Parser()
    .endianess( 'big' )
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
BinaryEncoder.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  var self = this;
  this.instanceEmitter = newInstanceEmitter;

  this.instanceEmitter.on( config.get( 'cmdDefReqStreamID' ), function( cmdReqs, cb ) {
    if ( typeof cmdReqs.length === 'number' ) {
      /* This must be an array. */
      var outCmdDefs = [];
      for ( var i = 0; i < cmdReqs.length; ++i ) {
        if ( cmdReqs[ i ].hasOwnProperty( 'opsPath' ) ) {
          var cmdDef = self.getCmdDefByName( cmdReqs[ i ].opsPath );
          if ( typeof cmdDef !== 'undefined' ) {
            outCmdDefs.push( cmdDef );
          } else {
            self.logErrorEvent( EventEnum.COMMAND_NOT_FOUND, 'CmdDefReq: Command not found.  \'' + cmdReqs[ i ].opsPath + '\'' );
          }
        } else if ( cmdReqs[ i ].hasOwnProperty( 'msgID' ) && cmdReqs[ i ].hasOwnProperty( 'cmdCode' ) ) {
          var cmdDef = self.getCmdDefByMsgIDandCC( cmdReqs[ i ].msgID, cmdReqs[ i ].cmdCode );
          if ( typeof cmdDef !== 'undefined' ) {
            outCmdDefs.push( cmdDef );
          } else {
            self.logErrorEvent( EventEnum.COMMAND_NOT_FOUND, 'CmdDefReq: Command not found.  \'' + cmdReqs[ i ].opsPath + '\'' );
          }
        } else {
          self.logErrorEvent( EventEnum.INVALID_REQUEST, 'CmdDefReq: Invalid request.  \'' + JSON.stringify( cmdReqs[ i ], null, '\t' ) + '\'' );
        }
      }

      self.logDebugEvent( EventEnum.COMMAND_DEFINITION, 'CmdDefReqs: \'' + JSON.stringify( cmdReqs, null, '\t' ) + '\'  Defs: \'' + JSON.stringify( outCmdDefs, null, '\t' ) + '\'' );
      cb( outCmdDefs );
    } else {
      /* This is a single request. */
      var cmdReq = cmdReqs;
      var outCmdDef = {};

      if ( cmdReq.hasOwnProperty( 'opsPath' ) ) {
        var outCmdDef = self.getCmdDefByName( cmdReq.opsPath );
        if ( typeof outCmdDef === 'undefined' ) {
          self.logErrorEvent( EventEnum.COMMAND_NOT_FOUND, 'CmdDefReq: Command not found.  \'' + cmdReq.opsPath + '\'' );
        }
      } else if ( cmdReq.hasOwnProperty( 'msgID' ) && cmdReq.hasOwnProperty( 'cmdCode' ) ) {
        outCmdDef = self.getCmdDefByMsgIDandCC( cmdReq.msgID, cmdReq.cmdCode );
        if ( typeof outCmdDef === 'undefined' ) {
          self.logErrorEvent( EventEnum.COMMAND_NOT_FOUND, 'CmdDefReq: Command not found.  \'' + cmdReq.opsPath + '\'' );
        }
      } else {
        self.logErrorEvent( EventEnum.INVALID_REQUEST, 'CmdDefReq: Invalid request.  \'' + JSON.stringify( cmdReq, null, '\t' ) + '\'' );
      }

      self.logDebugEvent( EventEnum.COMMAND_DEFINITION, 'CmdDefReq: \'' + JSON.stringify( cmdReq, null, '\t' ) + '\'  Def: \'' + JSON.stringify( outCmdDef, null, '\t' ) + '\'' );
      cb( outCmdDef );
    }
  } );

  this.instanceEmitter.on( config.get( 'cmdSendStreamID' ), function( req ) {
    var cmdDef = self.getCmdDefByName( req.ops_path );
    if ( typeof cmdDef === 'undefined' ) {
      self.logErrorEvent( EventEnum.INVALID_REQUEST, 'CmdSend: Ops path not found.  \'' + req + '\'' );
    } else {
      self.sendCommand( cmdDef, req.args );
    }
  } );

  this.instanceEmitter.on( config.get( 'tlmSendStreamID' ), function( tlmObj ) {
    this.logErrorEvent( EventEnum.FUNCTION_NOT_IMPLEMENTED, 'TlmSend: Function not yet implemented.' );
  } );

  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );
}


/**
 * Gets command definition by name
 * @param  {String} name command operation name
 * @return {Object}      command definition object
 */
BinaryEncoder.prototype.getCmdDefByName = function( name ) {
  var outCmdDef = {
    opsPath: name,
    args: []
  };
  var opDef = this.getOperationByPath( name );
  if ( typeof opDef === 'undefined' ) {
    return undefined;
  } else {
    var msgDef = this.getMsgDefByName( opDef.operation.airliner_msg );

    if ( typeof msgDef === 'object' ) {
      var args = this.getCmdOpNamesStripHeader( msgDef );
      for ( var argID in args ) {
        outCmdDef.args.push( {
          name: argID,
          type: args[ argID ].dataType,
          bitSize: args[ argID ].bitSize
        } );
      }
    }
    return outCmdDef;
  }
}


/**
 * Strips header from command definition and returns consolidated definition
 * @param  {Object} cmdDef full command definiton
 * @return {Object}        consolidated definiton
 */
BinaryEncoder.prototype.getCmdOpNamesStripHeader = function( cmdDef ) {
  var opsPaths = {};
  var self = this;

  if ( cmdDef.hasOwnProperty( 'operational_names' ) ) {
    for ( var opNameID in cmdDef.operational_names ) {
      try {
        var fieldNames = cmdDef.operational_names[ opNameID ].field_path.split( '.' );
        var fieldName = fieldNames[ 0 ];
        var field = cmdDef.fields[ fieldName ];

        var fieldDef = this.getFieldFromOperationalName( cmdDef, opNameID, 0 );

        if ( fieldDef.bitOffset >= self.cmdHeaderLength ) {
          opsPaths[ opNameID ] = {
            dataType: self.getIntrinsicType( fieldDef.fieldDef ),
            bitSize: fieldDef.fieldDef.bit_size
          };
        }
      } catch ( e ) {
        self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getCmdOpNamesStripHeader: Command definition format error.' );
      }
    }
  }
  return opsPaths;
}


/**
 * Gets intrinsic type
 * @param  {Object} fieldDef field definition
 * @return {String}          derived intrinsic type
 */
BinaryEncoder.prototype.getIntrinsicType = function( fieldDef ) {
  var self = this;
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
      return fieldDef.airliner_type;
      break;

    default:
      if(fieldDef.bit_size == 16) {
	    switch ( fieldDef.pb_type ) {
	      case 'char':
	      case 'uint8':
	      case 'int8':
	      case 'string':
	      case 'uint16':
	      case 'int16':
	      case 'float':
	      case 'double':
	      case 'boolean':
	      case 'uint64':
	      case 'int64':
	        return fieldDef.pb_type;
	        break;
	      case 'uint32':
		    return 'uint16';
		    break;
	      case 'int32':
			return 'int16';
			break;
	      default:
	          self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getIntrinsicType: Intrinsic data type not found.' );
	          return undefined;
	    }
	  } else {
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
	          return fieldDef.pb_type;
	          break;
	      default:
	          self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getIntrinsicType: Intrinsic data type not found.' );
	          return undefined;
		}
     }
  }
}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 */
BinaryEncoder.prototype.instanceEmit = function( streamID, msg ) {
  this.instanceEmitter.emit( streamID, msg );
}


/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
BinaryEncoder.prototype.__proto__ = Emitter.prototype;


/**
 * Parse and return app name
 * @param  {String} path command path
 * @return {String}      App name
 */
BinaryEncoder.prototype.getAppNameFromPath = function( path ) {
  if ( typeof path === 'string' ) {
    var splitName = path.split( '/' );
    return splitName[ 1 ];
  }
  return undefined;
}


/**
 * Parse and return operation name
 * @param  {String} path command path
 * @return {String}      Operation name
 */
BinaryEncoder.prototype.getOperationFromPath = function( path ) {
  if ( typeof path === 'string' ) {
    var splitName = path.split( '/' );
    return splitName[ 2 ];
  }
  return undefined;
}


// DEBUG: This function is not being used any where
BinaryEncoder.prototype.getAppDefinition = function( appName ) {
  for ( var appID in this.defs.Airliner.apps ) {
    var app = this.defs.Airliner.apps[ appID ];
    if ( app.app_name == appName ) {
      return app;
    }
  }
}


/**
 * Gets operation object by path
 * @param  {String} inOpsPath command path
 * @return {Object}           operation object
 */
BinaryEncoder.prototype.getOperationByPath = function( inOpsPath ) {
  var self = this;
  try {
    for ( var appID in this.defs.Airliner.apps ) {
      var app = this.defs.Airliner.apps[ appID ];
      for ( var opID in app.operations ) {
        var operation = app.operations[ opID ];
        var opsPath = '/' + appID + '/' + opID;
        if ( opsPath === inOpsPath ) {
          return {
            ops_path: opsPath,
            operation: operation
          };
        }
      }
    }
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getOperationByPath: Cannot get operations by path.' );
  }
  return undefined;
}


/**
 * Get opertation object by command code and message id
 * @param  {Number} msgID   message id
 * @param  {Number} cmdCode command code
 * @return {Object}         operation object
 */
BinaryEncoder.prototype.getOperationByMsgIDandCC = function( msgID, cmdCode ) {
  var self = this;
  try {
    for ( var appID in this.defs.Airliner.apps ) {
      var app = this.defs.Airliner.apps[ appID ];
      for ( var opID in app.operations ) {
        var operation = app.operations[ opID ];
        var opsPath = '/' + appID + '/' + opID
        if ( ( parseInt( operation.airliner_mid ) === msgID ) & ( operation.airliner_cc === cmdCode ) ) {
          var result = {
            ops_path: opsPath,
            operation: operation
          };
          return result;
        }
      }
    }
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getOperationByMsgIDandCC: Cannot get operations by msgID and cmdCode.' );
  }
  return undefined;
}


/**
 * Get command definiton by command code and message id
 * @param  {Number} msgID   message id
 * @param  {Number} cmdCode command code
 * @return {Object}         command defintion
 */
BinaryEncoder.prototype.getCmdDefByMsgIDandCC = function( msgID, cmdCode ) {
  var cmdDef = this.getOperationByMsgIDandCC( msgID, cmdCode );

  if ( cmdDef.operation.airliner_msg !== '' ) {
    cmdDef.operational_names = this.getCmdOpNamesStripHeader( cmdDef.operation.airliner_msg )
  }

  return cmdDef;
}


/**
 * Get command definiton by command name
 * @param  {Number} msgName message name
 * @return {Object}         command defintion
 */
BinaryEncoder.prototype.getMsgDefByName = function( msgName ) {
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
 * Coumpute byte length of cmd defintion
 * @param  {Object} cmd command object
 * @return {Number}     byte length
 */
BinaryEncoder.prototype.getCmdByteLength = function( cmd ) {
  var self = this;
  try {
    if ( cmd.airliner_msg === '' ) {
      return this.cmdHeaderLength / 8;
    } else {
      var msgDef = this.getMsgDefByName( cmd.airliner_msg );

      if ( typeof msgDef !== 'undefined' ) {
        return msgDef.bit_size / 8;
      } else {
        return 0;
      }
    }
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getCmdByteLength: Cannot get command length.' );
  }
  return 0;
}


/**
 * Sets field
 * @param  {object} buffer    array object
 * @param  {Object} fieldDef  field defintion object
 * @param  {Number} bitOffset bit offset
 * @param  {Number} value     value
 */
BinaryEncoder.prototype.setField = function( buffer, fieldDef, bitOffset, value ) {
  var self = this;
  try {
    var fieldType = self.getIntrinsicType( fieldDef );

    if ( fieldDef.array_length > 1 ) {
      switch ( fieldType ) {
        case 'char':
          buffer.write( value, bitOffset / 8, fieldDef.array_length );
          break;

        case 'uint8':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            buffer.writeUInt8( value, bitOffset / 8 );
          }
          break;

        case 'string':
          buffer.write( value, bitOffset / 8, fieldDef.array_length );
          break;

        case 'uint16':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( self.endian == 'little' ) {
              buffer.writeUInt16LE( value, ( bitOffset / 8 ) + i );
            } else {
              buffer.writeUInt16BE( value, ( bitOffset / 8 ) + i );
            }
          }
          break;

        case 'int16':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( self.endian == 'little' ) {
              buffer.writeInt16LE( value, ( bitOffset / 8 ) + i );
            } else {
              buffer.writeInt16BE( value, ( bitOffset / 8 ) + i );
            }
          }
          break;

        case 'uint32':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( self.endian == 'little' ) {
              buffer.writeUInt32LE( value, ( bitOffset / 8 ) + i );
            } else {
              buffer.writeUInt32BE( value, ( bitOffset / 8 ) + i );
            }
          }
          break;

        case 'int32':
          for ( var i = 0; i < fieldDef.array_length; ++i ) {
            if ( self.endian == 'little' ) {
              buffer.writeInt32LE( value, ( bitOffset / 8 ) + i );
            } else {
              buffer.writeInt32BE( value, ( bitOffset / 8 ) + i );
            }
          }
          break;

        default:
          self.logErrorEvent( EventEnum.UNKNOWN_DATA_TYPE, 'setField: Unknown data type.  \'' + fieldType + '\'' );
      }
    } else {
      switch ( fieldType ) {
        case 'char':
          buffer.writeUInt8( value, bitOffset / 8 );
          break;

        case 'uint8':
          buffer.writeUInt8( value, bitOffset / 8 );
          break;

        case 'string':
          buffer.write( value, bitOffset / 8 );
          break;

        case 'uint16':
          if ( self.endian == 'little' ) {
            buffer.writeUInt16LE( value, bitOffset / 8 );
          } else {
            buffer.writeUInt16BE( value, bitOffset / 8 );
          }
          break;

        case 'int16':
          if ( self.endian == 'little' ) {
            buffer.writeInt16LE( value, bitOffset / 8 );
          } else {
            buffer.writeInt16BE( value, bitOffset / 8 );
          }
          break;

        case 'uint32':
          if ( self.endian == 'little' ) {
            buffer.writeUInt32LE( value, bitOffset / 8 );
          } else {
            buffer.writeUInt32BE( value, bitOffset / 8 );
          }
          break;

        case 'int32':
          if ( self.endian == 'little' ) {
            buffer.writeInt32LE( value, bitOffset / 8 );
          } else {
            buffer.writeInt32BE( value, bitOffset / 8 );
          }
          break;

        default:
          self.logErrorEvent( EventEnum.UNKNOWN_DATA_TYPE, 'setField: Unknown data type.  \'' + fieldType + '\'' );
      }
    }
  } catch ( err ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'setField: Unhandled exception. \'' + err + '\'' );
  }
}


/**
 * Sends command
 * @param  {Object} cmd  command Object
 * @param  {Object} args command arguments
 */
BinaryEncoder.prototype.sendCommand = function( cmd, args ) {
  var opDef = this.getOperationByPath( cmd.opsPath );
  if ( typeof opDef === 'undefined' ) {
    /* TODO */
    /* This command was not found. */
    this.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'Cmd ' + cmd.opsPath + ' operation definition not found.' );
  } else {
    var byteLength = this.getCmdByteLength( opDef.operation );

    if ( byteLength == 0 ) {
      /* TODO */
      /* This command was not found. */
      this.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'Cmd ' + cmd.opsPath + ' operation not found.' );
    } else {
      var buffer = new Buffer( byteLength );
      buffer.fill( 0x00 );

      buffer.writeUInt16BE( opDef.operation.airliner_mid, 0 );
      buffer.writeUInt16BE( this.sequence, 2 );
      buffer.writeUInt16BE( byteLength - 7, 4 );
      if ( this.endian == 'big' ) {
        buffer.writeUInt8( opDef.operation.airliner_cc, 6 );
        buffer.writeUInt8( 0, 7 );
      } else {
        buffer.writeUInt8( 0, 6 );
        buffer.writeUInt8( opDef.operation.airliner_cc, 7 );
      }

      this.sequence++;

      var msgDef = this.getMsgDefByName( opDef.operation.airliner_msg );

      if ( typeof msgDef === 'object' ) {
        if ( msgDef.hasOwnProperty( 'operational_names' ) ) {
          if ( typeof args === 'undefined' ) {
            this.logErrorEvent( EventEnum.INVALID_ARGUMENTS, 'Unable to send command \'' + cmd.opsPath + '\'.  Required args missing.' );
          } else {
            for ( var opNameID in msgDef.operational_names ) {
              var fieldNames = msgDef.operational_names[ opNameID ].field_path.split( '.' );
              var fieldName = fieldNames[ 0 ];

              var field = msgDef.fields[ fieldName ];

              var arg_path = msgDef.operational_names[ opNameID ].field_path;

              if ( args.hasOwnProperty( opNameID ) ) {
                var fieldDef = this.getFieldFromOperationalName( msgDef, msgDef.operational_names[ opNameID ].field_path, 0 );
                this.setField( buffer, fieldDef.fieldDef, fieldDef.bitOffset, args[ opNameID ] );
              }
            }
          }
        }
      }
      this.instanceEmit( config.get( 'binaryOutputStreamID' ), buffer );
    }
  }
}


/**
 * Get field from protobuf message
 * @param  {Object} pbMsgDef       protobuf message
 * @param  {Object} fieldPathArray field path array
 * @param  {Number} bitOffset      bit offset
 * @return {Object}                field object
 */
BinaryEncoder.prototype.getFieldObjFromPbMsg = function( pbMsgDef, fieldPathArray, bitOffset ) {
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
        if ( typeof childMsgDef === 'undefined' ) {
          /* This is a little bit of a kludge.  The airliner.json file has a sort of short cut.  If the
             operational name requires multiple drill downs to get the actual type, sometimes it
             collapses it into the first field.  So if we can't drill down any further, i.e. there is
             no childMsgDef and the variable is now undefined, just use the current field definition. */
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
                  fieldDef.airliner_type = fieldDef.pb_type;
                  break;

                default:
                  self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'Data type not found.' );
              }
          }

          return {
            fieldDef: fieldDef,
            bitOffset: fieldDef.bit_offset + bitOffset
          };
        } else {
          fieldPathArray.shift();
          return self.getFieldObjFromPbMsg( childMsgDef, fieldPathArray, fieldDef.bit_offset + bitOffset );
        }
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
BinaryEncoder.prototype.getFieldFromOperationalName = function( msgDef, opName, bitOffset ) {
  var self = this;
  var pbMsg = undefined;
  try {
    var op = msgDef.operational_names[ opName ];
    var fieldPathArray = opName.split( '.' );

    var pbMsg = this.getFieldObjFromPbMsg( msgDef, fieldPathArray, bitOffset );
  } catch ( e ) {
    self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'getFieldFromOperationalName: Unable to retrive field.  \'' + e + '\'' );
  }
  return pbMsg;
}


/**
 * Checks if given message id belongs to a commad message
 * @param  {Number} msgID message id
 * @return {Boolean}      true if the message id belongs to commad message otherwise false
 */
BinaryEncoder.prototype.isCommandMsg = function( msgID ) {
  if ( ( msgID & 0x1000 ) == 0x1000 ) {
    return true;
  } else {
    return false;
  }
}


/**
 * Checks if given message id belongs to a telemetry message
 * @param  {Number} msgID message id
 * @return {Boolean}      true if the message id belongs to telemetry message otherwise false
 */
BinaryEncoder.prototype.isTelemetryMsg = function( msgID ) {
  if ( ( msgID & 0x1000 ) == 0x1000 ) {
    return false;
  } else {
    return true;
  }
}


/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryEncoder.prototype.logDebugEvent = function( eventID, text ) {
  this.instanceEmit( 'events-debug', {
    sender: this,
    component: 'BinaryEncoder',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryEncoder.prototype.logInfoEvent = function( eventID, text ) {
  this.instanceEmit( 'events-info', {
    sender: this,
    component: 'BinaryEncoder',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryEncoder.prototype.logErrorEvent = function( eventID, text ) {
  this.instanceEmit( 'events-error', {
    sender: this,
    component: 'BinaryEncoder',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
BinaryEncoder.prototype.logCriticalEvent = function( eventID, text ) {
  this.instanceEmit( 'events-critical', {
    sender: this,
    component: 'BinaryEncoder',
    eventID: eventID,
    text: text
  } );
}