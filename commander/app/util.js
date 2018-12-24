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
/*
 * CommanderLogger instnace allow to set logging verbosity
 */
var CommanderLogger = CommanderLogger || {};
/**
 * Commander logging API, allow to set logging verbosity
 * @constructor
 */
function CommanderLogger() {
  /**
   * Filters to allow only INFO level logging
   * @type {Boolean}
   */
  this.INFO = true;
  /**
   * Filters to allow only DEBUG level logging
   * @type {Boolean}
   */
  this.DEBUG = false;
  /**
   * Filters to allow only ERROR level logging
   * @type {Boolean}
   */
  this.ERROR = true;
  /**
   * INFO background color
   * @type {String}
   */
  this.BGCOLOR_INFO = '#fff';
  /**
   * DEBUG background color
   * @type {String}
   */
  this.BGCOLOR_DEBUG = '#fff';
  /**
   * ERROR background color
   * @type {String}
   */
  this.BGCOLOR_ERROR = '#fff';
  /**
   * INFO log color
   * @type {String}
   */
  this.COLOR_INFO = 'green';
  /**
   * DEBUG log color
   * @type {String}
   */
  this.COLOR_DEBUG = 'blue';
  /**
   * ERROR log color
   * @type {String}
   */
  this.COLOR_ERROR = 'red';
}
/**
 * CommanderLogger protoype definition
 * @type {Object}
 */
CommanderLogger.prototype = {
  /**
   * Get INFO filter status
   */
  getInfo: function() {
    return this.INFO;
  },
  /**
   * Get DEBUG filter status
   */
  getDebug: function() {
    return this.DEBUG;
  },
  /**
   * Get ERROR filter status
   */
  getError: function() {
    return this.ERROR;
  },
  /**
   * Set INFO filter status
   */
  setInfo: function( value ) {
    this.INFO = value;
  },
  /**
   * Set DEBUG filter status
   */
  setDebug: function( value ) {
    this.DEBUG = value;
  },
  /**
   * Set ERROR filter status
   */
  setError: function( value ) {
    this.ERROR = value;
  },
  /**
   * Log INFO
   */
  Info: function( message ) {
    if ( this.INFO ) {
      this.log( 'INFO', this.BGCOLOR_INFO, this.COLOR_INFO, message );
    }
  },
  /**
   * Log DEBUG
   */
  Debug: function( message ) {
    if ( this.DEBUG ) {
      this.log( 'DEBUG', this.BGCOLOR_DEBUG, this.COLOR_DEBUG, message );
    }
  },
  /**
   * Log ERROR
   */
  Error: function( message ) {
    if ( this.ERROR ) {
      this.log( 'ERROR', this.BGCOLOR_ERROR, this.COLOR_ERROR, message );
    }
  },
  /**
   * Log wrapper
   */
  log: function( type, bg, fg, message ) {
    var d = new Date().toString();
    var c = 'background: ' + bg + '; color: ' + fg;
    var t = '%c CDRLOG | ' + d + ' | ' + type + ' | ' + message;
    console.log( t, c );
  }
}


/*
 * CommanderGenerator instnace is random generation utility
 */
var CommanderGenerator = CommanderGenerator || {};
/**
 * Generation API parses strings to JSON, make unique keys, colors etc.
 * @constructor
 */
function CommanderGenerator() {
  /**
   * Store all generated keys
   * @type {Array}
   */
  this.unavailableKeys = [];
  /**
   * Store all generated colors
   * @type {Array}
   */
  this.unavailableColors = [];
}
/**
 * CommanderGenerator protoype definition
 * @type {Object}
 */
CommanderGenerator.prototype = {
  /**
   * Makes unique keys
   * @return {strings} unique key
   */
  makeKey: function() {
    var k = Math.random().toString( 36 ).slice( 2 );
    while ( k in this.unavailableKeys ) {
      k = Math.random().toString( 36 ).slice( 2 );
    }
    this.unavailableKeys.push( k );
    return k;
  },
  /**
   * Removes a key from unavailableKeys
   * @param  {strings} k unique keys
   * @return {Boolean}   success if true, fail if false
   */
  disposeKey: function( k ) {
    var success = false;
    var index = this.unavailableKeys.indexOf( k );
    if ( index != -1 ) {
      this.unavailableKeys.splice( index, 1 );
      success = true;
    }
    return success;
  },
  /**
   * Generates a unique color
   * @return {String} unique color
   */
  makeColor: function() {
    var letters = '0123456789abcdef';
    do {
      var color = '#';
      for ( var i = 0; i < 6; i++ ) {
        color += letters[ Math.floor( Math.random() * 16 ) ];
      }
    } while ( color in this.unavailableColors );
    this.unavailableColors.push( color );
    return color;
  },
  /**
   * Removes color from unavailableColors
   * @param  {String} c unique color
   * @return {Boolean}   success if true, fail if false
   */
  disposeColor: function( c ) {
    var success = false;
    var index = this.unavailableColors.indexOf( c );
    if ( index != -1 ) {
      this.unavailableColors.splice( index, 1 );
      success = true;
    }
    return success;
  },
  /**
   * make unique UUID
   * @return {String} unique UUID
   */
  makeUUID: function() {
    var d = new Date().getTime();
    if ( window.performance && typeof window.performance.now === "function" ) {
      d += performance.now(); // use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c ) {
      var r = ( d + Math.random() * 16 ) % 16 | 0;
      d = Math.floor( d / 16 );
      return ( c == 'x' ? r : ( r & 0x3 | 0x8 ) ).toString( 16 );
    } );
    return uuid;
  },
  /**
   * Parse string to JSON
   * @param  {String} str string input
   * @return {Object}     JSON output
   */
  parseJSON: function( str ) {
    var JSONObj = undefined;
    if ( typeof str === 'string' || str instanceof String ) {
      // it's a string
      JSONObj = JSON.parse( str );
    } else if ( typeof str === 'object' || str instanceof Object ) {
      // it's an object
      JSONObj = str;
    }
    return JSONObj;
  },
  /**
   * Returns size of the object or length of a string
   * @param  {Object} obj object
   * @return {Number}     size of the object
   */
  getSize: function( obj ) {
    var str = '';
    if ( typeof obj == 'object' ) {
      str = JSON.stringify( obj );
    }
    return str.length;
  }

}


/*
 * CommanderValidator
 */
var CommanderValidator = CommanderValidator || {};
/**
 * CommanderValidator API Collector of validation functions.
 * @constructor
 */
function CommanderValidator() {}
/**
 * CommanderValidator protoype definition
 * @type {Object}
 */
CommanderValidator.prototype = {
  /**
   * Validates if passes in object is a Array
   * @param  {Object} obj
   * @return {Boolean}     true if the object is array otherwise false
   */
  isArray: function( obj ) {
    /* Backwards compatability */
    if ( typeof Array.isArray === 'undefined' ) {
      Array.isArray = function( obj ) {
        return ( Object.prototype.toString.call( obj ) === '[object Array]' );
      }
    }
    return Array.isArray( obj );
  },
  /**
   * Validates id the passed in child is descendant of parentNode
   * @param  {Object} parent parentNode
   * @param  {Object} child  childNode
   * @return {Boolean}       true id the childNode is descendant otherwise false
   */
  isDescendant: function( parent, child ) {
    var node = child.parentNode;
    while ( node != null ) {
      if ( node == parent ) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },
  /**
   * Custom assertions
   * @param  {Boolean} condition a boolean yielding expression
   * @return {Boolean}           true if successful, false if assertion fails
   */
  assert: function( condition ) {
    var success = true;
    if ( !condition ) {
      success = false;
    }
    return success
  }
}

/*
 * CommanderDatabase
 */
var CommanderDatabase = CommanderDatabase || {};
/**
 * CommanderDatabase API allows you to store key value pairs.
 * @constructor
 */
function CommanderDatabase() {
  /**
   * Data storage
   * @type {Object}
   */
  this.database = {};
}
/**
 * CommanderDatabase protoype definition
 * @type {Object}
 */
CommanderDatabase.prototype = {
  /**
   * Return database
   * @return {Object} database
   */
  getDatabase: function() {
    return this.database;
  },
  /**
   * Add record to the database
   * @param  {String} key   indetifier
   * @param  {any} value    value
   * @return {Object}
   */
  addRecord: function( key, value ) {
    this.database[ key ] = value;
    return this.database;
  },
  /**
   * Get value from database
   * @param  {String} key   indetifier
   * @return {Object}
   */
  getValue: function( key ) {
    return this.database[ key ];
  },
  /**
   * Delete record
   * @param  {String} key   indetifier
   * @return {Object}
   */
  deleteRecord: function( key ) {
    delete this.database[ key ];
    return this.database;
  },
  /**
   * Empty database
   * @return {Object}
   */
  clearDatabase: function() {
    this.database = {};
    return this.database;
  }
}


/*
 * CommanderUtilities
 */
var CommanderUtilities = CommanderUtilities || {};
/**
 * CommanderUtilities API Increases the ease of use and code understandability
 * @constructor
 */
function CommanderUtilities() {
  /**
   * Logger instance
   * @type {CommanderLogger}
   */
  this.logger = new CommanderLogger();
  /**
   * Generator instance
   * @type {CommanderGenerator}
   */
  this.generator = new CommanderGenerator();
  /**
   * Validator instance
   * @type {CommanderValidator}
   */
  this.validator = new CommanderValidator();
  /**
   * Database instance
   * @type {CommanderDatabase}
   */
  this.database = new CommanderDatabase();
}
/**
 * CommanderUtilities protoype definition
 * @type {Object}
 */
CommanderUtilities.prototype = {
  /**
   * Log INFO
   */
  logInfo: function( ...message ) {
    this.logger.Info( message.join( '' ) );
  },
  /**
   * Log DEBUG
   */
  logDebug: function( ...message ) {
    this.logger.Debug( message.join( '' ) );
  },
  /**
   * Log ERROR
   */
  logError: function( ...message ) {
    this.logger.Error( message.join( '' ) );
  },
  /**
   * Sets log filter
   * @param  {Number} [info=1]  info folter
   * @param  {Number} [debug=0] debug filter
   * @param  {Number} [error=1] error filter
   */
  setLogFilter: function( info = 1, debug = 0, error = 1 ) {
    /* Set Info */
    if ( info == 1 ) {
      this.logger.setInfo( true );
    } else {
      this.logger.setInfo( false );
    }
    /* Set Debug */
    if ( debug == 1 ) {
      this.logger.setDebug( true );
    } else {
      this.logger.setDebug( false );
    }
    /* Set Error */
    if ( error == 1 ) {
      this.logger.setError( true );
    } else {
      this.logger.setError( false );
    }
  },
  /**
   * Prints log filter status
   */
  getLogFilter: function() {
    var status = {
      INFO: this.logger.getInfo(),
      DEBUG: this.logger.getDebug(),
      ERROR: this.logger.getError()
    };
    this.logInfo( 'Logger Status | ', JSON.stringify( status ) );
  },
  /**
   * Makes unique keys
   * @return {strings} unique key
   */
  makeKey: function() {
    return this.generator.makeKey();
  },
  /**
   * Removes a key from unavailableKeys
   * @param  {strings} k unique keys
   * @return {Boolean}   success if true, fail if false
   */
  disposeKey: function( k ) {
    if ( !this.generator.disposeKey( k ) ) {
      this.logError( ' Unable to dispose key ', k );
    }
  },
  /**
   * Generates a unique color
   * @return {String} unique color
   */
  makeColor: function() {
    return this.generator.makeColor();
  },
  /**
   * Removes color from unavailableColors
   * @param  {String} c unique color
   * @return {Boolean}   success if true, fail if false
   */
  disposeColor: function( c ) {
    if ( !this.generator.disposeColor( c ) ) {
      this.logError( ' Unable to dispose color ', c );
    }
  },
  /**
   * make unique UUID
   * @return {String} unique UUID
   */
  makeUUID: function() {
    return this.generator.makeUUID();
  },
  /**
   * Parse string to JSON
   * @param  {String} str string input
   * @return {Object}     JSON output
   */
  parseJSON: function( str ) {
    var strObj = this.generator.parseJSON( str );
    if ( strObj == undefined | strObj == null ) {
      this.logError( 'Parse JSON | ', 'Unable to parse string : ', strObj );
    }
    return strObj;
  },
  /**
   * Returns size of the object or length of a string
   * @param  {Object} obj object
   * @return {Number}     size of the object
   */
  getSize: function( obj ) {
    return this.generator.getSize( obj );
  },
  /**
   * Validates if passes in object is a Array
   * @param  {Object} obj
   * @return {Boolean}     true if the object is array otherwise false
   */
  isArray: function( obj ) {
    return this.validator.isArray( obj )
  },
  /**
   * Validates id the passed in child is descendant of parentNode
   * @param  {Object} parent parentNode
   * @param  {Object} child  childNode
   * @return {Boolean}       true id the childNode is descendant otherwise false
   */
  isDescendant: function( parent, child ) {
    return this.validator.isDescendant( parent, child )
  },
  /**
   * Custom assertions
   * @param  {Boolean} condition a boolean yielding expression
   * @return {Boolean}           true if successful, false if assertion fails
   */
  assert: function( condition, message ) {
    if ( !this.validator.assert( condition ) ) {
      this.logError( 'Assertion Failed | ', message );
    }
  },
  /**
   * Return database
   * @return {Object} database
   */
  getDatabase: function() {
    return this.database.getDatabase();
  },
  /**
   * Add record to the database
   * @param  {String} key   indetifier
   * @param  {any} value    value
   * @return {Object}
   */
  addRecord: function( key, value, overwrite = true ) {
    this.assert( typeof key == 'string', 'Utilities | key is not in string format' );
    if ( !overwrite && this.database.getDatabase().hasOwnProperty( key ) ) {
      this.logError( 'Utilities | Cannot write to database, overwrite set to false.' );
    } else {
      this.database.addRecord( key, value );
    }
    return this.database.getDatabase();
  },
  /**
   * Get value from database
   * @param  {String} key   indetifier
   * @return {Object}
   */
  getValue: function( key ) {
    var val = undefined;
    if ( this.database.getDatabase().hasOwnProperty( key ) ) {
      val = this.database.getValue( key );
    } else {
      this.logDebug( 'Utilities | key not available in database, cannot retrieve value.' );
    }
    return val;
  },
  /**
   * Delete record
   * @param  {String} key   indetifier
   * @return {Object}
   */
  deleteRecord: function( key ) {
    if ( this.database.getDatabase().hasOwnProperty( key ) ) {
      this.database.deleteRecord( key );
    } else {
      this.logDebug( 'Utilities | key not available in database, cannot delete key.' );
    }
    return this.database.getDatabase();
  },
  /**
   * Empty database
   * @return {Object}
   */
  clearDatabase: function() {
    this.database.clearDatabase();
    return this.database.getDatabase();
  }
}

/**
 * Commander Utilities Instance
 * @type {CommanderUtilities}
 */
var cu = new CommanderUtilities();