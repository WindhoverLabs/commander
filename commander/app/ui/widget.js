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

var widgetIntervalCollection = [];
var sparklineIndex = [];
/**
 * Modal Object
 * @type {Object}
 */
var builder = $( '#cdr-widget' );
/**
 * Change the probe to pring performance values
 * @type {Boolean}
 */
var perfProbe = false;

/**
 * Modal generation configuration
 * @type {Array}
 */
var config = [ {
    "label": "Select A Widget",
    "type": "select",
    "getItem": [ {
        "value": 'plotIndicator',
        "label": 'Dataplot Indicator',
      },
      {
        "value": 'textIndicator',
        "label": 'Text Indicator',
      },
      {
        "value": 'cdrThroughput',
        "label": 'Commander Throughput',
      },
      {
        "value": 'grndClock',
        "label": 'Ground Clock',
      }
    ]
  },
  {
    "label": "Enter a name (Optional)",
    "type": "field",
    "dtype": "text"
  }, {
    "label": "Enter a OpsPath (Optional)",
    "type": "field",
    "dtype": "text"
  }
]
/* mut modal configuration in modal object */
builder.data( 'custom', config )
/**
 * Creates a widget
 * @constructor
 */
function Widget() {
  /**
   * Collection of active widget to restrict certain widgets from
   * being created again.
   * @type {Array}
   */
  this.activeWidgets = []
  /**
   * Collection intervals used by the widget
   * @type {Object}
   */
  this.intervals = {}
  /**
   * collection of sparkline objects used by the widget
   * @type {Object}
   */
  this.sparklines = {}
  /**
   * Current cycle values
   * @type {Object}
   */
  this.current = {}
}

/**
 * Restricts widgets from being generated more than one time
 * @param  {Str} str widget reference
 */
Widget.prototype.restrictWidget = function( str ) {
  if ( this.activeWidgets.indexOf( str ) != -1 ) {
    cu.logError( 'createWidget | cannot create more widgets of this kind' );
    wid.current = {};
  } else {
    this.activeWidgets.push( str );
    /* call the function that matched the selected name */
    this[ this.current.selection ].call();
  }
}

/**
 * Initializes widget
 * @return {undefined}
 */
Widget.prototype.createWidget = function() {
  /* TODO: validate for space in DOM */
  wid.current = {}
  this.current.selection = $( "[id='select0']" ).val()
  this.current.name = $( "[id='inputField1']" ).val()
  this.current.opsPath = ( $( "[id='inputField2']" ).val() )
  switch ( this.current.selection ) {
    case 'cdrThroughput':
      {
        wid.restrictWidget( 'cdrThroughput' )
        break;
      }
    case 'grndClock':
      {
        wid.restrictWidget( 'grndClock' )
        break;
      }
    default:
      {
        /* call the function that matched the selected name */
        this[ this.current.selection ].call();
      }
  }
}

/**
 * Clears up current cycle values
 * @return {undefined}
 */
Widget.prototype.cleanUp = function() {
  wid.current = {}
}
/**
 * Clears and intervals functions
 * @param  {String} id unique id
 * @return {undefined}
 */
Widget.prototype.clearIntervals = function( id ) {
  clearInterval( wid.intervals[ id ] );
}


/* All Custom function go in here */
/**
 * First custom function : takes opsPath and generates a sparkline plotIndicator
 * @return {undefined}
 */
Widget.prototype.plotIndicator = function() {
  if ( wid.current.opsPath == '' ) {
    cu.logError( 'createWidget | opsPath not received' )
    return;
  }
  if ( wid.current.name == '' ) {
    cu.logDebug( 'createWidget | widget name is missing' )
  }
  var opsPath = wid.current.opsPath;
  var bp = generateBoilerPlate()
  $( '#cdr-gadget-container' ).append( bp.html )
  $( '#cdr-gadget-' + bp.id ).append( '<div data-key=' + bp.id + ' class="cdr-gadget-text">' + wid.current.name +
    '</div>' +
    '<div id=spark-cdr-gadget' + bp.id + ' data-key=' + bp.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>' )
  wid.sparklines[ bp.id ] = new Sparkline( document.getElementById( 'spark-cdr-gadget' + bp.id ), {
    width: 50,
    height: 20
  } );
  wid.sparklines[ bp.id ].draw( [] );

  if ( !( rouge_subscriptions.hasOwnProperty( opsPath ) ) || !( rouge_subscriptions[ opsPath ].hasOwnProperty( 'plot' ) ) ) {
    session.subscribe( [ {
      name: opsPath
    } ], ( param ) => {
      try {
        var sample = param.sample[ param.sample.length - 1 ];
        var value = sample.value;
        if ( rouge_subscriptions.hasOwnProperty( opsPath ) ) {
          if ( rouge_subscriptions[ opsPath ].hasOwnProperty( 'plot' ) ) {
            rouge_subscriptions[ opsPath ][ 'plot' ].forEach( ( e ) => {
              var gdgtObj = $( e );
              if ( gdgtObj.length != 0 ) {
                gdgtObj.data( 'value' ).push( value );
                if ( gdgtObj.data( 'value' ).length == 10 ) {
                  gdgtObj.data( 'value' ).splice( 0, 1 );
                }
                wid.sparklines[ gdgtObj.data( 'key' ) ].draw( gdgtObj.data( 'value' ) );
              }
            } );

          }
        }
      } catch ( e ) {
        cu.logError( "createWidget | unable to process response. error= ", e.message )
      }
    } );
    /* new entry */
    if ( !( rouge_subscriptions.hasOwnProperty( opsPath ) ) ) {
      rouge_subscriptions[ opsPath ] = {};
      rouge_subscriptions[ opsPath ][ 'plot' ] = [ '.cdr-gadget-value[data-key=' + bp.id + ']' ];
    } else {
      rouge_subscriptions[ opsPath ][ 'plot' ] = [ '.cdr-gadget-value[data-key=' + bp.id + ']' ];
    }

  } else {
    cu.assert( typeof rouge_subscriptions[ opsPath ] == 'object', 'createWidget | rouge_subscriptions[opsPath] is not an object' );
    if ( !( rouge_subscriptions[ opsPath ].hasOwnProperty( 'plot' ) ) ) {
      rouge_subscriptions[ opsPath ][ 'plot' ] = [ '.cdr-gadget-value[data-key=' + bp.id + ']' ];
    } else {
      rouge_subscriptions[ opsPath ][ 'plot' ].push( '.cdr-gadget-value[data-key=' + bp.id + ']' );
    }
  }
}
/**
 * Plots commander thoughput
 * @return {undefined}
 */
Widget.prototype.cdrThroughput = function() {
  var durationWG = generateBoilerPlate()
  var transferSizeWG = generateBoilerPlate()
  var sockStatusWG = generateBoilerPlate()
  var sparkLineOptions = {
    width: 50,
    height: 20,
    startColor: 'transperant',
    maxColor: 'red',
    minColor: 'green',
    toooltip: function( v, i, a ) {
      console.log( v )
    }
  }
  $( '#cdr-gadget-container' ).append( durationWG.html )
  $( '#cdr-gadget-' + durationWG.id ).append( '<div data-key=' + durationWG.id + ' class="cdr-gadget-text">Latency' +
    '</div>' +
    '<div id=spark-cdr-gadget' + durationWG.id + ' data-key=' + durationWG.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>' )

  $( '#cdr-gadget-container' ).append( transferSizeWG.html )
  $( '#cdr-gadget-' + transferSizeWG.id ).append( '<div data-key=' + transferSizeWG.id + ' class="cdr-gadget-text">Transfer Rate' +
    '</div>' +
    '<div id=spark-cdr-gadget' + transferSizeWG.id + ' data-key=' + transferSizeWG.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>' )

  $( '#cdr-gadget-container' ).append( sockStatusWG.html )
  $( '#cdr-gadget-' + sockStatusWG.id ).append( '<div data-key=' + sockStatusWG.id + ' class="cdr-gadget-text">Commander Status' +
    '</div>' +
    '<div id=spark-cdr-gadget' + sockStatusWG.id + ' data-key=' + sockStatusWG.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>' )

  wid.sparklines[ durationWG.id ] = new Sparkline( document.getElementById( 'spark-cdr-gadget' + durationWG.id ), sparkLineOptions );

  wid.sparklines[ transferSizeWG.id ] = new Sparkline( document.getElementById( 'spark-cdr-gadget' + transferSizeWG.id ), sparkLineOptions );
  wid.sparklines[ durationWG.id ].draw( up );
  wid.sparklines[ transferSizeWG.id ].draw( down );
  var up = []
  var down = []
  var perfBufferSize = 20;

  var interval = setInterval( () => {
    /* Socket status */
    if ( window.session.socket.connected ) {
      $( '#spark-cdr-gadget' + sockStatusWG.id ).text( "ACTIVE" );
      $( '#spark-cdr-gadget' + sockStatusWG.id ).attr( 'class', 'cdr-gadget-value cdr-gadget-on-status' );

    } else {
      $( '#spark-cdr-gadget' + sockStatusWG.id ).text( "INACTIVE" );
      $( '#spark-cdr-gadget' + sockStatusWG.id ).attr( 'class', 'cdr-gadget-value cdr-gadget-off-status' );
    }


    /* Duration and Size transfered */
    var duration_Accumulated = 0;
    var sizeTransfered_Accumulated = 0;
    var entries = performance.getEntries( {
      "initiatorType": "xmlhttprequest"
    } );
    for ( var i in entries ) {
      try {
        duration_Accumulated += entries[ i ].duration;
        sizeTransfered_Accumulated += entries[ i ].transferSize;
      } catch ( e ) {
        cu.logError( 'cdrThroughput | error calculating performance' )
      }
    }
    if ( perfProbe ) {
      cu.logInfo( 'cdrThroughput [probe] | Average Latency : ', duration_Accumulated );
      cu.logInfo( 'cdrThroughput [probe] | Average Transfer Rate : ', sizeTransfered_Accumulated );
    }
    up.push( duration_Accumulated / entries.length )
    down.push( sizeTransfered_Accumulated / entries.length )
    if ( up.length == 10 ) {
      up.splice( 0, 1 );
    }
    if ( down.length == 10 ) {
      down.splice( 0, 1 );
    }
    wid.sparklines[ durationWG.id ].draw( up );
    wid.sparklines[ transferSizeWG.id ].draw( down );
    performance.clearResourceTimings();
  }, 1000 );
  wid.intervals[ durationWG.id ] = interval
  wid.intervals[ transferSizeWG.id ] = interval
}
/**
 * Takes a opsPath and generates a indicator showing value in plain text
 * @return {undefined}
 */
Widget.prototype.textIndicator = function() {
  if ( wid.current.opsPath == '' ) {
    cu.logError( 'createWidget | opsPath not received' )
    return;
  }
  if ( wid.current.name == '' ) {
    cu.logDebug( 'createWidget | widget name is missing' )
  }
  var opsPath = wid.current.opsPath;
  var bp = generateBoilerPlate()
  $( '#cdr-gadget-container' ).append( bp.html )
  $( '#cdr-gadget-' + bp.id ).append( '<div data-key=' + bp.id + ' class="cdr-gadget-text">' + wid.current.name +
    '</div>' +
    '<div data-key=' + bp.id + ' class="cdr-gadget-value">' +
    '</div>' )
  if ( !( rouge_subscriptions.hasOwnProperty( opsPath ) ) || !( rouge_subscriptions[ opsPath ].hasOwnProperty( 'text' ) ) ) {
    session.subscribe( [ {
      name: opsPath
    } ], ( param ) => {
      try {
        var sample = param.sample[ param.sample.length - 1 ];
        var value = sample.value;
        if ( rouge_subscriptions.hasOwnProperty( opsPath ) ) {
          if ( rouge_subscriptions[ opsPath ].hasOwnProperty( 'text' ) ) {
            var gdgtObj = $( rouge_subscriptions[ opsPath ][ 'text' ].join( ',' ) );
            gdgtObj.text( value );
          }
        }
      } catch ( e ) {
        cu.logError( "createWidget | unable to process response. error= ", e.message )
      }
    } );
    /* new entry */
    if ( !( rouge_subscriptions.hasOwnProperty( opsPath ) ) ) {
      rouge_subscriptions[ opsPath ] = {};
      rouge_subscriptions[ opsPath ][ 'text' ] = [ '.cdr-gadget-value[data-key=' + bp.id + ']' ];
    } else {
      rouge_subscriptions[ opsPath ][ 'text' ] = [ '.cdr-gadget-value[data-key=' + bp.id + ']' ];
    }
  } else {
    cu.assert( typeof rouge_subscriptions[ opsPath ] == 'object', 'createWidget | rouge_subscriptions[opsPath] is not an object' );
    if ( !( rouge_subscriptions[ opsPath ].hasOwnProperty( 'text' ) ) ) {
      rouge_subscriptions[ opsPath ][ 'text' ] = [ '.cdr-gadget-value[data-key=' + bp.id + ']' ];
    } else {
      rouge_subscriptions[ opsPath ][ 'text' ].push( '.cdr-gadget-value[data-key=' + bp.id + ']' );
    }
  }
}
/**
 * Shows time
 * @return {undefined}
 */
Widget.prototype.grndClock = function() {
  var bp = generateBoilerPlate()
  $( '#cdr-gadget-container' ).append( bp.html )
  var interval = setInterval( () => {
    var d = new Date();
    var time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    $( '.cdr-gadget-content[data-key=' + bp.id + ']' ).text( time );
  }, 1000 );
  wid.intervals[ bp.id ] = interval
}

/**
 * Widget instance
 * @type {Widget}
 */
var wid = new Widget();

/**
 * Calls create widget with clean up widget
 */
function MakeWidget() {
  wid.createWidget();
  wid.cleanUp();
}
/**
 * Generates html boiler plate code for Widget
 * @return {Object} HTMLObject
 */
function generateBoilerPlate() {
  var uniqueID = cu.makeKey();
  var uniqueGadgetID = 'cdr-gadget-' + uniqueID
  var gadgetHtml = '<div id=' + uniqueGadgetID + ' class="cdr-gadget" ' +
    'onmouseover=gadgetHoverHandle(this,"onmouseover") onmouseleave=gadgetHoverHandle(this,"onmouseleave")>' +
    '<div data-key=' + uniqueID + ' class="cdr-gadget-close" onclick=gadgetCloseHandle(this)>x' +
    '</div>' +
    '<div data-key=' + uniqueID + ' class="cdr-gadget-content">' +
    '</div>' +
    '</div>'
  var resObj = {
    id: uniqueID,
    html: gadgetHtml
  }
  return resObj;
}
/**
 * On Hover event is handled there
 * @param  {Object} elm HTMLObject
 * @param  {Object} evt Evnet Object
 */
function gadgetHoverHandle( elm, evt ) {
  if ( evt == 'onmouseover' ) {
    $( elm ).find( '.cdr-gadget-close' ).css( 'display', 'block' )
  } else if ( evt == 'onmouseleave' ) {
    /* Let close button be displayed for 2 more seconds */
    setTimeout( () => {
      $( elm ).find( '.cdr-gadget-close' ).css( 'display', 'none' )
    }, 2000 );
  }
}
/**
 * Handles close event on the Widget
 * @param  {Object} elm HTMLObject
 */
function gadgetCloseHandle( elm ) {
  var uniqueID = $( elm ).data( 'key' );
  console.log( $( '#cdr-gadget-' + uniqueID ) );
  var url = $( '#cdr-gadget-' + uniqueID ).data( 'url' );
  var id = $( '#cdr-gadget-' + uniqueID ).parent().attr( 'id' );
  widgetState[ id ].splice( widgetState[ id ].indexOf( url ), 1 )
  session.saveWidgets( widgetState )
  $( '#cdr-gadget-' + uniqueID ).remove();
  wid.clearIntervals( uniqueID )
}