/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject( item ) {
  return ( item && typeof item === 'object' && !Array.isArray( item ) );
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep( target, ...sources ) {
  if ( !sources.length ) return target;
  const source = sources.shift();

  if ( isObject( target ) && isObject( source ) ) {
    for ( const key in source ) {
      if ( isObject( source[ key ] ) ) {
        if ( !target[ key ] ) Object.assign( target, {
          [ key ]: {}
        } );
        mergeDeep( target[ key ], source[ key ] );
      } else {
        Object.assign( target, {
          [ key ]: source[ key ]
        } );
      }
    }
  }

  return mergeDeep( target, ...sources );
}

/**
 * Makes a time series dataplot
 * @param       {Object} domObject
 * @param       {Object} objData
 * @param       {Object} params
 * @constructor
 */
function CmdrTimeSeriesDataplot( domObject, objData, params, flag = false ) {
  this.objData = objData;
  this.objMergedData = {};
  this.objTlm = [];
  this.pause = false;

  function legendFormatter( label, series ) {
    return '<div class="cdr-dataplot-legend"' +
      'style="color:white;font-size:8pt;text-align:left;padding:4px;padding-left:10px">' +
      label + '</div>';
  };

  this.objMergedData = {
    update_interval: 100,
    homogeneity: {
      tolerance: 10
    },
    maxcount: 120,
    ignore_count: 3,
    options: {
      xaxis: {
        mode: 'time',
        font: {
          color: "#ffffff"
        }
      },
      yaxis: {
        font: {
          color: "#ffffff"
        }
      },
      series: {
        lines: {
          show: true
        },
        points: {
          show: false
        }
      },
      legend: {
        show: true,
        labelFormatter: legendFormatter,
        labelBoxBorderColor: 'rgba(255, 255, 255, 0.0)',
        noColumns: 1,
        position: 'ne',
        margin: [ 20, 20 ],
        backgroundColor: null,
        backgroundOpacity: 0,
        container: null,
        sorted: false
      },
      grid: {
        show: true,
        //aboveData: boolean
        //color: '#ffffff',
        //backgroundColor: color/gradient or null
        //margin: number or margin object
        //labelMargin: number
        //axisMargin: number
        //markings: [{ color: "#ffffff" }],
        //markings: array of markings or (fn: axes -> array of markings)
        //borderWidth: number or object with "top", "right", "bottom" and "left" properties with different widths
        //borderColor: color or null or object with "top", "right", "bottom" and "left" properties with different colors
        //minBorderMargin: number or null
        //clickable: boolean
        //hoverable: boolean
        //autoHighlight: boolean
        //mouseActiveRadius: number
      }
    }
  };
  this.defaultObjMergedData = this.objMergedData;
  mergeDeep( this.objMergedData, objData );

  this.UtilGraph = $.plot( domObject, [], this.objMergedData.options );

  for ( var i = 0; i < this.objMergedData.data.length; ++i ) {
    if ( this.objMergedData.data[ i ].tlm !== undefined ) {
      this.objTlm.push( this.objMergedData.data[ i ].tlm );
    }
  }
  if ( !flag ) {
    var count = 0;

    this.values = new Array( this.objMergedData.data.length );
    for ( var i = 0; i < this.objMergedData.data.length; ++i ) {
      this.values[ i ] = [];
    }

    var self = this;

    if ( this.objTlm.length > 0 ) {
      count = count + 1;
      if ( self.objMergedData.ignore_count > 0 ) {
        self.objMergedData.ignore_count = self.objMergedData.ignore_count - 1;
      } else {
        var sample = params.sample[ params.sample.length - 1 ];
        var value = sample.value;
        for ( var i = 0; i < self.objTlm.length; ++i ) {
          if ( self.values[ i ].length >= self.objMergedData.maxcount ) {
            self.values[ i ] = self.values[ i ].slice( 1 );
          }
          if ( self.objTlm[ i ].name == params.opsPath ) {
            self.values[ i ].push( [ new Date( sample.gndTime ), value ] );
          }
        }

        if ( self.objMergedData.update_interval <= 0 ) {
          update( self );
        };
      }


      update();
    }

    function update() {
      var dataArray = [];

      for ( var i = 0; i < self.objTlm.length; ++i ) {
        var entry = {
          data: self.values[ i ],
          label: self.objMergedData.data[ i ].label,
          color: self.objMergedData.data[ i ].color,
        };
        dataArray.push( entry );
      }

      self.UtilGraph.setData( dataArray );

      // since the axes don't change, we don't need to call plot.setupGrid()
      self.UtilGraph.setupGrid();
      self.UtilGraph.draw();

      if ( self.objMergedData.update_interval > 0 ) {
        setTimeout( update, self.objMergedData.update_interval );
      };
    }
  }

};

/**
 * Unsubscribe to all telementry
 * @return {undefined}
 */
CmdrTimeSeriesDataplot.prototype.unsubscribeAll = function() {
  /* Unsubscribe */
  session.unsubscribe( this.objTlm );
}
/**
 * Get telemety
 * @return {Object}
 */
CmdrTimeSeriesDataplot.prototype.getTlmObj = function() {
  return this.objTlm;
}
/**
 * Get instance of plot
 * @return {Object}
 */
CmdrTimeSeriesDataplot.prototype.getUtilGraph = function() {
  return this.UtilGraph;
}

/**
 * Add new path
 */
CmdrTimeSeriesDataplot.prototype.start = function() {

  var count = 0;

  this.values = new Array( this.objMergedData.data.length );
  for ( var i = 0; i < this.objMergedData.data.length; ++i ) {
    this.values[ i ] = [];
  }

  this.UtilGraph.setupGrid();
  this.UtilGraph.draw();

  var self = this;
  session.subscribe( self.objTlm, ( paramArr ) => {
    try {
      paramArr.forEach( ( param ) => {
        var opsPath = param.opsPath;
        for ( var key in dataplot_subscriptions ) {
          var dpObj = dataplot_subscriptions[ key ].objTlm;
          for ( each in dpObj ) {
            if ( dpObj[ each ].name == opsPath ) {
              dataplot_subscriptions[ key ].addData( param );
            }
          }
        }
      } );

    } catch ( e ) {
      cu.logError( "RogueSubscribe | unable to process response. error= ", e.message )
    }
  } );

  var key = this.UtilGraph.getCanvas().parentElement.getAttribute( 'plot-key' )

  for ( var i in self.objTlm ) {
    if ( !( self.objTlm[ i ].name in Object.keys( rogue_subscriptions ) ) ) {
      setRogueSubsc( self.objTlm[ i ].name, 'plot', '[plot-key=' + key + ']' );
    }
  }
}

/**
 * Sets pause flag
 */
CmdrTimeSeriesDataplot.prototype.Pause = function() {

  if ( !this.pause ) {
    this.pause = true;
  } else {
    cu.logError( 'Play | failed to pause graph ' );
  }
}
/**
 * Sets play flag
 */
CmdrTimeSeriesDataplot.prototype.Play = function() {

  if ( this.pause ) {
    this.pause = false;
  } else {
    cu.logError( 'Play | failed to play graph ' );
  }
}

/**
 * Resyncs data by cleaning existing arrays
 */
CmdrTimeSeriesDataplot.prototype.Resync = function() {
  for ( var i in this.values ) {
    this.values[ i ] = [];
  }
}
/**
 * Add new path
 */
CmdrTimeSeriesDataplot.prototype.addNewPath = function( pathOps ) {
  // return this.UtilGraph;

  this.objMergedData.data.push( pathOps );

  var index = this.objTlm.push( {
    name: pathOps.tlm.name
  } )


  this.values[ index - 1 ] = [];
  for ( var i in this.values ) {
    this.values[ i ] = [];
  }

  if ( !( pathOps.tlm.name in Object.keys( rogue_subscriptions ) ) ) {
    session.subscribe( [ {
      name: pathOps.tlm.name
    } ], ( paramArr ) => {
      try {
        this.addData( paramArr[ 0 ] )
      } catch ( e ) {
        cu.logDebug( "RogueSubscribe | unable to process response. error= ", e.message )
      }
    } );
    var key = this.UtilGraph.getCanvas().parentElement.getAttribute( 'plot-key' )
    setRogueSubsc( pathOps.tlm.name, 'plot', '[plot-key=' + key + ']' );
  }

}


/**
 * Add data to plot
 * @param  {Object} params
 * @return {undefined}
 */
CmdrTimeSeriesDataplot.prototype.addData = function( params ) {

  var self = this;
  var sample = params.sample[ params.sample.length - 1 ];
  var value = sample.value;
  self.count = self.count + 1;
  if ( this.objMergedData.ignore_count > 0 ) {
    self.objMergedData.ignore_count = self.objMergedData.ignore_count - 1;
  } else {

    for ( var i = 0; i < self.objMergedData.data.length; ++i ) {
      if ( self.values[ i ].length >= self.objMergedData.maxcount ) {
        self.values[ i ] = self.values[ i ].slice( 1 );
      }

      if ( self.objTlm[ i ].name == params.opsPath ) {
        self.values[ i ].push( [ new Date( sample.gndTime ), value ] );
      }

    }
  }

  update();

  function update() {
    var dataArray = [];

    for ( var i = 0; i < self.objMergedData.data.length; ++i ) {
      var entry = {
        data: self.values[ i ],
        label: self.objMergedData.data[ i ].label,
        color: self.objMergedData.data[ i ].color,
      };

      dataArray.push( entry );
    }
    try {
      self.UtilGraph.setData( dataArray );
      // since the axes don't change, we don't need to call plot.setupGrid()
      self.UtilGraph.setupGrid();

      // draw function is blocking intervals in the client, so having a timeout
      // will allow for such intervals to take priority over draw
      setTimeout( () => {
        if ( !self.pause ) {
          try {

            self.UtilGraph.draw();

          } catch ( e ) {
            cu.logDebug( 'update | util graph cannot draw error=', e.message );
          }


        }
      }, 1 );

    } catch ( e ) {
      cu.logDebug( 'update | util graph cannot set data' )
    }

    if ( self.objMergedData.update_interval > 0 ) {
      setTimeout( update, self.objMergedData.update_interval );
    };
  }
};