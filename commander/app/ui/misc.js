'use strict';

/**
 * Sidebar visibitly status indicator, currenty not open
 * @type {Boolean}
 */
var _sidebar_open = false;

/**
 * Add the ability to toggle sidebar to menu toggle button
 * using transform for animation
 * @constructor
 */
function InitSidebar() {
  $( "#cdr-app-menu-toggle" ).on( "click", () => {
    if ( _sidebar_open ) {
      $( "#cdr-app-menu" ).css( "transform", "translateX(-100%)" )
      $( "#cdr-layout-container" ).css( "margin-left", "0%" )
      $( "#cdr-layout-container" ).css( "width", "100%" )
      myLayout.updateSize();
      _sidebar_open = false;
      $( "#cdr-panel-layout-switch" ).css( "display", "none" );
    } else {
      $( "#cdr-app-menu" ).css( "transform", "translateX(0%)" )
      $( "#cdr-layout-container" ).css( "margin-left", "250px" )
      $( "#cdr-layout-container" ).css( "width", "calc(100% - 250px)" )
      $( "#cdr-panel-layout-switch" ).css( "display", "flex" );
      myLayout.updateSize();
      _sidebar_open = true;
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
  } )
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

function aplStateToggle( elm, color ) {
  var state = $( elm ).data( 'active' );
  if ( state ) {
    $( elm ).attr( 'class', 'data-plot-defs' );
    $( elm ).data( 'active', false );
  } else {
    $( elm ).attr( 'class', 'data-plot-defs active' );
    $( elm ).data( 'active', true );
  }
}

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

function PlayPlots( elm ) {

  var dpcontainer = elm.parentElement.nextSibling;
  var apl = $( dpcontainer ).find( '.active-plot-list-content' );
  var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
  var dataPlotDef = apl.data( 'PlotDef' );
  var key = nodeElm.getAttribute( 'plot-key' );

  if ( key === undefined | key === null ) {
    if ( dataPlotDef != {} ) {
      if ( dataPlotDef.hasOwnProperty( 'data' ) ) {
        if ( dataPlotDef[ 'data' ].length != 0 ) {

          var generatedKey = cu.makeKey();
          nodeElm.setAttribute( 'plot-key', generatedKey );
          dataplot_subscriptions[ generatedKey ] = new CmdrTimeSeriesDataplot( nodeElm, dataPlotDef, {}, true )
          dataplot_subscriptions[ generatedKey ].start()
        }
      }
    }
  } else {
    dataplot_subscriptions[ key ].Play();
  }
}

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
setInterval( function() {

  if ( window.EventLog != undefined ) {
    if ( window.EventLog.length > 5000 ) {
      exportToCsv();
    }
  }

}, 30 * 60 * 1000 );