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
  }
  /* adds tooltips and context menu feature to navbar */
  navBarTooltips( node, node.$el );
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