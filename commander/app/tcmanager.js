  /**
   * Stores (k,v) pair of opsPath and a array of dependant DOM elements.
   * @type {Object}
   */
  var subscriptions = {};
  /**
   * Similar to subscription stores (k,v) pair of opsPath and a array of
   * dependant DOM elements for freestyle(rogue) subscriptions.
   * @type {Object}
   */
  var rogue_subscriptions = {};
  /**
   * Similar to subscription stores (k,v) pairs of opsPath and a array of
   * dependant flot.js plot element from DOM.
   * @type {Object}
   */
  var dataplot_subscriptions = {};
  /**
   * Time interval to check and unsubsscribe to rogue subscriptions
   * is set to a default value of 10 seconds
   * @type {Number}
   */
  var rogueCleanUpInterval = 10000;

  /**
   * Savely add rogue subscriptions to rogue_subscriptions
   * @param {String} key  operation path
   * @param {String} type type of subscription
   * @param {String} cls  class name
   */
  function setRogueSubsc( key, type, cls ) {
    if ( key in rogue_subscriptions ) {
      if ( type in rogue_subscriptions[ key ] ) {
        rogue_subscriptions[ key ][ type ].push( cls );
      } else {
        rogue_subscriptions[ key ][ type ] = [ cls ];
      }
    } else {
      rogue_subscriptions[ key ] = {}
      rogue_subscriptions[ key ][ type ] = [ cls ];
    }
  }

  /**
   * Regularly checks the DOM for rogue subscriptions or
   * the subscriptions made inside javascript rather than
   * invoking by markup, and unsubscribes the inactive ones.
   */
  setInterval( () => {
    for ( var e in rogue_subscriptions ) {
      var rogueClassesCollection = [];
      if ( rogue_subscriptions[ e ].hasOwnProperty( 'text' ) ) {
        for ( var i in rogue_subscriptions[ e ][ 'text' ] ) {
          rogueClassesCollection.push( {
            cls: rogue_subscriptions[ e ][ 'text' ][ i ],
            ind: 'text'
          } );
        }
      }
      if ( rogue_subscriptions[ e ].hasOwnProperty( 'plot' ) ) {
        for ( var i in rogue_subscriptions[ e ][ 'plot' ] ) {
          rogueClassesCollection.push( {
            cls: rogue_subscriptions[ e ][ 'plot' ][ i ],
            ind: 'plot'
          } );
        }
      }
      for ( var i in rogueClassesCollection ) {
        var rogueClasses = rogueClassesCollection[ i ];
        if ( $( rogueClasses.cls ).length == 0 ) {
          /* Delete the record of that rogue class */
          var index = rogue_subscriptions[ e ][ rogueClasses.ind ].indexOf( rogueClasses.cls );
          rogue_subscriptions[ e ][ rogueClasses.ind ].splice( index, 1 );
        }
      }
      /* delete record */
      if ( rogueClassesCollection.length == 0 ) {
        delete rogue_subscriptions[ e ]
        /*
         * has no DOM listeners or users
         */
        if ( !( subscriptions.hasOwnProperty( e ) ) ) {
          /*
           * the subscription has no active DOM users therefore
           * will unsubscribe to it
           */
          session.unsubscribe( [ {
            name: e
          } ] );
          cu.logInfo( 'RogueUnsubscribe | ', e, ' tlm unsubscribed' );
        }
      }
    }
  }, rogueCleanUpInterval );

  /**
   * processTelemetryUpdate is a call back function, on new data from subscribe
   * this function will execute processing and rendering it on the DOM
   * @param  {Object} param telemetry object
   * @return {undefined}
   */
  function processTelemetryUpdate( param ) {
    try {
      /* staleness indicator */
      var staleness = false;
      var sample = param.sample[ param.sample.length - 1 ];
      var value = sample.value;
      var gTime = sample.gndTime;
      var opsPath = param.opsPath;
      if ( opsPath in subscriptions ) {
        var opsPathDef = undefined;
        if ( subscriptions[ opsPath ].hasOwnProperty( 'def' ) ) {
          /* get tlm obj definition */
          opsPathDef = subscriptions[ opsPath ].def;
          if ( subscriptions[ opsPath ].def.timeout > 0 ) {
            /* evaluate staleness */
            if ( subscriptions[ opsPath ].lastUpdatedTime == undefined ) {
              subscriptions[ opsPath ].lastUpdatedTime = gTime;
            } else {
              var currentTime = new Date( gTime );
              var prevTime = new Date( subscriptions[ opsPath ].lastUpdatedTime );

              if ( ( currentTime.getTime() - prevTime.getTime() ) > subscriptions[ opsPath ].def.timeout ) {
                staleness = true;
              }
              subscriptions[ opsPath ].lastUpdatedTime = gTime;
            }
          }
        }
        for ( var i = 0; i < subscriptions[ opsPath ].elms.length; ++i ) {
          var nodeElm = subscriptions[ opsPath ].elms[ i ];
          var reqObj = cu.parseJSON( nodeElm.getAttribute( 'data-cdr' ) );
          var indicatorFormat = reqObj.indicator;
          var colorSets = {};
          /* Set value format */
          if ( reqObj.hasOwnProperty( 'tlm' ) ) {
            for ( var j = 0; j < reqObj.tlm.length; ++j ) {
              var tlmObj = reqObj.tlm[ j ]
              var name = tlmObj.name;
              if ( name == opsPath ) {
                if ( tlmObj.hasOwnProperty( 'format' ) ) {
                  value = sprintf( tlmObj.format, value );
                } else if ( tlmObj.hasOwnProperty( 'calibration' ) ) {
                  if ( tlmObj.calibration.hasOwnProperty( 'type' ) ) {
                    switch ( tlmObj.calibration.type ) {
                      case 'function':
                        if ( tlmObj.calibration.hasOwnProperty( 'function' ) ) {
                          value = window[ tlmObj.calibration.function ]( value );
                        }
                        break;

                      case 'enumeration':
                        if ( tlmObj.calibration.hasOwnProperty( 'enumerations' ) ) {
                          var enumerations = tlmObj.calibration.enumerations;
                          for ( var enumID in enumerations ) {
                            var enumeration = enumerations[ enumID ];

                            if ( enumeration.hasOwnProperty( 'name' ) && enumeration.hasOwnProperty( 'value' ) ) {
                              if ( enumeration.value === value ) {
                                value = enumeration.name;
                                break;
                              }
                            }
                          }
                        }
                    }
                  }
                }
              }
            }
          }
          cu.assert( indicatorFormat != undefined, 'Process TLM | indicator format is not found' );
          /* tlm with different indicator format are  delt differently */
          if ( indicatorFormat == 'text' ) {
            if ( opsPathDef != undefined ) {
              switch ( opsPathDef.dataType ) {
                case 'char':
                case 'string':
                case 'int8':
                case 'uint8':
                case 'int16':
                case 'uint16':
                case 'int32':
                case 'uint32':
                case 'int64':
                case 'uint64':
                  {
                    if ( staleness ) {
                      nodeElm.setAttribute( 'class', 'stale' );
                    } else {
                      nodeElm.removeAttribute( 'class' );
                    }
                    nodeElm.textContent = value;
                    break;
                  }
                case 'double':
                case 'float':
                  {
                    if ( staleness ) {
                      nodeElm.setAttribute( 'class', 'stale' );
                    } else {
                      nodeElm.removeAttribute( 'class' );
                    }
                    nodeElm.textContent = value;
                    break;
                  }
                case 'boolean':
                  {
                    if ( staleness ) {
                      nodeElm.setAttribute( 'class', 'stale' );
                    } else {
                      nodeElm.textContent = '';
                      nodeElm.removeAttribute( 'class' );
                      if ( value ) {
                        nodeElm.textContent = "True"
                      } else {
                        nodeElm.textContent = "False"
                      }
                    }
                    break;
                  }
              }
            }
          } else if ( indicatorFormat == 'led' ) {
            if ( opsPathDef != undefined ) {
              if ( staleness ) {
                nodeElm.setAttribute( 'class', 'led-basic' );
              } else {
                /*
                 * add attribures trueClass and falseClass to override default colors
                 * example :
                 * data-cdr={tlm:[{name:'/MPC/MPC_HkTlm_t/RunPosControl'}], indicator:'led', trueClass:'cdr-led-blue', falseClass:'cdr-led-yellow'}
                 */
                nodeElm.textContent = '';
                if ( value ) {
                  if ( reqObj.hasOwnProperty( 'trueClass' ) ) {
                    nodeElm.setAttribute( 'class', 'led-basic ' + reqObj.trueClass );
                  } else {
                    nodeElm.setAttribute( 'class', 'led-basic cdr-led-green' );
                  }
                } else {
                  if ( reqObj.hasOwnProperty( 'falseClass' ) ) {
                    nodeElm.setAttribute( 'class', 'led-basic ' + reqObj.falseClass );
                  } else {
                    nodeElm.setAttribute( 'class', 'led-basic cdr-led-red' );
                  }
                }
              }
            } else {
              nodeElm.setAttribute( 'class', 'led-basic' );
            }
          } else if ( indicatorFormat == 'dataplot' ) {
            /* Handle dataplot subscriptions */
            if ( nodeElm.getAttribute( 'plot-initialized' ) === undefined ||
              nodeElm.getAttribute( 'plot-initialized' ) === null ||
              nodeElm.getAttribute( 'plot-initialized' ) === false ) {
              /* Upon seeing dataplot canvas we initialize canvas after
               * which will keep adding data to initialized canvas */
              var tlmObj = cu.parseJSON( nodeElm.getAttribute( 'data-cdr' ) );

              var dataPlotDef = {};
              dataPlotDef[ 'data' ] = [];
              dataPlotDef[ 'options' ] = {};

              if ( tlmObj.hasOwnProperty( 'tlm' ) ) {

                cu.assert( tlmObj.hasOwnProperty( 'label' ), 'Process TLM | label array doesnot exist' );
                cu.assert( tlmObj.tlm.length === tlmObj.label.length, 'Process TLM | tlm and labels arrays have different lengths' );
                cu.assert( tlmObj.tlm.length > 0 && tlmObj.label.length > 0, 'Process TLM | tlm and label arrays are empty' );

                var colorArr = []
                if ( !( tlmObj.hasOwnProperty( 'color' ) &&
                    cu.isArray( tlmObj.color ) &&
                    tlmObj.color.length == tlmObj.tlm.length ) ) {
                  for ( var c = 0; c < tlmObj.tlm.length; ++c ) {
                    var clr = cu.makeColor();
                    colorArr.push( clr );
                  }
                } else {
                  colorArr = tlmObj.color;
                }
                for ( var i = 0; i < tlmObj.tlm.length; i++ ) {
                  dataPlotDef[ 'data' ].push( {
                    'tlm': {
                      name: tlmObj.tlm[ i ].name
                    },
                    'label': tlmObj.label[ i ],
                    'color': colorArr[ i ]
                  } );
                }
                var generatedKey = cu.makeKey();
                nodeElm.setAttribute( 'plot-key', generatedKey );
                dataplot_subscriptions[ generatedKey ] = new CmdrTimeSeriesDataplot( nodeElm, dataPlotDef, param )
              }
              nodeElm.setAttribute( 'plot-initialized', true );
            } else {
              try {
                dataplot_subscriptions[ nodeElm.getAttribute( 'plot-key' ) ].addData( param );
              } catch ( e ) {
                cu.logError( 'ProcessTelemetryUpdate | unable to add data points to dataplot ', e.message );
              }
            }
          }
        }
      }
    } catch ( e ) {
      cu.logError( 'ProcessTelemetryUpdate | ', e.message, ' | update ' + JSON.stringify( param ) );
    }
  }
  /**
   * processTelemetryDefinitionUpdate is a callback function on request to
   * tlm definition data. processing param object and applies tooltips.
   * @param  {Object} opsPaths a list of opsPaths
   * @return {undefined}
   */
  function processTelemetryDefinitionUpdate( opsPaths ) {
    opsPaths.forEach( ( path ) => {
      var def = subscriptions[ path ].def;
      var elms = subscriptions[ path ].elms
      /* Check elms if it has atlest 1 elm to apply update */
      if ( elms != undefined && def != undefined ) {
        elms.forEach( ( e ) => {
          var template = '<div class="cdr-tooltip-container">' +
            // '<div class="cdr-tooltip-short-description">'+ def.shortDescription +
            // '</div>'+
            // '<div class="cdr-tooltip-long-description">'+ def.longDescription +
            // '</div>'+
            '<div class="cdr-tooltip-row"> Ops-path : <span>' + def.opsPath +
            '</span></div>' +
            '<div class="cdr-tooltip-row">Datatype : <span>' + def.dataType +
            '</span></div>' +
            '</div>'
          var options = {
            container: 'body',
            delay: {
              'show': 1000,
              'hide': 100
            },
            html: true,
            placement: 'auto',
            boundary: 'window',
            title: template
          }
          $( e ).tooltip( options );
        } );
      }
    } );
  }

  /**
   * Checks if the passed in command information is complete with Arguments
   * and values, if true it is incomplete and requires tha application to generate
   * a form for user to complete this object before sending. if false the commad
   *  processing code will send the message out.
   * @param  {Object}  commandInfo a command definition message
   * @return {undefined}
   */
  function isTemplateCommand( commandInfo ) {
    var found = false;
    if ( commandInfo.hasOwnProperty( 'argument' ) ) {
      if ( commandInfo.argument.length > 0 ) {
        /* Look for at least 1 unspecified value. */
        for ( i = 0; i < commandInfo.argument.length; i++ ) {
          if ( !commandInfo.argument[ i ].hasOwnProperty( 'value' ) ) {
            found = true;
          }
        }
      }
    }
    return found;
  }

  /**
   * Some command invoke a modal or a form to be filled out by the user. The
   * submit action of that form will invoke this function. THis function scrapes
   * the modal for form information and generates a complete command object and
   * sends it out.
   * @return {undefined}
   */
  function sendCmd() {
    var args = {};
    var labels = $( "#genericInputModal" ).find( 'label' );
    for ( var i = 0; i < labels.length; ++i ) {
      var label = labels[ i ].textContent;
      var value = labels[ i ].control.value;
      args[ label ] = value;
    }
    var cmdObj = JSON.parse( $( "#genericInputModal" ).attr( 'data-info' ) );
    session.sendCommand( {
      ops_path: cmdObj.cmd.name,
      args: args
    } )
  }



  /**
   * Manages data inside a panel which tipically is a window of a layout.
   */
  class Panel {
    /**
     * Panel constructor
     * @param {Object} panelElm DOM element pointing to instantiated panel
     */
    constructor( panelElm ) {
      /**
       * DOM element
       * @type {Object}
       */
      this.panelElm = panelElm;
      /**
       * Panel title
       * @type {String}
       */
      this.title = 'Unknown'
      /**
       * Timeount on panel load
       * @type {Number}
       */
      this.loadTimeout = 500;
      /**
       * Tlm information of this instance
       * @type {Array}
       */
      this.tlm = [];
      /**
       * Panel instantiation indicator
       * @type {Number}
       */
      this.panelElm[ 'instantiated' ] = true;
    }
    /**
     * Subscribe to telemetry and definitions
     * @param  {Object} d DOM object
     * @param  {Object} s self or current instance
     * @return {undefined}
     */
    subscribeText( d, s ) {
      /* check d has telemetry request info */
      if ( d.hasOwnProperty( 'tlm' ) ) {
        /* Map each tlm item to respective DOM objects, it manipulates */
        for ( var i = 0; i < d.tlm.length; ++i ) {
          var obj = d.tlm[ i ];
          /* Check if record exists */
          if ( obj.name in subscriptions ) {
            var isBound = false;
            /* Check if bound to atlest 1 element */
            if ( subscriptions[ obj.name ].hasOwnProperty( 'elms' ) ) {
              if ( cu.isArray( subscriptions[ obj.name ].elms ) &&
                subscriptions[ obj.name ].elms.length > 0 ) {
                subscriptions[ obj.name ].elms.push( s );
                isBound = true;
              }
            } else {
              subscriptions[ obj.name ].elms = [ s ];
            }
          } else {
            subscriptions[ obj.name ] = {};
            subscriptions[ obj.name ].elms = [ s ];
          }
          /* Store in panel instance's context */
          try {
            this.tlm.push( {
              name: obj.name,
              nodeElm: s
            } );
          } catch ( e ) {
            cu.logError( 'subscribeText| force loading tlm error , there is no this in context' )
          }

        }
        /* Subscribe to tlm */
        session.subscribe( d.tlm, ( params ) => {
          for ( var idx in params ) {
            processTelemetryUpdate( params[ idx ] )
          }
        } );
        /* Get tlm definitions and add this additinal info to subscriptions */
        session.getTlmDefs( d.tlm, function( tlmDef ) {
          var opsPaths = [];
          /* Store in document's context */
          for ( var i = 0; i < tlmDef.length; ++i ) {
            if ( !( tlmDef[ i ].opsPath in subscriptions ) ) {
              subscriptions[ tlmDef[ i ].opsPath ] = {};
            }
            subscriptions[ tlmDef[ i ].opsPath ].def = tlmDef[ i ];
            opsPaths.push( tlmDef[ i ].opsPath );
          }
          /* Apply definition update */
          processTelemetryDefinitionUpdate( opsPaths );
        } );
      }
    }
    /**
     * Get command definition and generate click functionality for buttons
     * @param  {Object} d DOM object
     * @param  {Object} s self or current instance
     * @return {undefined}
     */
    loadCommanding( d, s ) {

      if ( d.hasOwnProperty( 'cmd' ) ) {
        var cmdObj = d.cmd;
        var btnObj = $( s );
        session.getCmdDef( {
          name: cmdObj.name
        }, function( cmdInfo ) {
          if ( cmdObj.hasOwnProperty( 'uuid' ) ) {
            /* We already bound this element. */
          } else {
            if ( cmdObj.name == cmdInfo.name ) {
              var uuid = cu.makeUUID();
              cmdInfo.uuid = uuid;
              cmdObj.uuid = uuid;
              /*
               * Copy any arguments we have from the command button
               * into the cmdInfo struct.
               */
              if ( cmdObj.hasOwnProperty( 'argument' ) ) {
                for ( var i = 0; i < cmdObj.argument.length; i++ ) {
                  for ( var j = 0; j < cmdInfo.argument.length; j++ ) {
                    if ( cmdInfo.argument[ j ].name == cmdObj.argument[ i ].name ) {
                      cmdInfo.argument[ j ].value = cmdObj.argument[ i ].value;
                    }
                  }
                }
              }

              if ( isTemplateCommand( cmdInfo ) == false ) {
                /*
                 * This is a fully instantiated command. No need to
                 * create a popup form. Just send the command when
                 * the user clicks the button.
                 */
                var args = {};
                if ( cmdInfo.hasOwnProperty( 'argument' ) ) {
                  for ( var i = 0; i < cmdInfo.argument.length; i++ ) {
                    args[ cmdInfo.argument[ i ].name ] = cmdInfo.argument[ i ].value
                  }
                }
                btnObj[ 0 ].onclick = function( eventObject ) {
                  session.sendCommand( {
                    ops_path: cmdInfo.name,
                    args: args
                  } );
                };
              } else {
                /*
                 * This is not a fully instantiated command. We need
                 * to present a popup form to allow the user to
                 * enter the remaining command arguments before
                 * sending the command.
                 *
                 * First, generate UUIDs to be used later as element
                 * IDs.
                 */
                for ( i = 0; i < cmdInfo.argument.length; i++ ) {
                  cmdInfo.argument[ i ].uuid = uuid + "_" + cmdInfo.argument[ i ].name;
                }
                /*
                 * Next set stringLength for string parameters to be
                 * used for form validation later.
                 */
                for ( i = 0; i < cmdInfo.argument.length; i++ ) {
                  if ( cmdInfo.argument[ i ].type === 'string' ) {
                    /*
                     * Add a new stringLength (in bytes)
                     * attribute for parameter validation later.
                     */
                    cmdInfo.argument[ i ].stringLength = cmdOut.argument[ i ].bitSize / 8;
                  }
                }

                /* Make button fire modal */
                btnObj.attr( 'data-toggle', 'modal' );
                btnObj.attr( 'data-target', '#genericInputModal' );
                btnObj.attr( 'data-title', 'Submit ' + cmdInfo.name + ' Arguments' );
                btnObj.attr( 'data-submit', 'sendCmd' );
                var argArray = [];

                for ( var i in cmdInfo.argument ) {
                  var label = cmdInfo.argument[ i ].name;
                  var type = cmdInfo.argument[ i ].type;
                  var value = cmdInfo.argument[ i ].value;
                  switch ( type ) {
                    case 'char':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'uint8':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'integer',
                          'value': value
                        } );
                        break;
                      }

                    case 'int8':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'integer',
                          'value': value
                        } );
                        break;
                      }

                    case 'string':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'uint16':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'int16':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'uint32':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'int32':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'float':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'float',
                          'value': value
                        } );
                        break;
                      }

                    case 'double':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'float',
                          'value': value
                        } );
                        break;
                      }

                    case 'boolean':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'integer',
                          'value': value
                        } );
                        break;
                      }

                    case 'uint64':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }

                    case 'int64':
                      {
                        /* integer action */
                        argArray.push( {
                          'label': label,
                          'type': 'field',
                          'dtype': 'text',
                          'value': value
                        } );
                        break;
                      }


                  }
                  btnObj.attr( 'data-custom', JSON.stringify( argArray ) );
                }
              }
            }
          }
        } );
      }
    }
    /**
     * Scrapes DOM looking for command and telemetry subscription singatures.
     * and processess them.
     * @return {undefined}
     */
    loadPanel() {

      var cls = this;
      cu.assert( this.panelElm.hasOwnProperty( 'element' ), 'Panel | this.panelElm has no property element' );
      cu.assert( typeof this.panelElm.element === 'object', 'Panel | this.panelElm.element is not of type object' );

      setTimeout( () => {
        cu.assert( this.panelElm.hasOwnProperty( 'config' ), 'Panel | this.panelElm has no property config' );
        cu.assert( typeof this.panelElm.config === 'object', 'Panel | this.panelElm.config is not of type object' );
        cu.assert( this.panelElm.config.hasOwnProperty( 'title' ), 'Panel | this.panelElm.config has no property title' );
        cu.assert( typeof this.panelElm.config.title === 'string', 'Panel | this.panelElm.config.title is not of type title' );
        cu.logInfo( 'Panel | created ', this.panelElm.config.title );
        this.title = this.panelElm.config.title;

        $( this.panelElm.element ).find( '[data-cdr]' ).each( function() {
          var dataObj = cu.parseJSON( $( this ).attr( 'data-cdr' ) );
          var self = this;
          var format = dataObj.indicator;
          cu.assert( format != undefined, 'indicator format is not found' );
          switch ( format ) {
            case 'text':
            case 'led':
            case 'dataplot':
              {
                cls.subscribeText( dataObj, self );
                break;
              }
            case 'cmd':
              {
                cls.loadCommanding( dataObj, self );
                break;
              }
            case 'splcmd':
              {
                break;
              }
          }
          $( this ).attr( 'bind-status', true );
        } );
        InitScrollBar();
        if ( this.panelElm.config.title == 'Dataplot' ) {
          var apl = this.panelElm.element.find( '.active-plot-list-content' );
          apl.data( 'PlotDef', this.panelElm.config.componentState.PlotDef );
          renderAplPanel( apl );
          this.panelElm.element.find( '#cdr-dataplot-play' ).click();
        }
      }, this.loadTimeout );

    }
    /**
     * Handles cleaning unused subscription information and unsubscribes to them
     * @return {undefined}
     */
    loadDestroyPanelProceadure() {

      this.panelElm.on( 'itemDestroyed', ( it ) => {
        cu.assert( it.hasOwnProperty( 'origin' ), 'Panel | has no property origin' );
        cu.assert( typeof it.origin === 'object', 'Panel | origin is not of type object' );
        cu.assert( it.origin.hasOwnProperty( 'config' ), 'Panel | has no property config' );
        cu.assert( typeof it.origin.config === 'object', 'Panel | config is not of type object' );
        cu.assert( it.origin.config.hasOwnProperty( 'type' ), 'Panel | has no property type' );
        cu.assert( typeof it.origin.config.type === 'string', 'Panel | type is not of type string' );
        if ( it.origin.config.type == 'component' ) {
          /* iterate over localy stored tlm opsPaths and dataplot keys */
          for ( var i = 0; i < this.tlm.length; ++i ) {
            cu.assert( Object.keys( subscriptions ).length > 0, 'Panel | subscriptions is empty' );
            var opsPath = this.tlm[ i ].name;
            var nodeElm = this.tlm[ i ].nodeElm;
            if ( opsPath in subscriptions ) {
              if ( subscriptions[ opsPath ].elms.length > 0 ) {
                /* delete tlm and dataplot entry*/
                var index = subscriptions[ opsPath ].elms.indexOf( nodeElm )
                if ( index != -1 ) {
                  subscriptions[ opsPath ].elms.splice( index, 1 );
                  cu.logDebug( 'Panel | ', opsPath, ' removed' );
                } else {
                  cu.logError( 'Panel | element key not fount in subscriptions array' )
                }
                if ( subscriptions[ opsPath ].elms.length < 1 ) {

                  delete subscriptions[ opsPath ];
                  /* Unsubscribe */
                  if ( !( opsPath in rogue_subscriptions ) ) {
                    session.unsubscribe( [ {
                      name: opsPath
                    } ] );
                  }
                  cu.logDebug( 'Panel | ', opsPath, ' tlm unsubscribed' );
                }
              } else {
                cu.logError( 'Panel | subscription is not associated with any element' )
              }
            }
          }
          /* clear dataplots */
          var dp_key = $( it.origin.element ).find( '.widget-graph' ).children().last().attr( 'plot-key' );
          if ( dp_key != undefined | dp_key != null ) {
            $( it.origin.element ).find( '.widget-graph' ).children().last().removeAttr( 'plot-key' );
            $( it.origin.element ).find( '.widget-graph' ).children().last().empty();
            dataplot_subscriptions[ dp_key ].UtilGraph.destroy();
            delete dataplot_subscriptions[ dp_key ];
          }

          /* clear local data */
          this.tlm = [];
          this.panelElm[ 'instantiated' ] = false;
          // this.panelElm = undefined;
          this.title = 'Unknown'
          cu.logInfo( 'Panel | panel destroyed [stacks, columns, tabs, panels etc.]' );
        }
      } );
    }

  }

  /**
   * A function call to forcefully load commands given selector
   */
  function forceLoadCommands( selector ) {
    if ( typeof selector === 'string' ) {
      $( selector ).find( '[data-cdr]' ).each( function() {
        var dataObj = cu.parseJSON( $( this ).data( 'cdr' ) );
        var self = this;
        var format = dataObj.indicator;
        cu.assert( format != undefined, 'indicator format is not found' );
        if ( format == 'cmd' ) {
          Panel.prototype.loadCommanding( dataObj, self )
          cu.logInfo( 'forceLoadCommands | command loaded' );
        }
      } );
    } else {
      selector.find( '[data-cdr]' ).each( function() {
        var dataObj = cu.parseJSON( $( this ).data( 'cdr' ) );
        var self = this;
        var format = dataObj.indicator;
        cu.assert( format != undefined, 'indicator format is not found' );
        if ( format == 'cmd' ) {
          Panel.prototype.loadCommanding( dataObj, self )
          cu.logInfo( 'forceLoadCommands | command loaded' );
        }
      } );
    }
  }

  function forceLoadTlm( selector ) {
    $( selector ).find( '[data-cdr]' ).each( function() {
      var dataObj = cu.parseJSON( $( this ).data( 'cdr' ) );
      var self = this;
      var format = dataObj.indicator;
      cu.assert( format != undefined, 'indicator format is not found' );
      if ( format == 'text' | format == 'led' | format == 'dataplot' ) {
        Panel.prototype.subscribeText( dataObj, self )
        cu.logInfo( 'forceLoadTlm | telemety loaded' );
      }
    } );

  }

  /**
   * layout-load-complete event is fired when a new layout is being created which
   * happens in the following cases: First time a layout is loaded on reload. A
   * layout file is selected from layouts menu. A .lyt file is loaded from local
   * storage.
   */
  window.addEventListener( 'layout-load-complete', () => {

    myLayout.on( 'tabCreated', ( t ) => {
      /* A new window or movable tab has been created */
      cu.assert( t.hasOwnProperty( 'contentItem' ), 'Tab | has no property contentItem' );
      cu.assert( typeof t.contentItem === 'object', 'Tab | contentItem is not of type object' );
      cu.assert( t.contentItem.hasOwnProperty( 'type' ), 'Tab | has no property type' );
      cu.assert( typeof t.contentItem.type === 'string', 'Tab | type is not of type string' );
      if ( t.contentItem.type == 'component' ) {
        if ( !t.contentItem.instantiated ) {
          var panel = new Panel( t.contentItem );
          panel.loadPanel();
          panel.loadDestroyPanelProceadure();
        }
      } else {
        cu.logError( 'Tab | panel cannot be created' );
      }
    } );

    myLayout.on( 'stateChanged', ( i ) => {
      try {
        /* Handle dataplot overflow when layout resize happens */
        for ( var key in dataplot_subscriptions ) {
          if ( dataplot_subscriptions.hasOwnProperty( key ) ) {
            var ug = dataplot_subscriptions[ key ].getUtilGraph();
            try {
              ug.resize();
              ug.setupGrid();
              ug.draw();
            } catch ( e ) {
              cu.logError( 'stateChanged | Resize of graph with key ', key, ' failed | error=', e.message );

            }

          }
        }
        /* ADI resize handle */
        for ( var i in display_controllers ) {
          if ( display_controllers[ i ].DISP_STATE.ADDITIONAL_CTL[ display_controllers[ i ].DISP_META.ADDITIONAL_CTL.indexOf( 'ADI' ) ] ) {
            $( '#cdr-guages-' + i ).empty();
            drawHUD( 'cdr-guages-' + i );
          }
        }
      } catch ( e ) {
        cu.logError( 'stateChanged | layout state change cannot be handled properly | error=', e.message );
      }

    } );

  } );