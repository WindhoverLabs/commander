/**
 * Regular vehicle tail size
 * @type {Number}
 */
var tailSize = 30;
/**
 * Aircraft timeout in seconds
 * @type {Number}
 */
var aircraftOutdateSeconds = 5;
/**
 * Minimun distance range the adsb will scan also called critical range
 * @type {Number}
 */
var minAircraftLookoutRange = 50000;
/**
 * A Structure to store live aircraft information
 * @type {Object}
 */
var AIRCRAFTS = {};
/**
 * Elevation from ground
 * @type {Number}
 */
var groundElevation = 0.0;
/**
 * Elevation of the ground
 * @type {Number}
 */
var cesiumGroundElevation = 0.0;
/**
 * Additional padding to keep the aircraft above ground
 * @type {Number}
 */
var altPadding = 5.0;

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
 * Draw Aircrafts
 */
function ADSBUpdate( adsb, self ) {

  /* Create common timestamp */
  var timestamp = Math.floor( Date.now() );

  /* Loop over aircrafts */
  for ( i = 0; i < adsb.length; i++ ) {

    var vehicle = adsb[ i ];

    /* check if all necessary inforamtion is avaiable to plot */
    if ( isNaN( vehicle.lat ) || isNaN( vehicle.lon ) || isNaN( vehicle.altitude ) || vehicle.lat == 0 || vehicle.lon == 0 || vehicle.altitude == 0 ) {
      continue;
    } else {

      /*calculate distance of an aircraft from vehicle_debug */
      var d = distance( new Cesium.Cartesian3( Position.Lon, Position.Lat, Math.abs( Position.Alt - groundElevation ) + altPadding ), new Cesium.Cartesian3( vehicle.lon, vehicle.lat, vehicle.altitude ) );

      /* vehicle in critical range */
      if ( d <= minAircraftLookoutRange ) {

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
            /* define initial positiion and orientation */
            var hpr = new Cesium.HeadingPitchRoll( 0, 0, 0 );
            var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );
            var positions = new Cesium.SampledPositionProperty();
            positions.addSample( Cesium.JulianDate.now(), position );

            /* draw aircraft and trailing path */
            var aircraft = self.CesiumViewer.entities.add( {
              position: positions,
              orientation: new Cesium.VelocityOrientationProperty( positions ),
              model: {
                /* The model was created by @elbert.nathanaeltkg, a sketchfab contributer.
                   Link : https://sketchfab.com/elbert.nathanaeltkg
                   Changes: the skin was removed and orientation was inverted to fit our reference frame.
                 */
                uri: '/img/genplane.gltf',
                minimumPixelSize: 100,
                maximumScale: 9000,
                scale: 1,
                color: Cesium.Color.fromAlpha( Cesium.Color.CADETBLUE, parseFloat( 1.0 ) ),
              },
              path: {
                leadTime: 0,
                trailTime: tailSize,
                width: 1,
                resolution: 1,
                material: Cesium.Color.CRIMSON
              }
            } );

            /* store initialized aircraft info in a global space */
            AIRCRAFTS[ hex ] = {
              t: tme,
              key: aircraft.id,
              ent: aircraft,
              spp: positions,
              prevPos: [ lat, lon, alt ]
            }

          } catch ( e ) {

            cu.logError( 'ADSB Vehicle registration error ' + hex + ' - ' + e.message );

          }
        } else {
          /* Aircraft is already being tracked */
          var AIRCRAFT = AIRCRAFTS[ hex ];
          var aircraft = AIRCRAFT.ent;
          var spp = AIRCRAFT.spp;

          if ( AIRCRAFT.prevPos[ 0 ] == lat & AIRCRAFT.prevPos[ 1 ] == lon & AIRCRAFT.prevPos[ 2 ] == alt ) {
            /* remove stalling aircrafts after a cetain time */
            if ( Math.abs( tme - AIRCRAFT.t ) > ( aircraftOutdateSeconds * 1000 ) ) {
              self.CesiumViewer.entities.removeById( AIRCRAFT.key )
            }

          } else {
            /* update position and orientation will update automatically */
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