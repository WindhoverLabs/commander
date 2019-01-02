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

var Parser = require( 'binary-parser' ).Parser;
const net = require( 'net' );
var Emitter = require( 'events' );
var fs = require( 'fs' );
const dgram = require( 'dgram' );
const util = require( 'util' );
var protobuf = require( 'protobufjs' );
var mergeJSON = require( 'merge-json' );
var convict = require( 'convict' );
var socket_io = require( 'socket.io' );
var CommanderInstance = require( './commander_instance.js' );
var CommanderApp = require( './commander_app.js' );
var path = require( 'path' );
const http = require( 'http' );
const ContentTypeEnum = require( './classes/CdrPlugin.js' ).ContentTypeEnum;

/**
 * Event id's
 * @type {Object}
 */
var EventEnum = Object.freeze( {
  'INITIALIZED': 1,
  'SOCKET_CONNECT_ERROR': 2,
  'SOCKET_CONNECT_TIMEOUT': 3,
  'SOCKET_RECONNECT': 4,
  'SOCKET_RECONNECT_ATTEMPT': 5,
  'SOCKET_RECONNECTING': 6,
  'SOCKET_RECONNECT_ERROR': 7,
  'SOCKET_RECONNECT_FAILED': 8,
  'SOCKET_DISCONNECT': 9,
  'SOCKET_PING': 10,
  'SOCKET_PONG': 11,
  'MESSAGE_RECEIVED': 12,
  'SOCKET_PUBLIC_FUNCTION_CALL': 13,
  'UNHANDLED_EXCEPTION': 14
} );

var emit = Emitter.prototype.emit;

exports = module.exports = Commander;

/**
 * Count listeners
 * @type {Function}
 */
var listenerCount = Emitter.listenerCount ||
  function( emitter, type ) {
    return emitter.listeners( type ).length
  }

var publicFunctions = [
  'getDirectoryListing',
  'getCmdDef',
  'getTlmDefs',
  'sendCommand',
  'getPanels',
  'getLayouts',
  'getWidgets',
  'getDefaultLayout',
  'getADSBJson',
  'queryConfigDB'
];

var config = require( './config.js' );

const ROOT_INSTANCE_NAME = 'ROOT';


/**
 * Constructor for commander
 * @param       {String} workspace  path to commander workspace
 * @param       {String} configFile path to commander-config.json
 * @constructor
 */
function Commander( workspace, configFile ) {
  this.workspace = workspace;
  this.instances = {};
  var self = this;
  this.registeredFunctions = [];
  this.registeredStreams = [];

  /* Load environment dependent configuration */
  config.loadFile( configFile );

  /* Perform validation */
  config.validate( {
    allowed: 'strict'
  } );

  /* Add the root instance. */
  this.addInstance( ROOT_INSTANCE_NAME );

  var cfgInstances = config.get( 'instances' );

  for ( var i = 0; i < cfgInstances.length; ++i ) {
    this.instances[ cfgInstances[ i ].name ] = new CommanderInstance( this, cfgInstances[ i ] );
  }

  //Socket.io
  var io = socket_io();
  global.NODE_APP.io = io;

  io.on( 'connection', function( socket ) {
    socket.enabledStreams = [];

    self.subscribe( updateTelemetry, function( subscriberID ) {
      socket.subscriberID = subscriberID;
    } );


    socket.on( 'connect_error', function( err ) {
      self.logErrorEvent( EventEnum.SOCKET_CONNECT_ERROR, 'SocketIO: Socket connect error.  \'' + err + '\'' );
    } );

    socket.on( 'connect_timeout', function() {
      self.logErrorEvent( EventEnum.SOCKET_CONNECT_TIMEOUT, 'SocketIO: Socket timeout.' );
    } );

    socket.on( 'reconnect', function( num ) {
      self.logInfoEvent( EventEnum.SOCKET_RECONNECT, 'SocketIO: Socket successfully reconnected on attempt # \'' + num + '\'.' );
    } );

    socket.on( 'reconnect_attempt', function() {
      self.logInfoEvent( EventEnum.SOCKET_RECONNECT_ATTEMPT, 'SocketIO: Socket reconnect attempt.' );
    } );

    socket.on( 'reconnecting', function( num ) {
      self.logInfoEvent( EventEnum.SOCKET_RECONNECTING, 'SocketIO: Socket reconnecting attempt # \'' + num + '\'.' );
    } );

    socket.on( 'reconnect_error', function( err ) {
      self.logErrorEvent( EventEnum.SOCKET_RECONNECT_ERROR, 'SocketIO: Socket reconnect error.  \'' + err + '\'.' );
    } );

    socket.on( 'reconnect_failed', function() {
      self.logErrorEvent( EventEnum.SOCKET_RECONNECT_FAILED, 'SocketIO: Socket reconnect failed.' );
    } );

    socket.on( 'disconnect', function( err ) {
      self.logInfoEvent( EventEnum.SOCKET_DISCONNECT, 'SocketIO: Socket ' + socket.id + ' disconnected.' );
      socket.removeAllListeners();
      self.removeSubscriber( socket.subscriberID );
      socket.disconnect( true );
    } );

    socket.on( 'ping', function() {
      self.logDebugEvent( EventEnum.SOCKET_PING, 'SocketIO: Socket ping.' );
    } );

    socket.on( 'pong', function( latency ) {
      self.logDebugEvent( EventEnum.SOCKET_PONG, 'SocketIO: Socket pong (' + latency + ' ms).' );
    } );

    socket.on( 'subscribe', function( opsPaths ) {
      self.addSubscription( socket.subscriberID, opsPaths );
    } );

    socket.on( 'enable-stream', function( streamName ) {
      socket.enabledStreams[ streamName ] = true;
    } );

    socket.on( 'disable-stream', function( streamName ) {
      socket.enabledStreams[ streamName ] = false;
    } );

    socket.on( 'sendCmd', function( cmdObj ) {
      self.sendCmd( cmdObj );
    } );

    socket.on( 'PING', function( startTime ) {
      socket.emit( 'PONG', startTime );
    } );

    socket.on( 'pluginFunction', function( pluginName, funcName, args, cb ) {
      for ( var i in self.registeredFunctions ) {
        if ( self.registeredFunctions[ i ].pluginName === pluginName ) {
          if ( self.registeredFunctions[ i ].funcName === funcName ) {
            if ( typeof self.registeredFunctions[ i ].cb === 'function' ) {
              self.registeredFunctions[ i ].cb( args, function( results ) {
                cb( results );
              } );
            }
          }
        }
      }
    } );

    function updateTelemetry( update ) {
      socket.volatile.emit( 'telemetry-update', update );
    }

    for ( var i in self.registeredStreams ) {
      var streamName = self.registeredStreams[ i ].streamName;
      self.defaultInstance.emitter.on( streamName, function( newData ) {
        var stream = socket.enabledStreams[ streamName ];
        if ( typeof stream === 'boolean' ) {
          if ( stream === true ) {
            socket.volatile.emit( streamName, newData );
          }
        }
      } );
    };

    for ( var i in publicFunctions ) {
      ( function( funcName ) {
        socket.on( funcName, function() {
          var cb = arguments[ arguments.length - 1 ];
          self.logDebugEvent( EventEnum.SOCKET_PUBLIC_FUNCTION_CALL, 'SocketIO: ' + funcName );
          if ( typeof self[ funcName ] !== 'function' ) {
            self.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, 'Invalid function' );
          } else {
            self[ funcName ].apply( self, arguments );
          }
        } );
      } )( publicFunctions[ i ] );
    }
  } );
  // return this;
}


/**
 * Sets a default commander instance
 * @param  {Object} instance instance object
 */
Commander.prototype.setDefaultInstance = function( instance ) {
  var self = this;
  this.defaultInstance = instance;

  this.defaultInstance.emitter.on( 'advertise-stream', function( streamName ) {
    self.registeredStreams.push( {
      streamName: streamName
    } );
  } );
}

/**
 * Get panels by path
 * @param  {String} paths     directory path
 * @param  {Object} panelsObj panel object
 */
Commander.prototype.getPanelsByPath = function( paths, panelsObj ) {
  if ( paths.length == 1 ) {
    var targetPath = paths[ 0 ];
    if ( targetPath === '' ) {
      return panelsObj;
    } else {
      var targetObj = panelsObj[ targetPath ];
      if ( typeof targetObj === 'object' ) {
        var nodes = targetObj.nodes;
        var outNodes = {};
        for ( var nodeID in nodes ) {
          if ( typeof nodes[ nodeID ].type !== 'undefined' ) {
            if ( nodes[ nodeID ].type === ContentTypeEnum.PANEL ) {
              outNodes[ nodeID ] = nodes[ nodeID ];
            }
          } else {
            outNodes[ nodeID ] = nodes[ nodeID ];
          }
        }
        return outNodes;
      }
    }
  } else {
    var targetPath = paths[ 0 ];
    var targetObj = panelsObj[ targetPath ];
    if ( typeof targetObj === 'object' ) {
      var nodes = targetObj.nodes;
      paths.shift();
      return this.getPanelsByPath( paths, nodes );
    }
  }
}


Commander.prototype.registerFunction = function( pluginName, cb ) {
  this.registeredFunctions.push( {
    pluginName: pluginName,
    funcName: cb.name,
    cb: cb
  } );
}


Commander.prototype.registerStreams = function( streamName ) {
  this.registeredStreams.push( {
    streamName: streamName
  } );
}


/**
 * Get layout by path
 * @param  {String} paths     directory path
 * @param  {Object} layoutsObj layout object
 */
Commander.prototype.getLayoutsByPath = function( paths, layoutsObj ) {
  if ( paths.length == 1 ) {
    var targetPath = paths[ 0 ];
    if ( targetPath === '' ) {
      return layoutsObj;
    } else {
      var targetObj = layoutsObj[ targetPath ];
      if ( typeof targetObj === 'object' ) {
        var nodes = targetObj.nodes;
        var outNodes = {};
        for ( var nodeID in nodes ) {
          if ( typeof nodes[ nodeID ].type !== 'undefined' ) {
            if ( nodes[ nodeID ].type === ContentTypeEnum.LAYOUT ) {
              outNodes[ nodeID ] = nodes[ nodeID ];
            }
          } else {
            outNodes[ nodeID ] = nodes[ nodeID ];
          }
        }
        return outNodes;
      }
    }
  } else {
    var targetPath = paths[ 0 ];
    var targetObj = layoutsObj[ targetPath ];
    if ( typeof targetObj === 'object' ) {
      var nodes = targetObj.nodes;
      paths.shift();
      return this.getLayoutsByPath( paths, nodes );
    }
  }
}

/**
 * Get panels by widget
 * @param  {String} paths     directory path
 * @param  {Object} panelsObj panel object
 */
Commander.prototype.getWidgetsByPath = function( paths, panelsObj ) {
  if ( paths.length == 1 ) {
    var targetPath = paths[ 0 ];
    if ( targetPath === '' ) {
      return panelsObj;
    } else {

      var targetObj = panelsObj[ targetPath ];
      if ( typeof targetObj === 'object' ) {
        var nodes = targetObj.nodes;
        var outNodes = {};
        for ( var nodeID in nodes ) {
          if ( typeof nodes[ nodeID ].type !== 'undefined' ) {
            if ( nodes[ nodeID ].type === ContentTypeEnum.WIDGET ) {
              outNodes[ nodeID ] = nodes[ nodeID ];
            }
          } else {
            outNodes[ nodeID ] = nodes[ nodeID ];
          }
        }
        return outNodes;
      }
    }
  } else {
    var targetPath = paths[ 0 ];
    var targetObj = panelsObj[ targetPath ];
    if ( typeof targetObj === 'object' ) {
      var nodes = targetObj.nodes;
      paths.shift();
      return this.getWidgetsByPath( paths, nodes );
    }
  }
}

/**
 * Gets panels
 * @param  {String}   inPath input path
 * @param  {Function} cb     callback
 */
Commander.prototype.getPanels = function( inPath, cb ) {
  var outObj = {};

  var paths = inPath.split( '/' );

  paths.shift();
  var content = this.getPanelsByPath( paths, global.CONTENT_TREE );

  cb( content );
}

/**
 * Gets default layout configuration
 * @param  {Function} cb callback on response
 */
Commander.prototype.getDefaultLayout = function( cb ) {
  /* is a stub needs to go in some configuration */
  var layout = fs.readFileSync( global.CDR_WORKSPACE + '/plugins/cfe/web/pilot/main_layout.lyt' );
  cb( JSON.parse( layout ) );
}

/******************* STUBS ********************************************/
/**
 * Gets ADSB data in JSON (stub)
 * @param  {Function} cb Callback
 */
Commander.prototype.getADSBJson = function( cb ) {
  http.get( 'http://127.0.0.1:8080/dump1090/data.json', ( resp ) => {
    var data = ''
    resp.on( 'data', ( chunk ) => {
      data += chunk;
    } );
    resp.on( 'end', () => {
      cb( JSON.parse( data ) );
    } );
  } ).on( 'error', ( e ) => {
    this.logErrorEvent( EventEnum.UNHANDLED_EXCEPTION, `${e.message}` );
  } );
}

/******************* STUBS ********************************************/

/**
 * Gets layout
 * @param  {String}   inPath input path
 * @param  {Function} cb     callback
 */
Commander.prototype.getLayouts = function( inPath, cb ) {
  var outObj = {};

  var paths = inPath.split( '/' );

  paths.shift();

  var content = this.getLayoutsByPath( paths, global.CONTENT_TREE );

  cb( content );
}

/**
 * Gets widget
 * @param  {String}   inPath input path
 * @param  {Function} cb     callback
 */
Commander.prototype.getWidgets = function( inPath, cb ) {
  var outObj = {};

  var paths = inPath.split( '/' );

  paths.shift();

  var content = this.getWidgetsByPath( paths, global.CONTENT_TREE );

  cb( content );
}

/**
 * Query configuration database
 * @param  {String}   inPath input path
 * @param  {Function} cb     callback
 */
Commander.prototype.queryConfigDB = function( inPath, cb ) {
  if ( typeof this.defaultInstance.emit === 'function' & typeof inPath == 'string' ) {
    this.defaultInstance.emit( config.get( 'queryConfigStreamID' ), inPath, function( resp ) {
      cb( resp );
    } );
  };
}


/**
 * Gets command definition
 * @param  {Object}   cmdObj command object
 * @param  {Function} cb     callback
 */
Commander.prototype.getCmdDef = function( cmdObj, cb ) {
  if ( typeof this.defaultInstance.emit === 'function' ) {
    if ( typeof cmdObj == 'object' && cmdObj.hasOwnProperty( 'name' ) ) {
      this.defaultInstance.emit( config.get( 'cmdDefReqStreamID' ), {
        opsPath: cmdObj.name
      }, function( resp ) {
        cb( resp );
      } );
    }
  };
}

/**
 * Gets telemetry definitions
 * @param  {Object}   tlmObjs telemetry object
 * @param  {Function} cb      callback
 */
Commander.prototype.getTlmDefs = function( tlmObjs, cb ) {
  if ( typeof this.defaultInstance.emit === 'function' && typeof tlmObjs == 'object' ) {
    this.defaultInstance.emit( config.get( 'varDefReqStreamID' ), tlmObjs, function( resp ) {
      cb( resp );
    } );
  };
}

/**
 * Passes 'sendCommand' string into callback
 * @param  {Function} cb callback
 */
Commander.prototype.sendCommand = function( cb ) {
  cb( 'sendCommand' );
}



/* Speed up calls to hasOwnProperty */
var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Sends command name and arguments
 * @param  {String} cmdName command name
 * @param  {Object} args    argument object
 */
Commander.prototype.sendCmd = function( cmdName, args ) {
  if ( cmdName.hasOwnProperty( 'ops_path' ) && cmdName.hasOwnProperty( 'args' ) ) {
    this.defaultInstance.emit( config.get( 'cmdSendStreamID' ), cmdName, args );
  }
}


/**
 * Subscribe to telemetry server
 * @param  {String}   varName telemetry name
 * @param  {Function} cb      callback
 */
Commander.prototype.subscribe = function( updateCallback, cb ) {
  var self = this;
  this.defaultInstance.emit( config.get( 'reqSubscribeStreamID' ), {
    cmd: 'addSubscriber',
    cb: updateCallback
  }, function( subscriberID ) {
    cb( subscriberID );
  } );
}


/**
 * Subscribe to telemetry
 * @param  {String}   varName telemetry name
 * @param  {Function} cb      callback
 */
Commander.prototype.addSubscription = function( subscriberID, varName ) {
  var self = this;
  if ( typeof varName == 'object' ) {
    this.defaultInstance.emit( config.get( 'reqSubscribeStreamID' ), {
      cmd: 'addSubscription',
      subscriberID: subscriberID,
      opsPath: varName
    } );
  }
}


/**
 * Unsubscribe from telemetry
 * @param  {String}   varName telemetry name
 * @param  {Function} cb      callback
 */
Commander.prototype.removeSubscription = function( subscriberID, varName ) {
  var self = this;
  if ( typeof varName == 'object' ) {
    this.defaultInstance.emit( config.get( 'reqSubscribeStreamID' ), {
      cmd: 'removeSubscription',
      subscriberID: subscriberID,
      opsPath: varName
    } );
  }
}


/**
 * Unsubscribe from telemetry server
 * @param  {String}   varName telemetry name
 * @param  {Function} cb      callback
 */
Commander.prototype.removeSubscriber = function( subscriberID ) {
  var self = this;
  this.defaultInstance.emit( config.get( 'reqSubscribeStreamID' ), {
    cmd: 'removeSubscriber',
    subscriberID: subscriberID
  } );
}



/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
Commander.prototype.__proto__ = Emitter.prototype;


/**
 * Add instance to commander
 * @param  {String}   name instance name
 * @param  {Function} cb   callback
 */
Commander.prototype.addInstance = function( name, cb ) {
  this.instances[ name ] = new CommanderInstance( name, this );

  if ( typeof cb === 'function' ) {
    cb( this.instances[ name ] );
  };
}


/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
Commander.prototype.logDebugEvent = function( eventID, text ) {
  this.logEvent( ROOT_INSTANCE_NAME, 'Commander', 'Client', eventID, 'DEBUG', text );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
Commander.prototype.logInfoEvent = function( eventID, text ) {
  this.logEvent( ROOT_INSTANCE_NAME, 'Commander', 'Client', eventID, 'INFO', text );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
Commander.prototype.logErrorEvent = function( eventID, text ) {
  this.logEvent( ROOT_INSTANCE_NAME, 'Commander', 'Client', eventID, 'ERROR', text );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
Commander.prototype.logCriticalEvent = function( eventID, text ) {
  this.logEvent( ROOT_INSTANCE_NAME, 'Commander', 'Client', eventID, 'CRIT', text );
}


/**
 * Logs events
 * @param  {String} instance    instance name
 * @param  {String} plugin      plugin name
 * @param  {String} component   component name
 * @param  {Number} eventID     event id
 * @param  {String} criticality level of criticality
 * @param  {String} text        event message text
 */
Commander.prototype.logEvent = function( instance, plugin, component, eventID, criticality, text ) {
  /* TODO - Write something more formal, like file logging and filtering. */

  if ( criticality !== '---' ) {
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
      ( "0" + ( date.getUTCMonth() + 1 ) ).slice( -2 ) + "/" +
      ( "0" + date.getUTCDate() ).slice( -2 ) + " " +
      ( "0" + date.getUTCHours() ).slice( -2 ) + ":" +
      ( "0" + date.getUTCMinutes() ).slice( -2 ) + ":" +
      ( "0" + date.getUTCSeconds() ).slice( -2 );

    switch ( criticality ) {
      case 'DEBUG':
        //console.log( FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + component + ' | ' + FgWhite + plugin + ' | ' + FgWhite + eventID + ' | ' + FgWhite + criticality + FgWhite + ' | ' + FgWhite + text );
        break;

      case 'INFO':
        console.log( FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + component + ' | ' + FgWhite + plugin + ' | ' + FgWhite + eventID + ' | ' + FgWhite + criticality + FgWhite + ' | ' + FgWhite + text );
        break;

      case 'ERROR':
        console.log( FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + component + ' | ' + FgWhite + plugin + ' | ' + FgWhite + eventID + ' | ' + FgRed + criticality + FgWhite + ' | ' + FgWhite + text );
        break;

      case 'CRIT':
        console.log( FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + component + ' | ' + FgWhite + plugin + ' | ' + FgWhite + eventID + ' | ' + BgRed + FgBlack + Blink + criticality + BgBlack + FgWhite + ' | ' + BgRed + FgBlack + Blink + text + BgBlack + FgWhite );
        break;

      default:
        console.log( FgGreen + 'EVT' + FgWhite + ' | ' + FgCyan + dateString + FgWhite + ' | ' + FgWhite + instance + ' | ' + FgWhite + component + ' | ' + FgWhite + plugin + ' | ' + FgWhite + eventID + ' | ' + FgMagenta + criticality + FgWhite + ' | ' + FgMagenta + text + BgBlack + FgWhite );
        break;
    }
  }
}