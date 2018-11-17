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
  /* os-theme-dark class should be added to every pug file in the top element */
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( {
      "autoUpdate": true
    } );
  }, 10 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( {
      "autoUpdate": true
    } );
  }, 100 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( {
      "autoUpdate": true
    } );
  }, 250 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( {
      "autoUpdate": true
    } );
  }, 500 );
  setTimeout( function() {
    $( applyScrollTo.join( ',' ) ).overlayScrollbars( {
      "autoUpdate": true
    } );
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



function addDpItem( elm ) {
  var apl = elm.parentNode.parentNode.lastChild.firstChild;
  var form = elm.parentNode.parentNode.parentNode;
  var appName = $( form ).find( '[type="text"]' )[ 0 ].value == '' ? $( form ).find( '[type="text"]' )[ 0 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 0 ].value;
  var msgName = $( form ).find( '[type="text"]' )[ 1 ].value == '' ? $( form ).find( '[type="text"]' )[ 1 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 1 ].value;
  var fieldName = $( form ).find( '[type="text"]' )[ 2 ].value == '' ? $( form ).find( '[type="text"]' )[ 2 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 2 ].value;

  var opsName = '/' + appName + '/' + msgName + '/' + fieldName;

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

  if ( !duplicateExists & dataPlotDef[ 'data' ].length < 5 ) {
    var color = cu.makeColor()
    dataPlotDef[ 'data' ].push( {
      tlm: {
        name: opsName
      },
      color: color,
      label: fieldName,
    } );
    $( apl ).data( 'PlotDef', dataPlotDef );
    renderAplPanel( $( apl ) );
  }
}

function renderAplPanel( jqElm ) {
  jqElm.empty();
  var dataPlotDef = jqElm.data( 'PlotDef' ).data;

  dataPlotDef.forEach( ( item ) => {
    var opsPath = item.tlm.name;
    var color = item.color;
    var label = item.label;

    var htmlStr = '<button type="button" class="data-plot-defs" data-active=false onclick=aplStateToggle(this) data-opspath=' + opsPath + '  style="color:' + color + ';border:1px solid ' + color + '">' + label + '</button>';
    jqElm.append( htmlStr );

  } );

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
  var apl = elm.parentNode.parentNode.lastChild.firstChild;
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
  renderAplPanel( $( apl ) );
}

function clearDataPlot( elm ) {
  var dpcontainer = elm.parentElement.nextSibling;
  var apl = $( dpcontainer ).find( '.active-plot-list' );
  var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
  var key = nodeElm.getAttribute( 'plot-key' );
  dataplot_subscriptions[ key ].UtilGraph.destroy();
  nodeElm.setAttribute( 'plot-key', undefined );
  $( nodeElm ).empty();
  delete dataplot_subscriptions[ key ];
  apl.data( 'PlotDef', {
    data: [],
    options: {}
  } );
  renderAplPanel( $( apl ) )
}

function launchPlots( elm ) {
  var dpcontainer = elm.parentElement.nextSibling;
  var apl = $( dpcontainer ).find( '.active-plot-list' );
  var nodeElm = $( dpcontainer ).find( '[data-cdr]' )[ 0 ];
  var dataPlotDef = apl.data( 'PlotDef' );

  try {
    var key = nodeElm.getAttribute( 'plot-key' );
    nodeElm.setAttribute( 'plot-key', undefined );
    $( nodeElm ).empty();
    dataplot_subscriptions[ key ].UtilGraph.destroy();
    delete dataplot_subscriptions[ key ];
  } catch ( e ) {
    cu.logDebug( 'launchPlots | failed to clear graph ' );
  }


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


}


/**
 * Display/Hide query selector for dataplot
 */
function DisplayControlForQuerySelector( elm ) {
  var dispState = elm.parentNode.nextElementSibling.firstChild.style.display;
  if ( dispState == 'none' | dispState == '' ) {
    elm.parentNode.nextElementSibling.firstChild.style.display = 'grid';
    elm.firstChild.setAttribute( 'class', 'fa fa-angle-up' )
  } else if ( dispState == 'grid' ) {
    elm.parentNode.nextElementSibling.firstChild.style.display = 'none';
    elm.firstChild.setAttribute( 'class', 'fa fa-angle-down' )
  }
}

/**
 * Adds new line/path to plot
 */
function AddPlot( elm ) {
  var form = elm.parentNode.nextElementSibling.firstChild.firstChild;
  var appName = $( form ).find( '[type="text"]' )[ 0 ].value == '' ? $( form ).find( '[type="text"]' )[ 0 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 0 ].value;
  var msgName = $( form ).find( '[type="text"]' )[ 1 ].value == '' ? $( form ).find( '[type="text"]' )[ 1 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 1 ].value;
  var fieldName = $( form ).find( '[type="text"]' )[ 2 ].value == '' ? $( form ).find( '[type="text"]' )[ 2 ].getAttribute( 'placeholder' ) : $( form ).find( '[type="text"]' )[ 2 ].value;
  var opsName = '/' + appName + '/' + msgName + '/' + fieldName;
  var nodeElm = elm.parentNode.nextElementSibling.lastChild.firstChild;
  var dataPlotDef = {};
  dataPlotDef[ 'data' ] = [];
  dataPlotDef[ 'options' ] = {};
  dataPlotDef[ 'data' ].push( {
    tlm: {
      name: opsName
    },
    color: 'yellow',
    label: opsName,
  } );


  var generatedKey = cu.makeKey();
  nodeElm.setAttribute( 'plot-key', generatedKey );
  dataplot_subscriptions[ generatedKey ] = new CmdrTimeSeriesDataplot( nodeElm, dataPlotDef, {}, true )
  dataplot_subscriptions[ generatedKey ].start()
  // console.log( data );
  //
  // var plotKey = plot.getAttribute( 'plot-key' );
  // dataplot_subscriptions[ plotKey ].addNewPath( data );
  // dataplot_subscriptions[ plotKey ].UtilGraph.setupGrid();
  // dataplot_subscriptions[ plotKey ].UtilGraph.draw();
  // }, 20 );

  // var plot = elm.parentNode.nextElementSibling.lastChild.firstChild;
  // var data = $( plot ).data( 'cdr' )
  // data.tlm.push( {
  //   name: opsName
  // } );
  // data.label.push( fieldName );
  // data.color.push( 'yellow' );
  // $( plot ).data( 'cdr', data )
  // console.log( plot );
  // console.log( $( plot ) );
  //
  // var plotKey = plot.getAttribute( 'plot-key' );
  // dataplot_subscriptions[ plotKey ].UtilGraph.shutdown();
  // dataplot_subscriptions[ plotKey ].unsubscribeAll();
  // delete dataplot_subscriptions[ plotKey ];
  // $( plot ).empty();
  // forceLoadTlm( elm.parentNode.nextElementSibling )

}