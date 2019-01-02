'use strict';

/**
 * Sidebar visibitly status indicator, currenty not open
 * @type {Boolean}
 */
var isSidebarOpen = false;

/**
 * Add the ability to toggle sidebar to menu toggle button
 * using transform for animation
 * @constructor
 */
function InitSidebar() {
  $( "#cdr-app-menu-toggle" ).on( "click", () => {
    if ( isSidebarOpen ) {
      $( "#cdr-app-menu" ).css( "transform", "translateX(-100%)" )
      $( "#cdr-layout-container" ).css( "margin-left", "0%" )
      $( "#cdr-layout-container" ).css( "width", "100%" )
      myLayout.updateSize();
      isSidebarOpen = false;
      $( "#cdr-panel-layout-switch" ).css( "display", "none" );
    } else {
      $( "#cdr-app-menu" ).css( "transform", "translateX(0%)" )
      $( "#cdr-layout-container" ).css( "margin-left", "250px" )
      $( "#cdr-layout-container" ).css( "width", "calc(100% - 250px)" )
      $( "#cdr-panel-layout-switch" ).css( "display", "flex" );
      myLayout.updateSize();
      isSidebarOpen = true;
    }
  } );
}
/**
 * There are two menus one for layouts and one for panels this function with
 * correct parameter will enables the menu
 * @param       {String} item [description]
 * @constructor
 */
function ShowMenu( item ) {
  $( "#cdr-" + item + "-menu-container" ).addClass( "menuShow" );
  $( "#cdr-" + item + "-menu-toggle" ).addClass( "active" );
  $( "#cdr-" + item + "-menu-container" ).data( "open", true );
}
/**
 * There are two menus one for layouts and one for panels this function with
 * correct parameter will disable or hide menu
 * @param       {String} item item
 * @constructor
 */
function HideMenu( item ) {
  $( "#cdr-" + item + "-menu-container" ).removeClass( "menuShow" );
  $( "#cdr-" + item + "-menu-toggle" ).removeClass( "active" );
  $( "#cdr-" + item + "-menu-container" ).data( "open", false );
  // NodesCollapse(item);
}
/**
 * Control for toggler to switch between panel and layout
 * @constructor
 */
function InitMenuState() {
  /* clicked on panels, display panel menu hide all others */
  $( "#cdr-panel-menu-toggle" ).click( () => {
    var open = $( "#cdr-panel-menu-container" ).data( "open" );
    if ( !open ) {
      HideMenu( "layout" );
      HideMenu( "widget" );
      ShowMenu( "panel" );
    } else {
      HideMenu( "panel" );
    }
  } );
  /* clicked on layouts, display layout menu hide all others */
  $( "#cdr-layout-menu-toggle" ).click( () => {
    var open = $( "#cdr-layout-menu-container" ).data( "open" );
    if ( !open ) {
      HideMenu( "panel" );
      HideMenu( "widget" );
      ShowMenu( "layout" );
    } else {
      HideMenu( "layout" );
    }
  } );
  /* clicked on widgets, display widget menu hide all others */
  $( "#cdr-widget-menu-toggle" ).click( () => {
    var open = $( "#cdr-widget-menu-container" ).data( "open" );
    if ( !open ) {
      HideMenu( "panel" );
      HideMenu( "layout" );
      ShowMenu( "widget" );
    } else {
      HideMenu( "widget" );
    }
  } );
}
/**
 * Builds context menus and tooltips embedded in context menus
 * @param  {Object} node  node
 * @param  {Object} JQObj JQuery object
 */
function navBarTooltips( node, JQObj ) {
  try {
    if ( node.type == 'file' ) {
      /* node is a file, options to open the file or show info
       * on the file */
      node.$el.contextMenu( {
        selector: '*',
        items: {
          'open': {
            name: 'Open',
            callback: function( itemKey, opt, e ) {
              /* Do click */
              opt.$trigger.click()
            }
          },
          'showInfo': {
            name: 'Show Info',
            items: {
              'info': {
                type: 'html',
                html: '<div class="cdr-tooltip-container">' +
                  '<div class="cdr-tooltip-row"> Description : <span>' + node.longDescription +
                  '</span></div>' +
                  '<div class="cdr-tooltip-row"> Path : <span>' + node.urlPath +
                  '</div>' +
                  '</div>'
              }
            },
          }
        }
      } );
    } else if ( node.type == 'config' ) {
      /* node is a config or .lyt or layout file, options to open in
       * current and new window and show info */
      node.$el.contextMenu( {
        selector: '*',
        items: {
          'open': {
            name: 'Open',
            callback: function( itemKey, opt, e ) {
              /* Do click */
              opt.$trigger.click()
            }
          },
          'openNewWindow': {
            name: 'Open in new window',
            callback: function( itemKey, opt, e ) {
              if ( node.type == 'config' ) {
                $.get( node.urlPath, ( response ) => {
                  var jsonObj = JSON.parse( response );
                  var newWindow = window.open( window.location.href );
                  var theDoc = newWindow.document;
                  var theScript = document.createElement( 'script' );

                  function injectThis( x ) {
                    setTimeout( () => {
                      window.myLayout.destroy();
                      window.myLayout = new window.GoldenLayout( x, $( '#cdr-layout-container' ) );
                      updateDragSources();
                      window.dispatchEvent( llc );
                      window.InitLayout( myLayout );
                    }, 2000 )

                  }
                  theScript.innerHTML = '(' + injectThis.toString() + '(' + response + '));';
                  newWindow.onload = function() {
                    // Append the script to the new window's body.
                    // Only seems to work with `this`
                    this.document.body.appendChild( theScript );
                  };

                } );
              }
            }
          },
          'showInfo': {
            name: 'Show Info',
            items: {
              'info': {
                type: 'html',
                html: '<div class="cdr-tooltip-container">' +
                  '<div class="cdr-tooltip-row"> Description : <span>' + node.longDescription +
                  '</span></div>' +
                  '<div class="cdr-tooltip-row"> Path : <span>' + node.urlPath +
                  '</div>' +
                  '</div>'
              }
            },
          }
        }
      } );
    } else {
      /* usually a directory, has a open wich acts just like a click and
       * show info, shows tooltip info */
      node.$el.contextMenu( {
        selector: '*',
        items: {
          'open': {
            name: 'Open',
            callback: function( itemKey, opt, e ) {
              /* Do click */
              opt.$trigger.click()
            }
          },
          'showInfo': {
            name: 'Show Info',
            items: {
              'info': {
                type: 'html',
                html: '<div class="cdr-tooltip-container">' +
                  '<div class="cdr-tooltip-row"> Description : <span>' + node.longDescription +
                  '</span></div>' +
                  '<div class="cdr-tooltip-row"> Path : <span>' + node.urlPath +
                  '</div>' +
                  '</div>'
              }
            },
          }
        }
      } );
    }
  } catch ( e ) {
    cu.logError( 'navBarTooltips | unable to render tool tips for node : ', JSON.stringify( node ) )
  }
}
/**
 * Adds tooltips to genral elements with no special requirements
 * @constructor
 */
function InitToolTips() {
  var options = {
    container: 'body',
    delay: {
      'show': 500,
      'hide': 100
    },
    trigger: 'hover',
    placement: 'auto',
    boundary: 'window',
  }
  $( '[data-tooltip="true"]' ).tooltip( options );
}
/**
 * Adds scrollbar to general elements with no special requirements
 * @constructor
 */
function InitScrollBar() {
  var applyScrollTo = [
    '.os-theme-dark',
    '#cdr-app-menu',
  ]

  var options = {
    autoUpdate: true,
    // autoUpdateInterval: 33
    overflowBehavior: {
      x: "scroll",
      y: "scroll"
    },
    scrollbars: {
      visibility: "visible",
      autoHide: "never",
      autoHideDelay: 800,
      dragScrolling: true,
      clickScrolling: false,
      touchSupport: true
    }
  }
  /* os-theme-dark class should be added to every pug file in the top element */
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( options );
  }, 10 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( options );
  }, 100 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( options );
  }, 250 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( options );
  }, 500 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( options );
  }, 1000 );
}
/**
 * Resize events can be handled here
 * @constructor
 */
function InitResizeCtl() {

  $( window ).resize( () => {
    cu.logDebug( 'Layout | resize event occured' );
    myLayout.updateSize();
  } );

}
/**
 * Opens built documentations in new window
 */
function showDocumentation() {
  window.open( '/client-docs/index.html' );
  window.open( '/server-docs/index.html' );
}

/**
 * Loads preset widgets from server on page load
 */
function InitWidgets() {

  session.loadWidgets( ( state ) => {

    window.widgetState = state;

    Object.keys( widgetState ).forEach( ( well ) => {

      var urls = widgetState[ well ];

      if ( urls.length > 0 ) {

        urls.forEach( ( url ) => {

          var uniqueID = cu.makeKey();
          var uniqueGadgetID = 'cdr-gadget-' + uniqueID

          var gadgetHtml = '<div id=' + uniqueGadgetID + ' data-url=' + url + ' class="cdr-gadget" ' +
            'onmouseover=gadgetHoverHandle(this,"onmouseover") onmouseleave=gadgetHoverHandle(this,"onmouseleave")>' +
            '<div data-key=' + uniqueID + ' class="cdr-gadget-close" onclick=gadgetCloseHandle(this)>x' +
            '</div>' +
            '<div data-key=' + uniqueID + ' class="cdr-gadget-content">' +
            '</div></div>';

          $( '#' + well ).append( gadgetHtml );
          $( '#' + well ).find( '.cdr-gadget-content[data-key=' + uniqueID + ']' ).load( url );

        } )

      }

    } );

  } );

}
/**
 * Given a color will return best component color
 * @param  {String}  hex       base color
 * @param  {Boolean} [bw=true] black or white flag
 * @return {String}            component color
 */
function invertColor( hex, bw = true ) {
  if ( hex.indexOf( '#' ) === 0 ) {
    hex = hex.slice( 1 );
  }
  // convert 3-digit hex to 6-digits.
  if ( hex.length === 3 ) {
    hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ];
  }
  if ( hex.length !== 6 ) {
    throw new Error( 'Invalid HEX color.' );
  }
  var r = parseInt( hex.slice( 0, 2 ), 16 ),
    g = parseInt( hex.slice( 2, 4 ), 16 ),
    b = parseInt( hex.slice( 4, 6 ), 16 );
  if ( bw ) {
    // http://stackoverflow.com/a/3943023/112731
    return ( r * 0.299 + g * 0.587 + b * 0.114 ) > 186 ?
      '#000000' :
      '#FFFFFF';
  }
  // invert color components
  r = ( 255 - r ).toString( 16 );
  g = ( 255 - g ).toString( 16 );
  b = ( 255 - b ).toString( 16 );
  // pad each with zeros and return
  return "#" + padZero( r ) + padZero( g ) + padZero( b );
}

/**
 * Adds a data item to staging area of dataplots
 * @param {Object} elm current dataplot element
 */
function addDpItem( elm ) {
  var apl = $( elm.parentNode.parentNode.lastChild.firstChild ).find( '.active-plot-list-content' )[ 0 ];
  var form = elm.parentNode.parentNode.parentNode;
  var opsName = $( form ).find( '[type="text"]' )[ 0 ].value == '' ? $( form ).find( '[type="text"]' )[ 0 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 0 ].value;
  var color = $( form ).find( '[type="button"]' )[ 0 ].value;

  var dataPlotDef = $( apl ).data( 'PlotDef' );

  if ( dataPlotDef == undefined || dataPlotDef == null ) {
    dataPlotDef = {};
    dataPlotDef[ 'data' ] = [];
    dataPlotDef[ 'options' ] = {};
  }

  var duplicateExists = false;

  for ( var i in dataPlotDef[ 'data' ] ) {
    if ( opsName == dataPlotDef[ 'data' ][ i ][ 'tlm' ][ 'name' ] ) {
      duplicateExists = true;
    }
  }

  if ( !duplicateExists & dataPlotDef[ 'data' ].length < 6 ) {
    dataPlotDef[ 'data' ].push( {
      tlm: {
        name: opsName
      },
      color: color,
      label: opsName,
    } );
    $( apl ).data( 'PlotDef', dataPlotDef );
    try {
      renderAplPanel( $( apl ) );
    } catch ( e ) {
      cu.logDebug( 'renderAplPanel | Plot definition not defined' );
    }
  }
}

/**
 * Renders added data items and their color representations in visual staging area
 * @param {Object} jqElm current dataplot staging area element
 */
function renderAplPanel( jqElm ) {
  jqElm.empty();
  try {
    var dataPlotDef = jqElm.data( 'PlotDef' ).data;
    dataPlotDef.forEach( ( item ) => {
      var opsPath = item.tlm.name;
      var color = item.color;
      var label = item.label;

      var htmlStr = '<button type="button" class="data-plot-defs" data-active=false onclick=aplStateToggle(this) data-opspath=' + opsPath + '  style="color:' + color + ';border:1px solid ' + color + '">' + label + '</button>';
      jqElm.append( htmlStr );
    } );
  } catch ( e ) {
    cu.logDebug( 'renderAplPanel | Plot definition not defined' );
  }
  /* Query and add msgID to Telemetry Control section */
  getMsgIdAndMacrosFromConfigDb( jqElm )

}

/**
 * Show or Hide configuration area of dataplot
 * @param {Object} elm current dataplot element
 */
function aplStateToggle( elm ) {
  var state = $( elm ).data( 'active' );
  if ( state ) {
    $( elm ).attr( 'class', 'data-plot-defs' );
    $( elm ).data( 'active', false );
  } else {
    $( elm ).attr( 'class', 'data-plot-defs active' );
    $( elm ).data( 'active', true );
  }
}

/**
 * Removes a data item from staging area of dataplots
 * @param {Object} elm current dataplot element
 */
function removeDpItem( elm ) {
  var apl = $( elm.parentNode.parentNode.lastChild.firstChild ).find( '.active-plot-list-content' )[ 0 ];
  var form = elm.parentNode.parentNode.parentNode;
  var nodeElm = $( form.parentNode.parentNode ).find( '[data-cdr]' )[ 0 ];
  var finds = $( apl ).find( '.data-plot-defs.active' );
  var dataPlotDef = $( apl ).data( 'PlotDef' );

  for ( var i = 0; i < finds.length; i++ ) {
    var opsPath = $( finds[ i ] ).data( 'opspath' );
    for ( var j = 0; j < dataPlotDef[ 'data' ].length; j++ ) {
      if ( opsPath == dataPlotDef[ 'data' ][ j ][ 'tlm' ][ 'name' ] ) {
        dataPlotDef[ 'data' ].splice( j, 1 );
      }
    }
  }
  if ( dataPlotDef[ 'data' ].length == 0 ) {
    try {
      var key = nodeElm.getAttribute( 'plot-key' );
      nodeElm.setAttribute( 'plot-key', undefined );
      $( nodeElm ).empty();
      dataplot_subscriptions[ key ].UtilGraph.destroy();
      delete dataplot_subscriptions[ key ];
    } catch ( e ) {
      cu.logDebug( 'removeDpItem | failed to clear graph ' );
    }
  }
  $( apl ).data( 'PlotDef', dataPlotDef );
  try {
    renderAplPanel( $( apl ) );
  } catch ( e ) {
    cu.logDebug( 'renderAplPanel | Plot definition not defined' );
  }
}

/**
 * Clear and removes dataplot
 * @param {Object} elm current dataplot element
 */
function ClearPlots( elm ) {
  try {
    var dpcontainer = elm.parentElement.nextSibling;
    var apl = $( dpcontainer ).find( '.active-plot-list-content' );
    var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
    var key = nodeElm.getAttribute( 'plot-key' );
    dataplot_subscriptions[ key ].UtilGraph.destroy();
    nodeElm.removeAttribute( 'plot-key' );
    $( nodeElm ).empty();
    delete dataplot_subscriptions[ key ];
  } catch ( e ) {
    cu.logError( 'ClearPlots |  error=', e.message );
  }
}

/**
 * Plays dataplot
 * @param {Object} elm current dataplot element
 */
function PlayPlots( elm ) {

  var dpcontainer = elm.parentElement.nextSibling;
  var apl = $( dpcontainer ).find( '.active-plot-list-content' );
  var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
  var dataPlotDef = apl.data( 'PlotDef' );
  var key = nodeElm.getAttribute( 'plot-key' );

  if ( key === undefined | key === null ) {
    if ( dataPlotDef != {} & typeof dataPlotDef == 'object' ) {
      if ( dataPlotDef.hasOwnProperty( 'data' ) ) {
        if ( dataPlotDef[ 'data' ].length != 0 ) {

          var generatedKey = cu.makeKey();
          nodeElm.setAttribute( 'plot-key', generatedKey );
          dataplot_subscriptions[ generatedKey ] = new CmdrTimeSeriesDataplot( nodeElm, dataPlotDef, {}, true );
          dataplot_subscriptions[ generatedKey ].start();
        }
      }
    }
  } else {
    dataplot_subscriptions[ key ].Play();
  }
}

/**
 * Pauses dataplot
 * @param {Object} elm current dataplot element
 */
function PausePlots( elm ) {
  var dpcontainer = elm.parentElement.nextSibling;
  var apl = $( dpcontainer ).find( '.active-plot-list-content' );
  var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
  var dataPlotDef = apl.data( 'PlotDef' );
  var key = nodeElm.getAttribute( 'plot-key' );
  if ( key === undefined | key === null ) {
    cu.logError( 'PausePlots | dataplot key undefined ' );
  } else {
    dataplot_subscriptions[ key ].Pause();
  }
}

/**
 * Resynchronizes the dataplot
 * @param {Object} elm current dataplot element
 */
function ResyncPlots( elm ) {
  var dpcontainer = elm.parentElement.nextSibling;
  var apl = $( dpcontainer ).find( '.active-plot-list-content' );
  var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
  var dataPlotDef = apl.data( 'PlotDef' );
  var key = nodeElm.getAttribute( 'plot-key' );
  if ( key === undefined | key === null ) {
    cu.logError( 'ResyncPlots | dataplot key undefined ' );
  } else {
    dataplot_subscriptions[ key ].Resync();
  }
}

/**
 * Display/Hide query selector for dataplot
 */
function DisplayControlForQuerySelector( elm ) {
  var dispState = elm.parentNode.nextElementSibling.firstChild.style.display;
  if ( dispState == 'none' | dispState == '' ) {
    elm.parentNode.nextElementSibling.firstChild.style.display = 'flow-root';
    elm.firstChild.setAttribute( 'class', 'fa fa-caret-square-o-up' )
  } else if ( dispState == 'flow-root' ) {
    elm.parentNode.nextElementSibling.firstChild.style.display = 'none';
    elm.firstChild.setAttribute( 'class', 'fa fa-caret-square-o-down' )
  }
}

/**
 * Query's database and obtains msg macros and msg ID's
 */
function getMsgIdAndMacrosFromConfigDb( apl ) {
  var dataPlotDef = apl.data( 'PlotDef' );
  var opsPaths = [];
  if ( dataPlotDef !== undefined ) {
    for ( var i in dataPlotDef.data ) {
      opsPaths.push( dataPlotDef.data[ i ].label );
    }
    session.callPlugin( 'sch', 'getMessageIDsAndMacrosFromMsgName', {
      opsPaths: opsPaths
    }, function( msg ) {
      var tcArticle = apl.closest( 'article' ).next();
      var tcTbody = $( tcArticle ).find( '#cdr-dataplot-tc' );
      var msgCount = tcTbody.data( 'msgcount' );
      /* remove previously added msgs*/
      if ( msgCount > 0 ) {
        for ( var i = 0; i < msgCount; ++i ) {
          tcTbody.children().last().remove();
        }
        msgCount = 0;
      }
      for ( var i in msg ) {
        var each = msg[ i ];
        var cmdAddMsgFlow = {
          cmd: {
            name: '/TO/TO_AddMessageFlowCmd_t',
            argument: [ {
              name: 'MsgID',
              value: each.msgID
            }, {
              name: 'MsgLimit',
              value: 1
            }, {
              name: 'ChannelIdx',
              value: 0
            } ]
          },
          indicator: 'cmd'
        };
        var cmdRemoveMsgFlow = {
          cmd: {
            name: '/TO/TO_RemoveMessageFlowCmd_t',
            argument: [ {
              name: 'MsgID',
              value: each.msgID
            }, {
              name: 'ChannelIdx',
              value: 0
            } ]
          },
          indicator: 'cmd'
        };
        tcTbody.append(
          '<tr><td>' + each.macro + '</td><td>' +
          '<div class="btn-group">' +
          '<div class="button btn cdr-outline-primary" data-cdr=' + JSON.stringify( cmdAddMsgFlow ) + '>' +
          'Add' +
          '</div>' +
          '<div class="button btn cdr-outline-primary" data-cdr=' + JSON.stringify( cmdRemoveMsgFlow ) + '>' +
          'Remove' +
          '</div>' +
          '</div>' +
          '</td></tr>'
        );
        msgCount += 1;
      }
      tcTbody.data( 'msgcount', msgCount )
      forceLoadCommands( tcTbody );
    } )
  }
}

/**
 * Save event log to file as CSV
 */
function exportToCsv() {
  var outCSV = [];

  if ( window.EventLog != undefined ) {

    var headers = Object.keys( window.EventLog[ 0 ] );
    outCSV.push( headers.join( ',' ) );
    /* sort eventlog in ascending order */
    window.EventLog.sort( ( a, b ) => {
      var dateA = new Date( a.GRNDTIME ),
        dateB = new Date( b.GRNDTIME );
      /* sort by date ascending */
      return dateA - dateB
    } );

    while ( window.EventLog.length != 0 ) {
      var csvRow = [];
      var row = window.EventLog.pop();
      for ( var i in headers ) {
        var key = headers[ i ];
        csvRow.push( String( row[ key ] ).replace( ',', ';' ) );
      }
      outCSV.push( csvRow.join( ',' ) );
    }

  }
  // CSV file
  var csvBlob = new Blob( [ outCSV.join( '\n' ) ], {
    type: "text/csv"
  } );

  saveAs( csvBlob, 'CDR_EVENT_LOG.csv' );

  cu.logInfo( 'exportToCsv | csv exported' );
}

/**
 * Save event log to file as JSON
 */
function exportToJSON() {
  var outStr;

  if ( window.EventLog != undefined ) {

    /* sort eventlog in ascending order */
    window.EventLog.sort( ( a, b ) => {
      var dateA = new Date( a.GRNDTIME ),
        dateB = new Date( b.GRNDTIME );
      /* sort by date ascending */
      return dateA - dateB
    } );

    outStr = JSON.stringify( window.EventLog, null, ' ' )
    window.EventLog = [];
  }
  // JSON file
  var jsonBlob = new Blob( [ outStr ], {
    type: "text/json;charset=utf-8"
  } );

  saveAs( jsonBlob, 'CDR_EVENT_LOG.json' );

  cu.logInfo( 'exportToJSON | json exported' );
}

/**
 * Automatic Save every 30 mins
 */
var autoEventLogSaveIntervalID = setInterval( function() {

  if ( window.EventLog != undefined ) {
    if ( window.EventLog.length > 5000 ) {
      exportToCsv();
    }
  }

}, 30 * 60 * 1000 );


/**
 * Check Voice command compatability
 */
function checkCompatability() {

  $( '#cdr-voice-cmd' ).data( 'state', 'inactive' );

  /* Firefox check */
  if (
    navigator.userAgent.indexOf( 'Firefox' ) != -1 &&
    window.SpeechRecognition != undefined
  ) {
    $( '#cdr-voice-cmd' ).data( 'state', 'active' );
  }

  /* Chrome check */
  if (
    navigator.userAgent.indexOf( 'Chrome' ) != -1 &&
    window.webkitSpeechRecognition != undefined
  ) {
    $( '#cdr-voice-cmd' ).data( 'state', 'active' );
  }

  updateSpeechRecogUI();

  if ( $( '#cdr-voice-cmd' ).data( 'state' ) == 'inactive' ) {
    cu.logError( 'VoiceCommanding | browser not compatible.' );
    return;
  }

  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  window.SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
  window.SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;
  window.recognition = new SpeechRecognition();
  window.speechRecognitionList = new SpeechGrammarList();
  window.recognition.continuous = false;
  window.recognition.lang = 'en-US';
  window.recognition.interimResults = false;
  window.recognition.maxAlternatives = 1;

  initSpeechListener();

  /* speech synthesis */
  window.speechSynth = window.speechSynthesis;
  window.googleEnglishVoiceIndex = window.speechSynth.getVoices()[ 1 ];
  window.googleUKEnglishFemaleVoiceIndex = window.speechSynth.getVoices()[ 2 ];


  $( '#cdr-voice-cmd' ).on( {
    click: function() {
      var speechRecogState = $( '#cdr-voice-cmd' ).data( 'state' );

      if ( speechRecogState == 'active' ) {
        $( '#cdr-voice-cmd' ).data( 'state', 'listening' );
        speechListen();
      }

      if ( speechRecogState == 'listening' ) {
        $( '#cdr-voice-cmd' ).data( 'state', 'active' );
        speechUnListen();
      }

      updateSpeechRecogUI();
    }
  } );

}


function updateSpeechRecogUI() {

  var speechRecogState = $( '#cdr-voice-cmd' ).data( 'state' );

  $( '#cdr-voice-cmd' ).removeClass( 'fa-microphone' );
  $( '#cdr-voice-cmd' ).removeClass( 'fa-microphone-slash' );
  $( '#cdr-voice-cmd' ).removeClass( 'cdr-txt-green' );
  $( '#cdr-voice-cmd' ).removeClass( 'cdr-txt-red' );
  $( '#cdr-voice-cmd' ).removeClass( 'cdr-txt-blue' );
  $( '#cdr-voice-cmd' ).removeClass( 'cdr-txt-none' );

  if ( typeof $( '#cdr-voice-cmd' ).data( 'blinkInterval' ) == 'number' ) {
    clearInterval( $( '#cdr-voice-cmd' ).data( 'blinkInterval' ) )
  }

  if ( speechRecogState == 'active' ) {
    $( '#cdr-voice-cmd' ).addClass( "fa-microphone cdr-txt-green" )
  }

  if ( speechRecogState == 'inactive' ) {
    $( '#cdr-voice-cmd' ).addClass( "fa-microphone-slash cdr-txt-red" )
  }

  if ( speechRecogState == 'listening' ) {

    $( '#cdr-voice-cmd' ).addClass( "fa-microphone cdr-txt-blue" )

    var blinkIntervalId = setInterval( () => {
      $( '#cdr-voice-cmd' ).toggleClass( "cdr-txt-blue cdr-txt-none" )
    }, 500 );

    $( '#cdr-voice-cmd' ).data( 'blinkInterval', blinkIntervalId );

  }

}


/**
 * listen to commands
 */
function initSpeechListener() {

  window.VoiceCommandingQueue = [];
  window.yesNoExpectation = false;

  window.recognition.onresult = function( event ) {

    var text = event.results[ 0 ][ 0 ].transcript.toLowerCase();
    var confidence = event.results[ 0 ][ 0 ].confidence;

    cu.logInfo( 'VoiceCommanding | You have said [' + text + '] | Recognition confidence = ' + confidence.toFixed( 2 ) );


    if ( !window.yesNoExpectation ) {

      if ( text.split( ' ' )[ 0 ] == 'commander' ) {
        var utterThis = new SpeechSynthesisUtterance( 'You\'ve said ' + text + ', is that right?' );
        utterThis.voice = window.googleEnglishVoice
        window.speechSynth.speak( utterThis );
        window.VoiceCommandingQueue.push( text );
        window.yesNoExpectation = true;

        utterThis.onend = function() {
          cu.logDebug( 'VoiceCommanding | Syth Speaking Ended.' );
          speechUnListen()
        }

      } else {
        window.yesNoExpectation = false;
      }



    } else {

      if ( text == 'yes' ) {
        cu.logDebug( 'VoiceCommanding | Applying voice command' );
        var utterThis = new SpeechSynthesisUtterance( 'applying command' );
        utterThis.voice = window.googleEnglishVoice
        window.speechSynth.speak( utterThis );

        commandHandling( window.VoiceCommandingQueue.pop() );
        utterThis.onend = function() {
          cu.logDebug( 'VoiceCommanding | Syth Speaking Ended.' );
          speechUnListen()
        }

      } else {

        cu.logError( 'VoiceCommanding | Rejecting voice command' );
        var utterThis = new SpeechSynthesisUtterance( 'unknown command rejected' );
        utterThis.voice = window.googleEnglishVoice
        window.VoiceCommandingQueue.pop()
        window.speechSynth.speak( utterThis );
        utterThis.onend = function() {
          cu.logDebug( 'VoiceCommanding | Syth Speaking Ended.' );
          speechUnListen()
        }

      }

      window.yesNoExpectation = false;
    }
  }

  window.recognition.onspeechend = function() {
    cu.logDebug( 'VoiceCommanding | User Speaking Ended.' );
  }

  window.recognition.onerror = function( event ) {
    cu.logError( 'VoiceCommanding | Error occurred in recognition: ', event.error );
    if ( event.error == 'no-speech' ) {
      speechUnListen()
    } else {
      $( '#cdr-voice-cmd' ).data( 'state', 'inactive' );
      updateSpeechRecogUI();
    }

  }
  window.recognition.onstart = function( event ) {
    cu.logInfo( 'VoiceCommanding | Listening ...' );
  }
  window.recognition.onspeechstart = function( event ) {
    cu.logInfo( 'VoiceCommanding | User Speaking ...' );
  }
  window.recognition.onend = function( event ) {
    cu.logInfo( 'VoiceCommanding | Listening Ended' );
    if ( $( '#cdr-voice-cmd' ).data( 'state' ) == 'listening' ) {
      window.recognition.start();
    }
  }

}

function speechListen() {
  window.recognition.start();
}

function speechUnListen() {
  window.recognition.stop();
}

function recoverListener() {

  window.recognition.stop();
  window.recognition.start();

}


function commandHandling( query ) {

  if ( query == 'commander test' ) {
    session.sendCommand( {
      ops_path: '/VM/Noop',
      args: {}
    } );
  }

  if ( query == 'commander arm' ) {
    session.sendCommand( {
      ops_path: '/VM/Arm',
      args: {}
    } );
  }

  if ( query == 'commander disarm' ) {
    session.sendCommand( {
      ops_path: '/VM/Disarm',
      args: {}
    } );
  }

  if ( query == 'commander take off' ) {
    session.sendCommand( {
      ops_path: '/VM/Arm',
      args: {}
    } );
    session.sendCommand( {
      ops_path: '/VM/AutoTakeOff',
      args: {}
    } );
  }

  if ( query == 'commander loiter' ) {
    session.sendCommand( {
      ops_path: '/VM/AutoLoiter',
      args: {}
    } );
  }

  if ( query == 'commander land' ) {
    session.sendCommand( {
      ops_path: '/VM/AutoLand',
      args: {}
    } );
  }

  if ( query == 'commander switch to position control mode' ) {
    session.sendCommand( {
      ops_path: '/VM/PosCtl',
      args: {}
    } );
  }

  if ( query == 'commander switch to manual control mode' ) {
    session.sendCommand( {
      ops_path: '/VM/Manual',
      args: {}
    } );
  }

  if ( query == 'commander switch to altitude control mode' ) {
    session.sendCommand( {
      ops_path: '/VM/AltCtl',
      args: {}
    } );
  }

  if ( query == 'commander return home' ) {
    session.sendCommand( {
      ops_path: '/VM/AutoRtl',
      args: {}
    } );
  }

}