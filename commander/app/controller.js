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

/**
 * A event which notifies that a new layout has been loaded
 * @type {CustomEvent}
 */
var llc = new CustomEvent( 'layout-load-complete' );
/**
 * For CommanderClient instance
 * @type {Boolean}
 */
var session;
/**
 * If true it means session was never connected before
 * @type {Boolean}
 */
var _sescon_never = true;
var global_drag_source_dict = [];

/* appctl main - this script execution starts from here */
$( () => {
  /**
   * Session instance
   * @type {CommanderClient}
   */
  session = new CommanderClient();

  /**
   * Default GoldenLayout configuration
   * @type {Object}
   */
  var config = {
    settings: {
      selectionEnabled: true,
      showPopoutIcon: false
    },
    content: [ {
      type: 'row',
      content: [ {
          type: 'component',
          componentName: 'Blank',
          componentState: {
            text: 'Component 1'
          }
        },
        {
          type: 'component',
          componentName: 'Blank',
          componentState: {
            text: 'Component 2'
          }
        }
      ]
    } ]
  }



  /* if a different browser opened this application then that browser will set
   * the starting cofiguration of current layout, If such a configuration exists
   * copy over default configuration */
  if ( window.__backupConfig != undefined | window.__backupConfig != null ) {
    cu.lofDebug( 'Connection | window has preloaded configuration.' );
    config = window.__backupConfig;
  }

  /* connecting to a session, upon connection load
   * sidebar and directory listing */
  session.on( 'connect', function() {

    cu.logInfo( 'Connection | session connected' );

    if ( _sescon_never ) {
      var defaultLayoutPromise = new Promise( ( resolve, reject ) => {

        session.getDefaultLayout( function( resp ) {
          if ( window.__backupConfig == undefined | window.__backupConfig == null ) {
            config = resp;
            resolve( 'Success!' );
          }
        } );

      } );
      defaultLayoutPromise.then( () => {
        session.getPanels( '/', function( dirEntries ) {
          var panelEntries = [];
          /* modify dirEntries */
          for ( var entryID in dirEntries ) {
            var entry = {
              name: '/' + entryID,
              text: dirEntries[ entryID ].shortDescription,
              longDescription: dirEntries[ entryID ].longDescription,
              path: '/' + entryID,
              urlPath: '/' + entryID,
              type: dirEntries[ entryID ].type,
              lazyLoad: true,
              ext: entryID,
              selectable: false,
              checkable: false
            };
            panelEntries.push( entry );
          }
          $( '#cdr-panel-menu-container' ).treeview( {
            data: panelEntries,
            levels: 1,
            backColor: '#343a40',
            selectedBackColor: "#fff",
            selectedColor: "#343a40",
            onhoverColor: "#fff",
            wrapNodeText: true,
            collapseIcon: 'fa fa-folder-open',
            expandIcon: 'fa fa-folder',
            showBorder: false,
            lazyLoad: UpdatePanelNode,
            onNodeRendered: NodeRendered,
            onNodeSelected: NodeSelected,
          } );
        } );
        session.getLayouts( '/', function( dirEntries ) {
          var entries = [];
          /* modify dirEntries */
          for ( var entryID in dirEntries ) {
            var entry = {
              name: '/' + entryID,
              text: dirEntries[ entryID ].shortDescription,
              longDescription: dirEntries[ entryID ].longDescription,
              path: '/' + entryID,
              urlPath: '/' + entryID,
              type: dirEntries[ entryID ].type,
              lazyLoad: true,
              ext: entryID,
              selectable: false,
              checkable: false
            };
            entries.push( entry );
          }
          $( '#cdr-layout-menu-container' ).treeview( {
            data: entries,
            levels: 1,
            backColor: '#343a40',
            selectedBackColor: "#fff",
            selectedColor: "#343a40",
            onhoverColor: "#fff",
            wrapNodeText: true,
            collapseIcon: 'fa fa-folder-open',
            expandIcon: 'fa fa-folder',
            showBorder: false,
            lazyLoad: UpdateLayoutNode,
            onNodeRendered: NodeRendered,
            onNodeSelected: NodeSelected,
          } );
        } );
        session.getWidgets( '/', function( dirEntries ) {
          var entries = [];
          /* modify dirEntries */
          for ( var entryID in dirEntries ) {
            var entry = {
              name: '/' + entryID,
              text: dirEntries[ entryID ].shortDescription,
              longDescription: dirEntries[ entryID ].longDescription,
              path: '/' + entryID,
              urlPath: '/' + entryID,
              type: dirEntries[ entryID ].type,
              lazyLoad: true,
              ext: entryID,
              selectable: false,
              checkable: false
            };
            entries.push( entry );
          }
          $( '#cdr-widget-menu-container' ).treeview( {
            data: entries,
            levels: 1,
            backColor: '#343a40',
            selectedBackColor: "#fff",
            selectedColor: "#343a40",
            onhoverColor: "#fff",
            wrapNodeText: true,
            collapseIcon: 'fa fa-folder-open',
            expandIcon: 'fa fa-folder',
            showBorder: false,
            lazyLoad: UpdateWidgetNode,
            onNodeRendered: WidgetNodeRendered,
            // onNodeSelected: NodeSelected,
          } );
        } );
        /**
         * Load a layout for the application for first time
         * @type {window}
         */
        myLayout = new window.GoldenLayout( config, $( '#cdr-layout-container' ) );
        updateDragSources();
        window.dispatchEvent( llc );
        InitLayout( myLayout );

        /* load resources */
        InitModal();
        InitMenuState();
        InitToolTips();
        InitScrollBar();
        InitResizeCtl();
        InitSidebar();
        InitWidgets();
        /* false means previously, there had already been a session connection */
        _sescon_never = false;
      } ).catch( ( e ) => {
        cu.logError( 'Error occured while loading default layout ', e );
      } )
    }
  } );
} );