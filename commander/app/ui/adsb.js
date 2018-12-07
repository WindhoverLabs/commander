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
var outdated_seconds = 5;
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
var adsbState = false;
var seaLevelElevation = 0.0;
var groundElevation = 0.0;
var cesiumGroundElevation = 0.0;
var altPadding = 5.0; //to get a good view of mapsaround us

var _close_adsb_subscription = false;
var probeHex = '';


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
 * Draw my vehicle
 */
function ADSBUpdate( adsb, self ) {
  //Create common timestamp
  var timestamp = Math.floor( Date.now() );
  //Loop over response
  for ( i = 0; i < adsb.length; i++ ) {
    var vehicle = adsb[ i ];
    // Full information needed to plot not available
    if ( isNaN( vehicle.lat ) || isNaN( vehicle.lon ) || isNaN( vehicle.altitude ) || vehicle.lat == 0 || vehicle.lon == 0 || vehicle.altitude == 0 ) {
      continue;
    } else {

      //calculate distance of an aircraft from vehicle_debug
      var d = distance( new Cesium.Cartesian3( Position.Lon, Position.Lat, Math.abs( Position.Alt - groundElevation ) + altPadding ), new Cesium.Cartesian3( vehicle.lon, vehicle.lat, vehicle.altitude ) );

      // vehicle in software defined range
      if ( d <= minimum_aircraft_safety_distance ) {
        lat = vehicle.lat;
        lon = vehicle.lon;
        alt = vehicle.altitude;
        tme = timestamp;
        hex = vehicle.hex;

        var position = Cesium.Cartesian3.fromDegrees( lon, lat, alt );
        var start = Cesium.JulianDate.fromDate( new Date() );
        var stop = Cesium.JulianDate.addSeconds( start, 360, new Cesium.JulianDate() );

        if ( !( hex in AIRCRAFTS ) ) {
          try {
            var hpr = new Cesium.HeadingPitchRoll( 0, 0, 0 );
            var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );
            var positions = new Cesium.SampledPositionProperty();
            positions.addSample( Cesium.JulianDate.now(), position );

            var aircraft = self.CesiumViewer.entities.add( {
              position: positions,
              orientation: new Cesium.VelocityOrientationProperty( positions ),
              model: {
                uri: '/img/genplane.gltf',
                minimumPixelSize: 100,
                maximumScale: 9000,
                scale: 1,
                color: Cesium.Color.fromAlpha( Cesium.Color.CADETBLUE, parseFloat( 1.0 ) ),
              },
              path: {
                leadTime: 0,
                trailTime: 100,
                width: 1,
                resolution: 1,
                material: Cesium.Color.CRIMSON
              }
            } );
          } catch ( e ) {
            cu.logError( 'ADSB Vehicle registration error ' + hex + ' - ' + e );
          }
          AIRCRAFTS[ hex ] = {
            t: tme,
            key: aircraft.id,
            ent: aircraft,
            spp: positions,
            // path: path,
            // pathkey: path.id,
            prevPos: [ lat, lon, alt ]
          };
        } else {
          var AIRCRAFT = AIRCRAFTS[ hex ];

          var aircraft = AIRCRAFT.ent
          var spp = AIRCRAFT.spp
          if ( probeHex == hex ) {
            console.log( AIRCRAFT.prevPos );
            console.log( [ lat, lon, alt ] );
            console.log( [ AIRCRAFT ] );
            console.log( AIRCRAFT.prevPos[ 0 ] == lat & AIRCRAFT.prevPos[ 1 ] == lon & AIRCRAFT.prevPos[ 2 ] == alt );
            console.log( Math.abs( tme - AIRCRAFT.t ) );
            console.log( Math.abs( tme - AIRCRAFT.t ) > ( outdated_seconds * 1000 ) );
            probeHex = '';
          }

          if ( AIRCRAFT.prevPos[ 0 ] == lat & AIRCRAFT.prevPos[ 1 ] == lon & AIRCRAFT.prevPos[ 2 ] == alt ) {
            if ( Math.abs( tme - AIRCRAFT.t ) > ( outdated_seconds * 1000 ) ) {
              self.CesiumViewer.entities.removeById( AIRCRAFT.key )
            }

          } else {
            spp.addSample( Cesium.JulianDate.now(), position );
            AIRCRAFT.prevPos[ 0 ] = lat;
            AIRCRAFT.prevPos[ 1 ] = lon;
            AIRCRAFT.prevPos[ 2 ] = alt;
            AIRCRAFT.t = tme;
          }



        }
      }
    }
  }
}