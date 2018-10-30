/**
 * My vehicle tail size
 * @type {Number}
 */
var myVehicleTailSize = 60
/**
 * Regular vehicle tail size
 * @type {Number}
 */
var tailSize = 30;
/**
 * Aircraft timeout in seconds
 * @type {Number}
 */
var outdated_seconds = 30;
/**
 * Minimun distance to maintain from any aircraft in meters
 * @type {Number}
 */
var minimum_aircraft_safety_distance = 50000;
/**
 * if true the adsb code starts executing
 * @type {Boolean}
 */
var adsbState = false;
var myVehicleDataPoints = [];
var myVehicleLine = null;
var myVehiclePrevLine = null;
var myVehicleCurrentPoint = null;
var myVehicleZoomOnce = false;
var AIRCRAFTS = {};
var HISTORY = {};
var ALLMYLINES = [];
var adsbState = 'nt';
var seaLevelElevation = 0.0;
var groundElevation = 0.0;
var cesiumGroundElevation = 0.0;
var altPadding = 5.0; //to get a good view of mapsaround us

var _close_adsb_subscription = false;


// TODO: subscribe to pitch roll and heading

/**
 * Calculate distance
 * @param  {Object} p1
 * @param  {Object} p2
 * @return {Object}
 */
function distance( p1, p2 ) {
  return Math.sqrt( Math.pow( ( p1.x - p2.x ), 2 ) + Math.pow( ( p1.y - p2.y ), 2 ) + Math.pow( ( p1.z - p2.z ), 2 ) );
}

/**
 * Draw path
 */
setInterval( function() {
  if ( adsbState == "Active" ) {
    //remove old line
    if ( myVehicleLine != null ) {
      myVehiclePrevLine = myVehicleLine;

    }
    //add new point to end of queue
    myVehicleDataPoints.push( Position.Lon );
    myVehicleDataPoints.push( Position.Lat );
    myVehicleDataPoints.push( Math.abs( Position.Alt - groundElevation ) + altPadding );

    //eat tail
    if ( myVehicleDataPoints.length > myVehicleTailSize * 3 ) {
      myVehicleDataPoints.shift()
      myVehicleDataPoints.shift()
      myVehicleDataPoints.shift()
    }

    var dashedLine = this.cesiumViewer.entities.add( {
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights( myVehicleDataPoints ),
        width: 3,
        material: Cesium.Color.ORANGE,

      }
    } );
    myVehicleLine = dashedLine;
    if ( myVehiclePrevLine != null ) {
      this.cesiumViewer.entities.removeById( myVehiclePrevLine.id )
    }
  } else if ( adsbState == "Active" && ( display[ 0 ].id != $( '#gv' )[ 0 ].id || terrain[ 0 ].id != $( '#2d' )[ 0 ].id ) ) {
    this.cesiumViewer.entities.removeById( myVehicleLine.id )
    myVehicleDataPoints = [];
    myVehicleLine = null;
    myVehiclePrevLine = null;
  }


}, 2000 )

/**
 * Draw vehicle
 */
setInterval( function() {

  if ( adsbState == "Active" && display[ 0 ].id == $( '#gv' )[ 0 ].id && terrain[ 0 ].id == $( '#2d' )[ 0 ].id ) {

    //height adjustment
    var currentAlt = Math.abs( Position.Alt - groundElevation ) + altPadding
    var position = Cesium.Cartesian3.fromDegrees( Position.Lon, Position.Lat, currentAlt );
    var heading = Attitude.Yaw;
    var pitch = Attitude.Roll;
    var roll = Attitude.Pitch;
    //console.log(heading,pitch,roll)
    var hpr = new Cesium.HeadingPitchRoll( heading, pitch, roll );
    var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );

    //first run - initialization
    if ( !myVehicleZoomOnce ) {
      this.cesiumViewer.entities.removeAll();


      var entity = this.cesiumViewer.entities.add( {
        name: 'vehicle',
        position: position,
        orientation: orientation,
        model: {
          uri: '/img/plane_v3.gltf',
          minimumPixelSize: 128,
          maximumScale: 2000,
          scale: 0.5,
        },

      } );
      // this.cesiumViewer.zoomTo(entity);
      myVehicleCurrentPoint = entity;
      myVehicleZoomOnce = true;
    } else {

      myVehicleCurrentPoint.position = position;
      myVehicleCurrentPoint.orientation = orientation;
    }
  } else if ( adsbState == "Active" && ( display[ 0 ].id != $( '#gv' )[ 0 ].id || terrain[ 0 ].id != $( '#2d' )[ 0 ].id ) ) {
    adsbSwitch();
    myVehicleCurrentPoint = null;
    myVehicleZoomOnce = false;
    this.cesiumViewer.entities.removeAll();

  }


}, 1000 );

/**
 * Draw my vehicle
 */
setInterval( function() {
  if ( adsbState == 'Active' ) {
    session.getADSBJson( function( adsb ) {
      if ( !_close_adsb_subscription ) {
        //Create common timestamp
        var timestamp = Math.floor( Date.now() );
        //Loop over response
        for ( i = 0; i < adsb.length; i++ ) {
          var instance = adsb[ i ];
          // Full information needed to plot not available
          if ( isNaN( instance.lat ) || isNaN( instance.lon ) || isNaN( instance.altitude ) || instance.lat == 0 || instance.lon == 0 || instance.altitude == 0 ) {
            continue;
          } else {
            //calculate distance of an aircraft from vehicle_debug
            var d = distance( new Cesium.Cartesian3( Position.Lon, Position.Lat, Math.abs( Position.Alt - groundElevation ) + altPadding ), new Cesium.Cartesian3( instance.lon, instance.lat, instance.altitude ) );
            //Clean previous, old and corrupt points
            if ( d <= minimum_aircraft_safety_distance ) {
              lat = instance.lat;
              lon = instance.lon;
              alt = instance.altitude;
              tme = timestamp;
              hex = instance.hex;
              //fresh point


              var position = Cesium.Cartesian3.fromDegrees( lon, lat, alt );

              if ( !( hex in AIRCRAFTS ) ) {
                var POINTQUE = [];
                try {
                  var hpr = new Cesium.HeadingPitchRoll( 0, 0, 0 );
                  var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );
                  var enty = this.cesiumViewer.entities.add( {
                    position: position,
                    orientation: orientation,
                    model: {
                      uri: '/img/genplane.gltf',
                      minimumPixelSize: 128,
                      maximumScale: 60000,
                      scale: 1,
                      color: Cesium.Color.fromAlpha( Cesium.Color.RED, parseFloat( 1.0 ) ), //getColor(viewModel.color, viewModel.alpha),
                    },
                  } );
                } catch ( e ) {
                  console.log( 'some Err' );
                }
                //this.cesiumViewer.zoomTo(enty);
                POINTQUE.push( lon );
                POINTQUE.push( lat );
                POINTQUE.push( alt );
                AIRCRAFTS[ hex ] = {
                  t: tme,
                  key: enty.id,
                  ent: enty
                };
                HISTORY[ hex ] = POINTQUE;
              } else {
                var AIRCRAFT = AIRCRAFTS[ hex ];
                var enty = AIRCRAFT.ent
                AIRCRAFT.t = tme;
                //cal yaw
                var yaw = 0;
                var hist = HISTORY[ hex ]
                if ( hist.length >= 5 ) {
                  var l = hist.length - 1;
                  var dx = hist[ l - 5 ] - hist[ l - 2 ]
                  var dz = hist[ l - 3 ] - hist[ l ]
                  yaw = Math.atan2( dz, dz ) - ( 45 * ( Math.PI / 180 ) );

                }
                console.log( yaw )
                enty.position = position;
                var hpr = new Cesium.HeadingPitchRoll( ( -1 ) * yaw, 0, 0 );
                var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );
                enty.orientation = orientation;
                var POINTQUE = HISTORY[ hex ];
                POINTQUE.push( lon );
                POINTQUE.push( lat );
                POINTQUE.push( alt );
                HISTORY[ hex ] = POINTQUE;
                //console.log(hex)
              }
            }
          }
        }
      }
    } );
  }
  if ( adsbState == 'Active' && !_close_adsb_subscription ) {
    if ( adsbState == "Active" ) {

      for ( var i in AIRCRAFTS ) {
        var aircraft = AIRCRAFTS[ i ]
        var last_ts = aircraft.t;
        var curr_ts = Math.floor( Date.now() );
        if ( Math.abs( curr_ts - last_ts ) > ( outdated_seconds * 1000 ) ) {
          console.log( Math.abs( curr_ts - last_ts ) )
          this.cesiumViewer.entities.removeById( aircraft.key )
          delete AIRCRAFTS.i
        }
      }

    } else if ( adsbState == "Active" && ( display[ 0 ].id != $( '#gv' )[ 0 ].id || terrain[ 0 ].id != $( '#2d' )[ 0 ].id ) ) {
      AIRCRAFTS = {};
      HISTORY = {};
      ALLMYLINES = [];
      _close_adsb_subscription = true;

    }
  }

}, 2000 );

/**
 * A constructor to intialize componets require to represet ADSB information
 * on cesium map.
 * @constructor
 */
function ADSB() {
  this.adsbBindings = {};
}

/**
 * ADSB prototype object
 * @type {Object}
 */
ADSB.prototype = {
  /**
   * Paints a vehicle on the map
   * @param  {String} key display id
   */
  drawVehicle: function( key ) {

  },

  /**
   * Paints other vehicles on the map
   * @param  {String} key display id
   */
  drawMyVehicle: function( key ) {
    //height adjustment
    var currentAlt = Math.abs( Position.Alt - groundElevation ) + altPadding
    var position = Cesium.Cartesian3.fromDegrees( Position.Lon, Position.Lat, currentAlt );
    var heading = Attitude.Yaw;
    var pitch = Attitude.Roll;
    var roll = Attitude.Pitch;
    //console.log(heading,pitch,roll)
    var hpr = new Cesium.HeadingPitchRoll( heading, pitch, roll );
    var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );

    //first run - initialization
    if ( !myVehicleZoomOnce ) {
      this.adsbBindings[ key ].cv.entities.removeAll();


      var entity = this.adsbBindings[ key ].cv.entities.add( {
        name: 'vehicle',
        position: position,
        orientation: orientation,
        model: {
          uri: '/img/plane_v3.gltf',
          minimumPixelSize: 128,
          maximumScale: 2000,
          scale: 0.5,
        },

      } );
      // this.adsbBindings[key].cv.zoomTo(entity);
      myVehicleCurrentPoint = entity;
      myVehicleZoomOnce = true;
    } else {

      myVehicleCurrentPoint.position = position;
      myVehicleCurrentPoint.orientation = orientation;
    }
  },

  /**
   * Paints a path for each vehicle
   * @param  {String} key display id
   */
  drawPath: function( key ) {
    //remove old line
    if ( myVehicleLine != null ) {
      myVehiclePrevLine = myVehicleLine;

    }
    //add new point to end of queue
    myVehicleDataPoints.push( Position.Lon );
    myVehicleDataPoints.push( Position.Lat );
    myVehicleDataPoints.push( Math.abs( Position.Alt - groundElevation ) + altPadding );

    //eat tail
    if ( myVehicleDataPoints.length > myVehicleTailSize * 3 ) {
      myVehicleDataPoints.shift()
      myVehicleDataPoints.shift()
      myVehicleDataPoints.shift()
    }

    var dashedLine = this.adsbBindings[ key ].cv.entities.add( {
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights( myVehicleDataPoints ),
        width: 3,
        material: Cesium.Color.ORANGE,

      }
    } );
    myVehicleLine = dashedLine;
    if ( myVehiclePrevLine != null ) {
      this.adsbBindings[ key ].cv.entities.removeById( myVehiclePrevLine.id )
    }
  },

  /**
   * Initializes adsb intervals which draw and update vehicles and path on the map
   * for every cycle.
   * @param  {String} key display element's id
   */
  init: function( key ) {
    var commanderDisplay = display_controllers[ key ];
    this.adsbBindings[ key ] = {};
    this.adsbBindings[ key ].cv = commanderDisplay.getViewer();
    var pathInterval = setInterval( () => {
      this.drawPath( key )
    }, 2000 );
    this.adsbBindings[ key ].pi = pathInterval;
    var vehicleInterval = setInterval( () => {
      this.drawVehicle( key )
    }, 1000 );
    this.adsbBindings[ key ].vehi = vehicleInterval;
    var myVehicleInterval = setInterval( () => {
      this.drawMyVehicle( key )
    }, 2000 );
    this.adsbBindings[ key ].myvehi = myVehicleInterval;

    [ '/PE/PE_HkTlm_t/AltOrigin',
      '/PX4/PX4_VehicleGpsPositionMsg_t/Lat',
      '/PX4/PX4_VehicleGpsPositionMsg_t/Lon',
      '/PX4/PX4_VehicleGpsPositionMsg_t/Alt'
    ].forEach( ( opsPath ) => {
      if ( !( rouge_subscriptions.hasOwnProperty( opsPath ) ) ) {
        /* new entry */
        rouge_subscriptions[ opsPath ] = {};
        rouge_subscriptions[ opsPath ][ 'text' ] = [ '#' + key ];
      } else {
        cu.assert( typeof rouge_subscriptions[ opsPath ] == 'Object', 'createWidget | rouge_subscriptions[opsPath] is not an object' );
        if ( !( rouge_subscriptions[ opsPath ].hasOwnProperty( 'text' ) ) ) {
          rouge_subscriptions[ opsPath ][ 'text' ] = [ '#' + key ];
        } else {
          rouge_subscriptions[ opsPath ][ 'text' ].push( '#' + key );
        }
      }

    } );
    // rouge_subscriptions[ '/PE/PE_HkTlm_t/AltOrigin' ] = '#' + key;
    // rouge_subscriptions[ '/PX4/PX4_VehicleGpsPositionMsg_t/Lat' ] = '#' + key;
    // rouge_subscriptions[ '/PX4/PX4_VehicleGpsPositionMsg_t/Lon' ] = '#' + key;
    // rouge_subscriptions[ '/PX4/PX4_VehicleGpsPositionMsg_t/Alt' ] = '#' + key;

    session.subscribe( [ {
      'name': '/PE/PE_HkTlm_t/AltOrigin'
    } ], ( paramArr ) => {
      try {
        var param = paramArr[ 0 ]
        var sample = param.sample[ param.sample.length - 1 ];
        var value = sample.value;
        groundElevation = Math.random() * 10;
      } catch ( e ) {
        cu.logError( "RougeSubscribe | unable to process response. error= ", e.message )
      }
    } );
    session.subscribe( [ {
        'name': '/PX4/PX4_VehicleGlobalPositionMsg_t/Lat'
      },
      {
        'name': '/PX4/PX4_VehicleGlobalPositionMsg_t/Lon'
      },
      {
        'name': '/PX4/PX4_VehicleGlobalPositionMsg_t/Alt'
      }
    ], ( paramArr ) => {
      try {
        var param = paramArr[ 0 ]
        var sample = param.sample[ param.sample.length - 1 ];
        var value = sample.value;
        switch ( param.opsPath ) {
          case '/PX4/PX4_VehicleGlobalPositionMsg_t/Lat':
            {
              Position.Lat = value;
              break;
            }
          case '/PX4/PX4_VehicleGlobalPositionMsg_t/Lon':
            {
              Position.Lon = value;
              break;
            }
          case '/PX4/PX4_VehicleGlobalPositionMsg_t/Alt':
            {
              Position.Alt = value;
              break;
            }
          default:
            {
              break;
            }
        }
      } catch ( e ) {
        cu.logError( "RougeSubscribe | unable to process response. error= ", e.message )
      }

    } );
  },

  /**
   * Clears intervals generated by adsb init and removes any adsb data.
   * @param  {String} key display element's id
   */
  destroy: function( key ) {
    if ( this.adsbBindings != undefined ) {
      if ( this.adsbBindings.hasOwnProperty( key ) ) {
        clearInterval( this.adsbBindings[ key ].pi )
        clearInterval( this.adsbBindings[ key ].vehi )
        clearInterval( this.adsbBindings[ key ].myvehi )
        delete this.adsbBindings[ key ]
      }
    }
  }
}


var adsb = new ADSB();