'use strict';

/**
 * Check if node in a tree is already rendered
 * @param  {Object}  n node to be rendered
 * @return {Boolean}   true if aready rendered otherwise false
 */
function isAlreadyRendered( n ) {
  /* introspect for events which are attaced to the node */
  var events = $._data( n, "events" )
  var result = false;
  if ( events != undefined ) {
    if ( events.hasOwnProperty( 'mousedown' ) ||
      events.hasOwnProperty( 'touchdown' ) ) {
      result = true;
    }
  }
  return result;
}

/**
 * This function is triggered when a new node is rendered
 * @param       {Object} e    event object
 * @param       {Object} node node object
 */
function NodeRendered( e, node ) {
  /* if node to be rendered is a file, a .pug file */
  if ( node.type === "file" & !isAlreadyRendered( node.$el[ 0 ] ) ) {
    /* add url to be node's state, which will be loaded when node is rendered
     * on the layout, by drag or select proceadures */
    var newItemConfig = {
      id: node.id,
      title: node.text,
      type: 'component',
      componentName: 'Blank',
      componentState: {
        text: "text",
        link: node.urlPath
      }
    };
    /* make this node dragable on to the layout
     * which will initialize a panel with tables and data. */
    myLayout.createDragSource( node.$el[ 0 ], newItemConfig );
    global_drag_source_dict.push( {
      elm: node.$el[ 0 ],
      cfg: newItemConfig
    } );
  }
  /* adds tooltips and context menu feature to navbar */
  navBarTooltips( node, node.$el );
}
/**
 * Updated drag sources which were instantiated only one time on page load
 */
function updateDragSources() {
  for ( var i in global_drag_source_dict ) {
    window.myLayout.createDragSource( global_drag_source_dict[ i ].elm, global_drag_source_dict[ i ].cfg );
  }

}

/**
 * This function is triggered when a node is selected
 * @param       {Object} e    event object
 * @param       {Object} node node object
 * @constructor
 */
function NodeSelected( e, node ) {
  /* if node to be rendered is a file, a .pug file */
  if ( node.type === 'file' ) {
    /* add url to be node's state, which will be loaded when node is rendered
     * on the layout, by drag or select proceadures */
    var newItemConfig = {
      id: node.id,
      title: node.text,
      type: 'component',
      componentName: 'Blank',
      componentState: {
        text: 'text',
        link: node.urlPath
      }
    };
    /* a colum or stack has to be seleted before selecting the node.
     * check if a selection is done.*/
    if ( myLayout.selectedItem === null ) {
      /* notify on developer console */
      cu.logError( 'NodeSelected | Container not selected. Choose any container to load component.' );
    } else {
      /* add new item or panel or tab to layout */
      myLayout.selectedItem.addChild( newItemConfig );
    }
  } else if ( node.type === 'config' ) {
    /* if node to be rendered is a layout file, a .lyt file */
    /* read the file into json object */
    $.get( node.urlPath, ( response ) => {
      var jsonObj = JSON.parse( response );
      if ( response !== null ) {
        /* destrory previous layout, make new layout with the configuration
         * .lyt file and emit layout loaded event for dependencies to react */
        myLayout.destroy();
        myLayout = new window.GoldenLayout( jsonObj, $( '#cdr-layout-container' ) );
        updateDragSources();
        window.dispatchEvent( llc );
        InitLayout( myLayout );
      } else {
        cu.logError( 'Layout | cannot be loaded from config file' )
      }
    } );
  }
}

/**
 * Collapse all items in menu
 * @param       {Object} item item
 */
function NodesCollapse( item ) {
  $( "#cdr-" + item + "-menu-container" ).treeview( 'collapseAll', {
    silent: true
  } );
}

/**
 * Keeps track of the specific widget being moved
 * @type {Boolean}
 */
var original = false;
/**
 * Stores widget state
 * @type {Object}
 */
var widgetState = {}

/**
 * This function is triggered when a new widget node is rendered
 * @param       {Object} e    event object
 * @param       {Object} node node object
 */
function WidgetNodeRendered( e, node ) {
  /* if node to be rendered is a file, a .pug file */
  if ( node.type === "file" & !isAlreadyRendered( node.$el[ 0 ] ) ) {
    node.$el.mousedown( function() {
      original = true;
    } );
    node.$el.draggable( {
      cursor: "move",
      appendTo: "body",
      containment: "body",
      snapMode: "inner",
      scroll: false,
      zIndex: 10000,
      helper: function( event ) {
        var uniqueID = cu.makeKey();
        var uniqueGadgetID = 'cdr-gadget-' + uniqueID
        var gadgetHtml = '<div id=' + uniqueGadgetID + ' data-url=' + node.url + ' class="cdr-gadget cdr-gadget-dragged">' +
          '<div data-key=' + uniqueID + ' class="cdr-gadget-close" onclick=gadgetCloseHandle(this)>x' +
          '</div>' +
          '<div data-key=' + uniqueID + ' class="cdr-gadget-content">' +
          '</div></div>';
        var opObj = $( gadgetHtml );
        opObj.find( '.cdr-gadget-content' ).load( node.url );

        return opObj;
      },
      stop: function( event ) {
        console.log( "drag end" )
      }

    } );

  }
  /* adds tooltips and context menu feature to navbar */
  navBarTooltips( node, node.$el );
}


/* Droppable functionality on widgets dragged from side bar */
$( ".cdr-well" ).droppable( {
  drop: function( event, ui ) {
    var feasiblility = true;
    var wellWidth = $( this ).width();
    var totalChildenWidth = 0;
    var childrenCount = 0;
    $( this ).children().each( function() {
      totalChildenWidth = totalChildenWidth + $( this ).width() + 10;
      childrenCount += 1;
    } );
    if ( wellWidth - totalChildenWidth < ( ( childrenCount * 10 ) + 50 ) ) {
      feasiblility = false;
    }
    if ( original && feasiblility ) {
      ui.helper.removeClass( 'ui-draggable-dragging' );
      ui.helper.removeClass( 'cdr-gadget-dragged' );
      ui.helper.attr( 'onmouseleave', 'gadgetHoverHandle(this,"onmouseleave")' );
      ui.helper.attr( 'onmouseover', 'gadgetHoverHandle(this,"onmouseover")' );
      var newDiv = $( ui.helper ).clone().removeClass( 'ui-draggable-dragging' ).removeClass( 'cdr-gadget-dragged' );
      newDiv.css( 'position', 'inherit' )
      $( this ).append( newDiv );

      if ( $( this ).attr( 'id' ) in widgetState ) {
        widgetState[ $( this ).attr( 'id' ) ].push( newDiv.data( 'url' ) )
      } else {
        widgetState[ $( this ).attr( 'id' ) ] = [ newDiv.data( 'url' ) ]
      }
      session.saveWidgets( widgetState )
      original = false;
    }
  }
} );