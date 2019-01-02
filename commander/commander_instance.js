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

var Emitter = require( 'events' );


/**
 * Constructor for commander instance
 * @param       {String} name   instance name
 * @param       {Object} server server object
 * @constructor
 */
function CommanderInstance( name, server ) {
  this.name = name;
  this.server = server;
  this.apps = {};
  this.emitter = new Emitter();
  var self = this;

  /* TODO:  Add event filtering. */

  this.emitter.on( 'events-debug', function( eventObj ) {
    //		var component = '---';
    //		var eventID = '---';
    //		var text = '---';
    //		var pluginName = '---';
    //
    //		for(var appID in self.apps) {
    //			if(eventObj.sender == self.apps[appID].appObj) {
    //				pluginName = self.apps[appID].name;
    //			}
    //		}
    //
    //		if(eventObj.hasOwnProperty('component')) {
    //			component = eventObj.component;
    //		}
    //
    //		if(eventObj.hasOwnProperty('eventID')) {
    //			eventID = eventObj.eventID;
    //		}
    //
    //		if(eventObj.hasOwnProperty('text')) {
    //			text = eventObj.text;
    //		}
    //
    //		self.logEvent(component, pluginName, eventID, 'DEBUG', text);
  } );

  this.emitter.on( 'events-info', function( eventObj ) {
    var component = '---';
    var eventID = '---';
    var text = '---';
    var pluginName = '---';

    for ( var appID in self.apps ) {
      if ( eventObj.sender == self.apps[ appID ].appObj ) {
        pluginName = self.apps[ appID ].name;
      }
    }

    if ( eventObj.hasOwnProperty( 'component' ) ) {
      component = eventObj.component;
    }

    if ( eventObj.hasOwnProperty( 'eventID' ) ) {
      eventID = eventObj.eventID;
    }

    if ( eventObj.hasOwnProperty( 'text' ) ) {
      text = eventObj.text;
    }

    self.logEvent( component, pluginName, eventID, 'INFO', text );
  } );

  this.emitter.on( 'events-error', function( eventObj ) {
    var component = '---';
    var eventID = '---';
    var text = '---';
    var pluginName = '---';

    for ( var appID in self.apps ) {
      if ( eventObj.sender == self.apps[ appID ].appObj ) {
        pluginName = self.apps[ appID ].name;
      }
    }

    if ( eventObj.hasOwnProperty( 'component' ) ) {
      component = eventObj.component;
    }

    if ( eventObj.hasOwnProperty( 'eventID' ) ) {
      eventID = eventObj.eventID;
    }

    if ( eventObj.hasOwnProperty( 'text' ) ) {
      text = eventObj.text;
    }

    self.logEvent( component, pluginName, eventID, 'ERROR', text );
  } );

  this.emitter.on( 'events-critical', function( eventObj ) {
    var component = '---';
    var eventID = '---';
    var text = '---';
    var pluginName = '---';

    for ( var appID in self.apps ) {
      if ( eventObj.sender == self.apps[ appID ].appObj ) {
        pluginName = self.apps[ appID ].name;
      }
    }

    if ( eventObj.hasOwnProperty( 'component' ) ) {
      component = eventObj.component;
    }

    if ( eventObj.hasOwnProperty( 'eventID' ) ) {
      eventID = eventObj.eventID;
    }

    if ( eventObj.hasOwnProperty( 'text' ) ) {
      text = eventObj.text;
    }

    self.logEvent( component, pluginName, eventID, 'CRIT', text );
  } );

  return this;
}



/**
 * Inherits from EventEmitter.
 * @type {Object}
 */
CommanderInstance.prototype.__proto__ = Emitter.prototype;


/**
 * Logs events
 * @param  {String} plugin      plugin name
 * @param  {String} component   component name
 * @param  {Number} eventID     event id
 * @param  {String} criticality level of criticality
 * @param  {String} text        event message text
 */
CommanderInstance.prototype.logEvent = function( plugin, component, eventID, criticality, text ) {
  this.server.logEvent( this.name, plugin, component, eventID, criticality, text );
}


/**
 * Adds an application
 * @param  {String} name      application name
 * @param  {Object} newAppObj application object
 */
CommanderInstance.prototype.addApp = function( name, newAppObj ) {
  var self = this;
  this.apps[ name ] = {
    name: name,
    appObj: newAppObj
  };

  newAppObj.setInstanceEmitter( this.emitter );
}


/**
 * Emit data
 * @param  {String}   streamID stream id
 * @param  {String}   msg      emit message
 * @param	 {Function} callback callback
 */
CommanderInstance.prototype.emit = function( streamID, obj, callback ) {
  this.emitter.emit( streamID, obj, callback );
}



exports = module.exports = CommanderInstance;