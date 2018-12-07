/**
 * Display controller sotre
 * @type {Object}
 */
var display_controllers = {};
/**
 * Display controller clean up interval
 * @type {Number}
 */
var DISPLAY_CLEANUP_INTERVAL = 100000;

var DISPLAY_GRND_ELEVATION_INTERVAL_OBJ = undefined;

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3YjJkYmYwOS02NGU2LTQyZGEtOGRiZC01Yjg3ZTllODBiYTAiLCJpZCI6MTU1NSwiaWF0IjoxNTI4OTE4MTQzfQ.E3pqNt_MGy9rAjE4T4dnPY3vOKjdctpXOjmh0ZPPloE';


/**
 * Cleans up inactve display_controllers
 */
setInterval( function() {
  var keys = Object.keys( display_controllers );
  keys.forEach( ( e ) => {
    if ( $( '#' + e ).length == 0 ) {
      $( '#' + e ).empty();
      clearInterval( display_controllers[ e ].DISPLAY_GRND_ELEVATION_INTERVAL_OBJ );
      delete display_controllers[ e ];
    }
  } );
}, DISPLAY_CLEANUP_INTERVAL );

/**
 * Set Display state for pfd display
 * @param {Object} e HTMLelement
 */
function setDisplayState( e ) {
  var controlInfo = $( e ).data( 'info' );
  var dispCtlIdentifier = $( e ).data( 'key' );
  var key = controlInfo[ 0 ];
  var value = controlInfo[ 1 ];
  display_controllers[ dispCtlIdentifier ].updateDisplayState( key, value );
}

/* CommanderDisplay */
var CommanderDisplay = CommanderDisplay || {};

/**
 * Constructor for PFD display
 * @param       {Object} elm HTMLelement
 * @constructor
 */
function CommanderDisplay( elm ) {

  this.CesiumViewer = undefined;
  this.CesiumInitialized = false;
  this.DisplayContainer = elm;
  this.DisplayContainerIdentifier = elm.attr( 'id' )
  this.DefaultHomeLocation = Cesium.Cartesian3.fromDegrees( -95.3698, 29.7604, 130000.0 ); /* Houston */

  this.MyVehicleEntity = undefined;
  this.MyVehicleGroundTrack = undefined;
  this.MyVehicleGroundTrackPoints = [];


  this.VideoController = {};
  this.VideoController.frameCounter = 0;
  this.VideoController.lastTimestamp = 0;

  /* Default Display metadata */
  this.DISP_META = {
    'DISPLAY_CHANNELS': {
      0: 'NO_DISPLAY',
      /* Display winhoverlabs logo */
      1: 'VIDEO_STREAM',
      /* Streams video from vehicle */
      2: 'GROUND_TRACK',
      /* Display cesiums maps and terrains */
      3: 'FPV'
      /* First Person View */
    },
    'ADDITIONAL_CTL': [
      'CA_LOCK',
      /* Apply camera attitude lock */
      'ADI',
      /* apply Attitude Director Indicator */
      'ADSB' /* ADSB layer adds multiple aircrafts and thier trajectory to cesium maps */
    ],
    'MAP_TYPES': {
      0: 'DEFAULT_MAP',
      /* Basic cesium street map */
      1: 'SATELLITE_MAP',
      /* Satellite map */
    },
    'TERRAIN_TYPES': {
      0: '2D_TERRAIN',
      /* Basic cesium street map with terrain */
      1: '3D_TERRAIN' /* Satellite map with terrain */
    },
  };

  /* Default Display state */
  this.DISP_STATE = {
    'DISPLAY_CHANNELS': 0,
    'ADDITIONAL_CTL': [ 0, 0, 0 ],
    /* All additional control turned off at start*/
    'MAP_TYPES': 0,
    'TERRAIN_TYPES': 0
  };
  this.prevState = JSON.parse( JSON.stringify( this.DISP_STATE ) );
  this.updateIndicators();
  this.updateDisplay();

}

/**
 * Updates indicators
 */
CommanderDisplay.prototype.updateIndicators = function() {

  var btnGroup = this.DisplayContainer.find( 'button[data-info]' );
  btnGroup.removeClass( 'active' );
  btnGroup.each( ( btn ) => {
    var key = $( btnGroup[ btn ] ).data( 'info' )[ 0 ];
    var value = $( btnGroup[ btn ] ).data( 'info' )[ 1 ];
    if ( key == 'ADDITIONAL_CTL' ) {
      if ( this.DISP_STATE[ 'ADDITIONAL_CTL' ][ value ] ) {
        $( btnGroup[ btn ] ).addClass( 'active' );
      } else {
        $( btnGroup[ btn ] ).removeClass( 'active' );
      }
    } else {
      if ( this.DISP_STATE[ key ] == value ) {
        $( btnGroup[ btn ] ).addClass( 'active' );
      }
    }
  } );
}

/**
 * Inititalizes viewer
 */
CommanderDisplay.prototype.InitViewer = function() {
  this.DisplayContainer.find( '#cdr-cesium-' + this.DisplayContainerIdentifier ).css( 'display', 'block' );
  var viewer = new Cesium.Viewer( 'cdr-cesium-' + this.DisplayContainerIdentifier, {
    animation: false,
    fullscreenButton: false,
    baseLayerPicker: false,
    vrButton: false,
    geocoder: false,
    DefaultHomeLocationButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    scene3DOnly: false,
    shouldAnimate: true,
  } );
  viewer.camera.setView( {
    destination: this.DefaultHomeLocation,
  } );
  try {
    this.CesiumViewer = viewer;
    this.CesiumInitialized = true;
  } catch ( e ) {
    cu.logError( 'Commander Display | InitViewer | Unknown assignment error :', e.message );
  }
};

/**
 * Returns Viewer
 * @return {Object} viewer
 */
CommanderDisplay.prototype.getViewer = function() {
  return this.CesiumViewer;
};

/**
 * Destroy Viewer
 */
CommanderDisplay.prototype.DestroyViewer = function() {
  if ( this.CesiumViewer != undefined ) {
    try {
      this.CesiumViewer.destroy();
      this.CesiumViewer = undefined;
      this.MyVehicleEntity = undefined;
      this.MyVehiclePathEntity = undefined;
      this.CesiumInitialized = false;

    } catch ( e ) {
      cu.logError( 'Commander Display | DestroyViewer | Error destroying viewer :', e.message );
    }

    cu.logInfo( 'Commander Display | DestroyViewer | Viewer Destroyed' );
  }
  $( '#cdr-cesium-' + this.DisplayContainerIdentifier ).css( 'display', 'none' );
  cu.logDebug( 'Commander Display | DestroyViewer | viewer css property, display set to none' );
};

/**
 * Destroy Video Stream
 */
CommanderDisplay.prototype.DestroyVideoStream = function() {
  $( '#cdr-video-' + this.DisplayContainerIdentifier ).empty()
  $( '#cdr-video-' + this.DisplayContainerIdentifier ).css( 'display', 'none' );
  session.disableVideoStream();
};

/**
 * Inititalizes Video Stream
 */
CommanderDisplay.prototype.InitVideoStream = function() {
  $( '#cdr-video-' + this.DisplayContainerIdentifier ).css( 'display', 'block' );
  session.enableVideoSteam( ( image ) => {
    // console.log( 'endtest -->  ', image );
    /* Calculate FPS */
    // if ( this.VideoController.frameCounter == 0 ) {
    //   /* in seconds */
    //   this.VideoController.lastTimestamp = new Date().getTime() / 1000;
    // }

    // if ( this.VideoController.frameCounter > 0 && this.VideoController.frameCounter % 1000 == 0 ) {
    //   var currentTimestamp = new Date().getTime() / 1000;
    //   var delta = currentTimestamp - this.VideoController.lastTimestamp;
    //   var fps = Math.round( 1000 / delta );
    //   this.VideoController.currentFPS = fps;
    // }
    /* render image */
    $( '#cdr-video-' + this.DisplayContainerIdentifier ).attr( 'src', 'data:image/jpeg;base64,' + image.buffer );
  } );
};

/**
 * Updates Display
 */
CommanderDisplay.prototype.updateDisplay = function( thisChanged ) {

  var displayUpdated = true;

  var channel = this.DISP_META.DISPLAY_CHANNELS[ this.DISP_STATE.DISPLAY_CHANNELS ];
  var map = this.DISP_META.MAP_TYPES[ this.DISP_STATE.MAP_TYPES ];
  var terrain = this.DISP_META.TERRAIN_TYPES[ this.DISP_STATE.TERRAIN_TYPES ];
  var preChannel = this.DISP_META.DISPLAY_CHANNELS[ this.prevState.DISPLAY_CHANNELS ];
  var preMap = this.DISP_META.MAP_TYPES[ this.prevState.MAP_TYPES ];
  var preTerrain = this.DISP_META.TERRAIN_TYPES[ this.prevState.TERRAIN_TYPES ];

  /* Additional control */
  if ( thisChanged == 'ADDITIONAL_CTL' ) {

    if ( this.DISP_STATE.ADDITIONAL_CTL[ this.DISP_META.ADDITIONAL_CTL.indexOf( 'ADI' ) ] ) {
      /* initialize adi */
      if ( !HUDStarted ) {
        drawHUD( 'cdr-guages-' + this.DisplayContainerIdentifier );
        HUDStarted = true;
      }
    } else {
      /* deinitialize adi */
      $( '#cdr-guages-' + this.DisplayContainerIdentifier ).empty();
      HUDStarted = false;
    }

    if ( this.DISP_STATE.ADDITIONAL_CTL[ this.DISP_META.ADDITIONAL_CTL.indexOf( 'ADSB' ) ] ) {
      /* initialize adsb */
      var self = this;
      if ( !this.CesiumInitialized ) {
        return false;
      }
      session.getADSBJson( 2000, ( data ) => {
        ADSBUpdate( data, self );
      } );

    } else {
      /* deinitialize adbsb*/
      AIRCRAFTS = {};
      HISTORY = {};
      session.clearADSBInterval();
    }

    if ( this.DISP_STATE.ADDITIONAL_CTL[ this.DISP_META.ADDITIONAL_CTL.indexOf( 'CA_LOCK' ) ] ) {
      /* Do nothing */
      if ( !this.CesiumInitialized ) {
        return false;
      }
    } else {
      /* Do nothing */
    }
    return displayUpdated;

  }

  /* displays */
  switch ( channel ) {

    case 'NO_DISPLAY':
      this.DestroyViewer();
      this.DestroyVideoStream();
      break;

    case 'VIDEO_STREAM':
      this.DestroyViewer();
      this.InitVideoStream();
      break;

    case 'GROUND_TRACK':
      /* fall through */
    case 'FPV':
      if ( preChannel == 'VIDEO_STREAM' ) {
        this.DestroyVideoStream();
      }
      if ( preChannel == 'GROUND_TRACK' & channel == 'FPV' ) {
        this.DestroyViewer();
      }
      if ( preChannel == 'FPV' & channel == 'GROUND_TRACK' ) {
        this.DestroyViewer();
      }
      if ( ( preChannel == 'FPV' | preChannel == 'GROUND_TRACK' ) & channel == 'VIDEO_STREAM' ) {
        this.DestroyViewer();
      }



      if ( !this.CesiumInitialized ) {

        this.InitViewer();


      }



      switch ( map ) {

        case 'DEFAULT_MAP':
          this.CesiumViewer.imageryLayers.addImageryProvider(
            new Cesium.IonImageryProvider( {
              assetId: 4
            } )
          );
          break;

        case 'SATELLITE_MAP':
          this.CesiumViewer.imageryLayers.addImageryProvider(
            new Cesium.IonImageryProvider( {
              assetId: 2
            } )
          );
          break;

        default:
          break;
      }

      switch ( terrain ) {

        case '2D_TERRAIN':
          this.CesiumViewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider( {} );
          break;

        case '3D_TERRAIN':
          this.CesiumViewer.scene.terrainProvider = new Cesium.CesiumTerrainProvider( {
            url: Cesium.IonResource.fromAssetId( 1 ),
            requestWaterMask: true
          } );
          break;

        default:
          break;
      }

      if ( ( [ 'GROUND_TRACK', 'FPV' ].indexOf( channel ) != -1 ) & ( channel != preChannel ) ) {
        switch ( channel ) {
          case 'GROUND_TRACK':
            /* Fly camera to location */
            this.CesiumViewer.camera.flyTo( {
              destination: Cesium.Cartesian3.fromDegrees( Position.Lon, Position.Lat, 800 )
            } )
            /* Clear Map */
            // this.CesiumViewer.entities.removeAll();

            /* Add vehile to map */
            var currentAlt = Math.abs( Position.Alt - groundElevation ) + cesiumGroundElevation + altPadding
            var position = Cesium.Cartesian3.fromDegrees( Position.Lon, Position.Lat, currentAlt );
            var heading = Attitude.Yaw;
            var pitch = Attitude.Roll;
            var roll = Attitude.Pitch;
            var hpr = new Cesium.HeadingPitchRoll( heading, pitch, roll );
            var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );

            this.positions = new Cesium.SampledPositionProperty();
            this.positions.setInterpolationOptions( {
              interpolationDegree: 5,
              interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
            } );
            this.positions.addSample( Cesium.JulianDate.now(), position );
            this.MyVehicleEntity = this.CesiumViewer.entities.add( {
              name: 'MyVehicle',

              position: position,

              orientation: orientation,

              model: {
                uri: '/img/plane_v3.gltf',
                minimumPixelSize: 4,
                maximumScale: 20000,
                scale: 0.5,
              }

            } );
            this.MyVehiclePathEntity = this.CesiumViewer.entities.add( {
              name: 'MyVehiclePath',

              position: position,

              path: {
                show: true,
                leadTime: 0,
                trailTime: 40,
                width: 4,
                resolution: 1,
                material: Cesium.Color.LIGHTGREEN
              }

            } );

            this.CesiumViewer.clock.onTick.addEventListener( this.GroundTrackUpdateFunction, this );
            break;

          case 'FPV':
            this.CesiumViewer.clock.onTick.addEventListener( this.FPVUpdateFunction, this );
            break;

          default:
            break;
        }
      }
      break;

    default:
      break;
  }

  return displayUpdated;
}

CommanderDisplay.prototype.FPVUpdateFunction = function( e ) {
  var self = e.onTick._scopes[ 2 ];
  var currentAlt = Math.abs( Position.Alt - groundElevation ) + cesiumGroundElevation + altPadding
  var location = Cesium.Cartesian3.fromDegrees( Position.Lon, Position.Lat, currentAlt )
  /* Camera Attitude Lock Control */
  if ( self.DISP_STATE[ 'ADDITIONAL_CTL' ][ 0 ] ) {
    camPitch = Attitude.Pitch;
    camRoll = ( -1 ) * Attitude.Roll;
  } else {
    camPitch = 0;
    camRoll = 0;
  }

  self.CesiumViewer.camera.setView( {
    destination: location,
    orientation: {
      heading: Attitude.Yaw,
      pitch: camPitch,
      roll: camRoll
    }
  } );
}


CommanderDisplay.prototype.GroundTrackUpdateFunction = function( e ) {
  var self = e.onTick._scopes[ 2 ];
  if ( self.MyVehicleEntity != undefined ) {
    var currentAlt = Math.abs( Position.Alt - groundElevation ) + cesiumGroundElevation + altPadding
    var position = Cesium.Cartesian3.fromDegrees( Position.Lon, Position.Lat, currentAlt );
    var heading = Attitude.Yaw;
    var pitch = Attitude.Roll;
    var roll = Attitude.Pitch;
    var hpr = new Cesium.HeadingPitchRoll( heading, pitch, roll );
    var orientation = Cesium.Transforms.headingPitchRollQuaternion( position, hpr );
    self.positions.addSample( Cesium.JulianDate.now(), position );
    self.MyVehicleEntity.position = position;
    self.MyVehicleEntity.orientation = orientation;
    self.MyVehiclePathEntity.position = this.positions;
  }
}


CommanderDisplay.prototype.Subscriptions = function() {
  /* Origin Altitude */
  session.subscribe( [ {
    'name': '/PE/PE_HkTlm_t/AltOrigin'
  } ], ( paramArr ) => {
    try {
      var param = paramArr[ 0 ]
      var sample = param.sample[ param.sample.length - 1 ];
      var value = sample.value;
      groundElevation = value;
    } catch ( e ) {
      cu.logError( "CommanderDisplay | Subscriptions | unable to process response. error= ", e.message )
    }
  } );

  /* Position  and Attitude */
  session.subscribe( [ {
      'name': '/PX4/PX4_VehicleGlobalPositionMsg_t/Lat'
    },
    {
      'name': '/PX4/PX4_VehicleGlobalPositionMsg_t/Lon'
    },
    {
      'name': '/PX4/PX4_VehicleGlobalPositionMsg_t/Alt'
    },
    {
      'name': '/PX4/PX4_VehicleAttitudeMsg_t/Q[0]'
    },
    {
      'name': '/PX4/PX4_VehicleAttitudeMsg_t/Q[1]'
    },
    {
      'name': '/PX4/PX4_VehicleAttitudeMsg_t/Q[2]'
    },
    {
      'name': '/PX4/PX4_VehicleAttitudeMsg_t/Q[3]'
    }
  ], ( paramArr ) => {
    try {
      for ( var i in paramArr ) {
        var param = paramArr[ i ]
        var sample = param.sample[ param.sample.length - 1 ];
        var value = sample.value;
        switch ( param.opsPath ) {
          case '/PX4/PX4_VehicleGlobalPositionMsg_t/Lat':
            Position.Lat = value;
            break;

          case '/PX4/PX4_VehicleGlobalPositionMsg_t/Lon':
            Position.Lon = value;
            break;

          case '/PX4/PX4_VehicleGlobalPositionMsg_t/Alt':
            Position.Alt = value;
            break;

          case '/PX4/PX4_VehicleAttitudeMsg_t/Q[0]':
            Q[ 0 ] = value;
            break;

          case '/PX4/PX4_VehicleAttitudeMsg_t/Q[1]':
            Q[ 1 ] = value;
            break;

          case '/PX4/PX4_VehicleAttitudeMsg_t/Q[2]':
            Q[ 2 ] = value;
            break;

          case '/PX4/PX4_VehicleAttitudeMsg_t/Q[3]':
            Q[ 3 ] = value;
            break;

          default:
            break;
        }
      }

      var phi = Math.atan2( 2 * ( ( Q[ 2 ] * Q[ 3 ] ) + ( Q[ 0 ] * Q[ 1 ] ) ), 1.0 - 2.0 * ( Q[ 1 ] * Q[ 1 ] ) - ( Q[ 2 ] * Q[ 2 ] ) );
      var t = 2.0 * ( Q[ 0 ] * Q[ 2 ] - Q[ 1 ] * Q[ 3 ] );
      if ( t > 1 ) {
        t = 1;
      } else if ( t < -1 ) {
        t = -1;
      }
      var theta = Math.asin( t );
      var psi = Math.atan2( 2.0 * ( ( Q[ 1 ] * Q[ 2 ] ) + ( Q[ 0 ] * Q[ 3 ] ) ), 1.0 - 2.0 * ( ( Q[ 2 ] * Q[ 2 ] ) + ( Q[ 3 ] * Q[ 3 ] ) ) );

      Attitude.Pitch = theta;
      Attitude.Roll = ( -1 ) * phi;
      Attitude.Yaw = psi;

      this.ADIUpdate();

    } catch ( e ) {
      cu.logError( "CommanderDisplay | Subscriptions | unable to process response. error= ", e.message )
    }

  } );

  /* Register subscriptions with rouge */
  [ '/PE/PE_HkTlm_t/AltOrigin',
    '/PX4/PX4_VehicleGpsPositionMsg_t/Lat',
    '/PX4/PX4_VehicleGpsPositionMsg_t/Lon',
    '/PX4/PX4_VehicleGpsPositionMsg_t/Alt',
    '/PX4/PX4_VehicleAttitudeMsg_t/Q[0]',
    '/PX4/PX4_VehicleAttitudeMsg_t/Q[1]',
    '/PX4/PX4_VehicleAttitudeMsg_t/Q[2]',
    '/PX4/PX4_VehicleAttitudeMsg_t/Q[3]',
  ].forEach( ( opsPath ) => {
    if ( !( rouge_subscriptions.hasOwnProperty( opsPath ) ) ) {
      /* new entry */
      rouge_subscriptions[ opsPath ] = {};
      rouge_subscriptions[ opsPath ][ 'text' ] = [ '#' + this.DisplayContainerIdentifier ];
    } else {
      cu.assert( typeof rouge_subscriptions[ opsPath ] == 'object', 'CommanderDisplay | Subscriptions | rouge_subscriptions[opsPath] is not an object' );
      if ( !( rouge_subscriptions[ opsPath ].hasOwnProperty( 'text' ) ) ) {
        rouge_subscriptions[ opsPath ][ 'text' ] = [ '#' + this.DisplayContainerIdentifier ];
      } else {
        rouge_subscriptions[ opsPath ][ 'text' ].push( '#' + this.DisplayContainerIdentifier );
      }
    }
  } );

}

CommanderDisplay.prototype.ADIUpdate = function() {
  if ( HUDStarted == true ) {
    updateHUDHeading( Attitude.Yaw * 57.2958 );
    updateHUDPitch( Attitude.Pitch * 57.2958 );
    updateHUDRoll( Attitude.Roll * 57.2958 );
  }
}


CommanderDisplay.prototype.updateCesiumGroundHeight = function() {
  this.DISPLAY_GRND_ELEVATION_INTERVAL_OBJ = setInterval( () => {
    if ( this.CesiumViewer != undefined ) {
      var positions = [ Cesium.Cartographic.fromDegrees( Position.Lon, Position.Lat ) ];
      var promise = Cesium.sampleTerrainMostDetailed( this.CesiumViewer.scene.terrainProvider, positions );
      Cesium.when( promise, function( updatedPositions ) {
        cesiumGroundElevation = positions[ 0 ].height;
      } );
    }
  }, 1000 );
}

/**
 * Update display state
 * @param  {String} key   key
 * @param  {Object} value value
 */
CommanderDisplay.prototype.updateDisplayState = function( key, value ) {

  cu.assert( key in this.DISP_META, 'Commander Display | updateDisplayState | unknown key received' );
  cu.assert( typeof value == 'number', 'Commander Display | updateDisplayState | value should be a number' );
  cu.assert( value in Object.keys( this.DISP_META[ key ] ).map( Number ), 'Commander Display | updateDisplayState | got invalid channel value' );

  var prevValue;

  if ( key == 'ADDITIONAL_CTL' ) {
    prevValue = []
    for ( var i = 0; i < this.DISP_STATE[ key ].length; ++i ) {
      prevValue.push( this.DISP_STATE[ key ][ i ] );
    }

    if ( this.DISP_STATE[ key ][ value ] ) {
      this.DISP_STATE[ key ][ value ] = 0
    } else {
      this.DISP_STATE[ key ][ value ] = 1;
    }

  } else {
    prevValue = this.DISP_STATE[ key ];
    this.DISP_STATE[ key ] = value;
  }


  if ( !this.updateDisplay( key ) ) {
    this.DISP_STATE[ key ] = prevValue;
    cu.logError( 'Commander Display | updateDisplayState | Unable to update, ', key, ' from ', prevValue, ' at ', value );
  } else {
    this.updateIndicators();
    this.prevState = JSON.parse( JSON.stringify( this.DISP_STATE ) );
  }

}