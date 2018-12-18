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
const util = require( 'util' );
var convict = require( 'convict' );
var jp = require( 'jsonpath' );
var config = require( './config.js' );
const Sparkles = require( 'sparkles' );
const uuidV1 = require( 'uuid/v1' );

/**
 * Event id's
 * @type {Object}
 */
var EventEnum = Object.freeze( {
  'INITIALIZED': 1
}, {
  'INVALID_SUBSCRIPTION_REQUEST': 2
}, {
  'CONFIG_ERROR': 3
}, {
  'UNHANDLED_ERROR': 4
}, {
  'INVALID_UNSUBSCRIBE_REQUEST': 5
}, {
  'INVALID_REQUEST': 6
} );

var emit = Emitter.prototype.emit;

exports = module.exports = VariableServer;

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
 * Constructor for variable server
 * @param       {String} configFile path to variable-server-config.json file
 * @constructor
 */
function VariableServer( configFile ) {
  var self = this;
  this.vars = {};
  this.instanceEmitter;
  this.subscribers = {};

  /* Load environment dependent configuration */
  config.loadFile( configFile );

  /* Perform validation */
  config.validate( {
    allowed: 'strict'
  } );
};

/**
 * Checks if a object is empty
 * @param  {Object}  obj object
 * @return {Boolean}     true if empty otherwise false
 */
VariableServer.prototype.isEmpty = function( obj ) {
  if ( obj.length != undefined & typeof obj != 'string' ) {
    if ( obj.length == 0 ) {
      return true;
    } else {
      return false;
    }
  } else if ( typeof obj === 'object' ) {
    for ( var key in obj ) {
      if ( obj.hasOwnProperty( key ) )
        return false;
    }
    return true;
  } else {
    return undefined;
  }
}

/**
 * Parse and return app name
 * @param  {String} path telemetry path
 * @return {String}      App name
 */
VariableServer.prototype.getAppNameFromPath = function( path ) {
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
VariableServer.prototype.getOpNameFromPath = function( path ) {
  if ( typeof path === 'string' ) {
    var splitName = path.split( '/' );
    return splitName[ 2 ];
  }
  return undefined;
}


/**
 * Returns message operation path
 * @param  {String} path telemetry path
 * @return {String}      message operation path
 */
VariableServer.prototype.getMessageOpsPath = function( path ) {
  var appName = this.getAppNameFromPath( path );
  var opName = this.getOpNameFromPath( path );
  if ( appName != undefined & opName != undefined ) {
    var msgOpsPath = '/' + appName + '/' + opName;
    return msgOpsPath;
  } else {
    return undefined
  }

}


/**
 * Parse and return variable operation name
 * @param  {String} path telemetry path
 * @return {String}      variable operation name
 */
VariableServer.prototype.getVariableOpsName = function( path ) {
  if ( typeof path === 'string' ) {
    var splitName = path.split( '/' );
    return splitName[ 3 ];
  }
  return undefined;
}


/**
 * Parse and return varibles from message operation name
 * @param  {String} opsName operation name
 * @return {Object}         output variables
 */
VariableServer.prototype.getVariablesFromMsgOpsName = function( opsName ) {
  var self = this;
  var outVars = {};
  for ( var opsPath in self.vars ) {
    var msgOpsName = self.getMessageOpsPath( opsPath );
    if ( msgOpsName == opsName ) {
      outVars[ opsPath ] = self.vars[ opsPath ];
    }
  }
  return outVars;
}


/**
 * Configure and set instance emitter
 * @param  {Object} newInstanceEmitter instance of instance emitter
 */
VariableServer.prototype.setInstanceEmitter = function( newInstanceEmitter ) {
  var self = this;
  this.instanceEmitter = newInstanceEmitter;

  this.instanceEmitter.on( config.get( 'jsonInputStreamID' ), function( message ) {
    var vars = self.getVariablesFromMsgOpsName( message.opsPath );
    if ( self.isEmpty( vars ) == false ) {
      /* We have variables either persisted or subscribed to in this message.  Iterate through
       * each variable that we're looking for.
       */
      var currentDateAndTime = new Date();
      var subscribersToUpdate = {};

      var msgRoot = message.content;

      for ( var itemID in vars ) {
        var variable = vars[ itemID ];
        var varOpName = self.getVariableOpsName( itemID );
        var valueObj = jp.query( msgRoot, '$.' + varOpName );

        if ( self.isEmpty( valueObj ) == true ) {
          self.logErrorEvent( EventEnum.INVALID_SUBSCRIPTION_REQUEST, 'OpName ' + itemID + ' not found.' );
        } else {

          var value = valueObj[ 0 ];

          /* Update the current value. */
          if ( variable.hasOwnProperty( 'sample' ) == false ) {
            variable.sample = [];
          }
          variable.sample.push( {
            value: value,
            msgTime: message.msgTime,
            gndTime: currentDateAndTime
          } );

          /* Get the persistence value and set the array of retained values accordingly. */
          var persistenceCount = self.getVariablePersistence( itemID );

          if ( variable.sample.length > persistenceCount ) {
            /* The array is too big.  We need to take the oldest sample out. */
            variable.sample.shift();
          }

          /* Now loop through all the subscribers, if any. */
          for ( var subscriber in variable.subscribers ) {
            /* First make sure this subscriber callback still exists. */
            if ( subscribersToUpdate.hasOwnProperty( subscriber ) == false ) {
              /* This is the first time in this function call that we've
               * processed a variable for this particular subscriber.
               * Create a new subscriber record in this temporary
               * object.
               */
              subscribersToUpdate[ subscriber ] = {
                subscriber: variable.subscribers[ subscriber ],
                variables: {}
              };
            }

            subscribersToUpdate[ subscriber ].variables[ itemID ] = {};

            var updatedVariable = subscribersToUpdate[ subscriber ].variables[ itemID ];

            updatedVariable[ 'sample' ] = [ variable.sample[ variable.sample.length - 1 ] ];
          }
        }
      }

      /* Lastly, loop through all the subscriptions to update, and send them
       * an array of updates.
       */
      for ( var subscriber in subscribersToUpdate ) {
        var callback = self.subscribers[ subscribersToUpdate[ subscriber ].subscriber ];

        /* Make sure this callback still exists. */
        if ( typeof callback === 'function' ) {
          callback( subscribersToUpdate[ subscriber ].variables );
        } else {
          /* TODO:  Release this subscriber. */
        }
      }
    }
    self.instanceEmit( config.get( 'outputEventsStreamID' ), 'message-received' );
  } );

  this.instanceEmitter.on( config.get( 'varDefReqStreamID' ), function( req, cb ) {
    self.getTlmDefinitions( req, cb );
  } );

  this.instanceEmitter.on( config.get( 'reqSubscribeStreamID' ), function( req, cb ) {
    if ( req.cmd === 'addSubscription' ) {
      if ( typeof req.opsPath === 'string' || req.opsPath instanceof String ) {
        self.addSubscription( req.subscriberID, req.opsPath );
      } else if ( Array.isArray( req.opsPath ) ) {
        for ( var i = 0; i < req.opsPath.length; ++i ) {
          self.getTlmDefinitions( {
            name: req.opsPath[ i ]
          }, function( tlmDef ) {
            self.addSubscription( req.subscriberID, req.opsPath[ i ] );
          } );
        }
      } else {
        self.logErrorEvent( EventEnum.INVALID_SUBSCRIPTION_REQUEST, 'Subscription request invalid. \'' + req + '\'' );
      }
    } else if ( req.cmd === 'removeSubscription' ) {
      if ( typeof req.opsPath === 'string' || req.opsPath instanceof String ) {
        self.removeSubscription( req, cb );
      } else if ( Array.isArray( req.opsPath ) ) {
        for ( var i = 0; i < req.opsPath.length; ++i ) {
          self.removeSubscription( req.opsPath[ i ], cb );
        }
      } else {
        self.logErrorEvent( EventEnum.INVALID_UNSUBSCRIBE_REQUEST, 'Unsubscribe request invalid. \'' + req + '\'' );
      }
    } else if ( req.cmd === 'addSubscriber' ) {
      var id = uuidV1();
      self.subscribers[ id ] = req.cb;
      cb( id );
    } else if ( req.cmd === 'removeSubscriber' ) {
      delete self.subscribers[ req.subscriberID ];
    } else {
      self.logErrorEvent( EventEnum.INVALID_REQUEST, 'Request invalid. \'' + req + '\'' );
    }
  } );

  var variables = config.get( 'variables' );
  if ( typeof variables !== 'undefined' ) {
    for ( var i = 0; i < variables.length; ++i ) {
      if ( typeof variables[ i ].persistence !== 'undefined' ) {
        this.setVariablePersistence( variables[ i ].name, variables[ i ].persistence.count );
      }
    }
  }

  this.logInfoEvent( EventEnum.INITIALIZED, 'Initialized' );
}

/**
 * Checks if varName is an array
 * @param  {String} varName variable name
 * @return {Boolean}        true if variable name is a array otherwise false
 */
VariableServer.prototype.isVarNameAnArray = function( varName ) {
  if ( typeof varName == 'string' ) {
    var start = varName.indexOf( '[' );

    if ( start > 0 ) {
      var end = varName.indexOf( ']' );

      if ( end > start ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Gets telemetry definitions and calls callback function on it
 * @param  {Object}   req telemetry definition request object
 * @param  {Function} cb  callback
 */
VariableServer.prototype.getTlmDefinitions = function( req, cb ) {
  var self = this;
  this.instanceEmit( config.get( 'tlmDefReqStreamID' ), req, function( tlmDefs ) {
    if ( typeof tlmDefs === 'undefined' ) {
      cb( undefined );
    } else {
      if ( typeof tlmDefs.length === 'number' ) {
        /* This must be an array. */
        var outTlmDefs = [];
        for ( var i = 0; i < tlmDefs.length; ++i ) {
          var outTlmDef = tlmDefs[ i ];
          outTlmDef.persistence = {};
          outTlmDef.persistence.count = self.getVariablePersistence( tlmDefs[ i ].opsPath );
          outTlmDef.timeout = self.getVariableTimeout( tlmDefs[ i ].opsPath );
          outTlmDefs.push( outTlmDef );
        }
        cb( outTlmDefs );
      } else {
        /* This is a single request. */
        var outTlmDef = tlmDefs;
        outTlmDef.persistence = {};
        outTlmDef.persistence.count = self.getVariablePersistence( tlmDefs.opsPath );
        outTlmDef.timeout = self.getVariableTimeout( tlmDefs.opsPath );
        cb( outTlmDef );
      }
    }
  } );
};


/**
 * Add subscribers to variable (opsPath)
 * @param  {String}   opsPath operation path
 * @param  {Function} cb      callback
 */
VariableServer.prototype.addSubscription = function( subscriberID, opsPath ) {
  if ( this.vars.hasOwnProperty( opsPath ) == false ) {
    /* We have not received this variable yet and it does
     * not already have a predefinition.  Create a new record. */
    var variable = {
      opsPath: opsPath,
      arrayIndices: {}
    };
    this.vars[ opsPath ] = variable;
  } else {
    /* We've already received this or have a predefinition. */
    var variable = this.vars[ opsPath ];

    /* Send however many values are currently persisted. */
    var outVar = {};
    outVar[ opsPath ] = {};

    /* Send all the persisted values of the value */
    outVar[ opsPath ].sample = variable.sample;

    this.subscribers[ subscriberID ]( outVar );
  }

  if ( variable.hasOwnProperty( 'subscribers' ) == false ) {
    variable[ 'subscribers' ] = new Array();
  }

  variable.subscribers.push( subscriberID );
}


/**
 * Sets a persistence value to variable (opsPath)
 * @param  {String} opsPath operation path
 * @param  {Number} count   persistence count
 */
VariableServer.prototype.setVariablePersistence = function( opsPath, count ) {
  if ( this.vars.hasOwnProperty( opsPath ) == false ) {
    /* We have not received this variable yet and it does
     * not already have a predefinition.  Create a new record. */
    var variable = {
      opsPath: opsPath
    };
    this.vars[ opsPath ] = variable;
  } else {
    /* We've already received this or have a predefinition. */
    var variable = this.vars[ opsPath ];
  }

  if ( variable.hasOwnProperty( 'persistence' ) == false ) {
    /* We have not the persistence for this variable yet. */
    variable.persistence = {};
  }

  variable.persistence = {
    count: count
  };
}


/**
 * Gets a persistence value to variable (opsPath)
 * @param  {String} opsPath operation path
 */
VariableServer.prototype.getVariablePersistence = function( opsPath ) {
  if ( this.vars.hasOwnProperty( opsPath ) == false ) {
    /* We have not received this variable yet and it does
     * not already have a predefinition.  Return the default of 1. */
    return 1;
  } else {
    /* We've already received this or have a predefinition. */
    if ( typeof this.vars[ opsPath ].persistence === 'undefined' ) {
      /* Persistence is not set.  Return the default of 1. */
      return 1;
    } else {
      return this.vars[ opsPath ].persistence.count;
    }
  }
}


/**
 * Sets a timeout value to variable (opsPath)
 * @param  {String} opsPath operation path
 * @param  {Number} timeout timeout value
 */
VariableServer.prototype.setVariableTimeout = function( opsPath, timeout ) {
  if ( this.vars.hasOwnProperty( opsPath ) == false ) {
    /* We have not received this variable yet and it does
     * not already have a predefinition.  Create a new record. */
    var variable = {
      opsPath: opsPath
    };
    this.vars[ opsPath ] = variable;
  } else {
    /* We've already received this or have a predefinition. */
    var variable = this.vars[ opsPath ];
  }

  if ( variable.hasOwnProperty( 'timeout' ) == false ) {
    /* We have not the timeout for this variable yet. */
    variable.timeout = {};
  }

  variable.timeout = timeout;
}


/**
 * Gets a timeout value to variable (opsPath)
 * @param  {String} opsPath operation path
 */
VariableServer.prototype.getVariableTimeout = function( opsPath ) {
  if ( this.vars.hasOwnProperty( opsPath ) == false ) {
    /* We have not received this variable yet and it does
     * not already have a predefinition.  Return the default of 0. */
    return 0;
  } else {
    /* We've already received this or have a predefinition. */
    if ( typeof this.vars[ opsPath ].timeout === 'undefined' ) {
      /* Timeout is not set.  Return the default of 0. */
      return 0;
    } else {
      return this.vars[ opsPath ].timeout;
    }
  }
}


/**
 * Remove subsciber for variable (opsPath) for associated callback
 * @param  {string}   opsPath operation path
 * @param  {Function} cb      callback function
 */
VariableServer.prototype.removeSubscription = function( opsPath, cb ) {
  if ( this.vars.hasOwnProperty( opsPath ) == true ) {
    /* We've already received this or have a predefinition. */
    var variable = this.vars[ opsPath ];

    if ( variable.hasOwnProperty( 'subscribers' ) == true ) {
      variable.subscribers = [];
    }
  }
}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 * @param  {Function} cb       callback
 */
VariableServer.prototype.instanceEmit = function( streamID, msg, cb ) {
  this.instanceEmitter.emit( streamID, msg, cb );
}


/**
 * Log debug events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
VariableServer.prototype.logDebugEvent = function( eventID, text ) {
  this.instanceEmit( 'events-debug', {
    sender: this,
    component: 'VariableServer',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log info events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
VariableServer.prototype.logInfoEvent = function( eventID, text ) {
  this.instanceEmit( 'events-info', {
    sender: this,
    component: 'VariableServer',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log error events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
VariableServer.prototype.logErrorEvent = function( eventID, text ) {
  this.instanceEmit( 'events-error', {
    sender: this,
    component: 'VariableServer',
    eventID: eventID,
    text: text
  } );
}


/**
 * Log critical events
 * @param  {number} eventID event id
 * @param  {String} text    text
 */
VariableServer.prototype.logCriticalEvent = function( eventID, text ) {
  this.instanceEmit( 'events-critical', {
    sender: this,
    component: 'VariableServer',
    eventID: eventID,
    text: text
  } );
}



/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
VariableServer.prototype.__proto__ = Emitter.prototype;