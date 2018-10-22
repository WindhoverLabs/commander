/**
 * Display controller sotre
 * @type {Object}
 */
var display_controllers = {};
/**
 * Display controller clean up interval
 * @type {Number}
 */
var displayControllerCleanupInterval = 100000;

/**
 * Cleans up inactve display_controllers
 */
setInterval(function(){
  var keys = Object.keys(display_controllers);
  keys.forEach((e)=>{
    if($('#'+e).length == 0) {
      $('#'+e).empty();
      delete display_controllers[e];
    }
  });
}, displayControllerCleanupInterval);

/**
 * Set Display state for pfd display
 * @param {Object} e HTMLelement
 */
function setDisplayState(e) {
  var controlInfo = $(e).data('info');
  var cdKey = $(e).data('key');
  var key = controlInfo[0];
  var value = controlInfo[1];
  display_controllers[cdKey].updateDisplayState(key,value);
}

/* CommanderDisplay */
var CommanderDisplay = CommanderDisplay || {};

/**
 * Constructor for PFD display
 * @param       {Object} elm HTMLelement
 * @constructor
 */
function CommanderDisplay(elm) {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3YjJkYmYwOS02NGU2LTQyZGEtOGRiZC01Yjg3ZTllODBiYTAiLCJpZCI6MTU1NSwiaWF0IjoxNTI4OTE4MTQzfQ.E3pqNt_MGy9rAjE4T4dnPY3vOKjdctpXOjmh0ZPPloE';
  this.CesiumViewer = undefined;
  this.CesiumInitialized = false;
  this.DisplayContainer = elm;
  this.splIdentifier = elm.attr('id')
  this.home = Cesium.Cartesian3.fromDegrees( -95.3698,29.7604, 130000.0);  /* Houston */
  this.video = {};
  this.video.frameCounter = 0;
  this.video.lastTimestamp = 0;
  /* Default Display metadata */
  this.DISP_META = {
    'DISPLAY_CHANNELS' : {
      0 : 'NO_DISPLAY',         /* Display winhoverlabs logo */
      1 : 'VIDEO_STREAM',       /* Streams video from vehicle */
      2 : 'CESIUM_MAPS'         /* Display cesiums maps and terrains */
    },
    'LAYERS' : {
      0 : 'NO_LAYER',           /* Apply no layer */
      1 : 'ADI',                /* apply Attitude Director Indicator */
      2 : 'ADSB'                /* ADSB layer adds multiple aircrafts and thier trajectory to cesium maps */
    },
    'MAP_TYPES' : {
      0 : 'DEFAULT_MAP',              /* Basic cesium street map */
      1 : 'SATELLITE_MAP',            /* Satellite map */
    },
    'TERRAIN_TYPES' : {
      0 : '2D_TERRAIN',             /* Basic cesium street map with terrain */
      1 : '3D_TERRAIN'              /* Satellite map with terrain */
    },
  };

  /* Default Display state */
  this.DISP_STATE = {
    'DISPLAY_CHANNELS' : 0,
    'LAYERS'           : 0,
    'MAP_TYPES'        : 0,
    'TERRAIN_TYPES'    : 0
  };

  this.updateIndicators();
  this.updateDisplay();

}

/**
 * Updates indicators
 */
CommanderDisplay.prototype.updateIndicators = function() {

  var btnGroup = this.DisplayContainer.find('button[data-info]');
  btnGroup.removeClass('active');
  btnGroup.each((btn)=>{
    var key = $(btnGroup[btn]).data('info')[0];
    var value = $(btnGroup[btn]).data('info')[1];
    if(this.DISP_STATE[key] == value){
      $(btnGroup[btn]).addClass('active');
    }
  });



}

/**
 * Inititalizes viewer
 */
CommanderDisplay.prototype.InitViewer = function() {
  this.DisplayContainer.find('#cdr-cesium-'+this.splIdentifier).css('display','block');
  var viewer = new Cesium.Viewer('cdr-cesium-'+this.splIdentifier,{
    animation                                   : false,
    fullscreenButton                            : false,
    baseLayerPicker                             :	false,
    vrButton 	                                  : false,
    geocoder 	                                  : false,
    homeButton 	                                : false,
    infoBox 	                                  : false,
    sceneModePicker                             : false,
    selectionIndicator                          : false,
    timeline 	                                  : false,
    navigationHelpButton 	                      : false,
    navigationInstructionsInitiallyVisible 	    : false,
    scene3DOnly 	                              : false,
    shouldAnimate                               :	false,
    });
  viewer.camera.setView({
    destination : this.home,
  });
  try{
    this.CesiumViewer = viewer;
    this.CesiumInitialized = true;
  }
  catch (e){
      cu.logError('Commander Display | InitViewer | Unknown assignment error :',e.message);
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
  if (this.CesiumViewer != undefined) {
      try{
          this.CesiumViewer.destroy();
          this.CesiumViewer = undefined;
          this.CesiumInitialized = false;
      }
      catch (e) {
        cu.logError('Commander Display | DestroyViewer | Error destroying viewer :',e.message);
      }

      cu.logInfo('Commander Display | DestroyViewer | Viewer Destroyed');
  }
  $('#cdr-cesium-'+this.splIdentifier).css('display','none');
  cu.logDebug('Commander Display | DestroyViewer | viewer css property, display set to none');
};

/**
 * Destroy Video Stream
 */
CommanderDisplay.prototype.DestroyVideoStream = function() {
  $('#cdr-video-'+this.splIdentifier).empty()
  $('#cdr-video-'+this.splIdentifier).css('display','none');
  session.diableVideoSteam();
};

/**
 * Inititalizes Video Stream
 */
CommanderDisplay.prototype.InitVideoStream = function() {
  $('#cdr-video-'+this.splIdentifier).css('display','block');
  session.getVideoSteam((image)=>{
    /* Calculate FPS */
    if(this.video.frameCounter == 0) {
      /* in seconds */
      this.video.lastTimestamp = new Date().getTime()/1000;
    }

    if (this.video.frameCounter > 0 && this.video.frameCounter%1000 == 0) {
      var currentTimestamp = new Date().getTime()/1000;
      var delta = currentTimestamp - this.video.lastTimestamp;
      var fps = Math.round(1000/delta);
      this.video.currentFPS = fps;
    }
    /* render image */
    $('#cdr-video-'+this.splIdentifier).attr('src','data:image/jpeg;base64,'+image);
  });
};

/**
 * Updates Display
 */
CommanderDisplay.prototype.updateDisplay = function() {
  var SUCCESS   = true;

  var channel   = this.DISP_META.DISPLAY_CHANNELS[this.DISP_STATE.DISPLAY_CHANNELS];
  var map       = this.DISP_META.MAP_TYPES[this.DISP_STATE.MAP_TYPES];
  var terrain   = this.DISP_META.TERRAIN_TYPES[this.DISP_STATE.TERRAIN_TYPES];
  var layer     = this.DISP_META.LAYERS[this.DISP_STATE.LAYERS];
  var key       = $(this.DisplayContainer).attr('id');


  /* displays */
  if (channel == 'NO_DISPLAY') {
    this.DestroyViewer();
    this.DestroyVideoStream();
  }
  else if (channel == 'VIDEO_STREAM') {
    this.InitVideoStream();
    this.DestroyViewer();
  }
  else if (channel == 'CESIUM_MAPS') {

    if (!this.CesiumInitialized) {
        this.InitViewer();
    }
    this.DestroyVideoStream();

    if (map == 'DEFAULT_MAP') {
      this.CesiumViewer.imageryLayers.addImageryProvider(
        new Cesium.IonImageryProvider({ assetId: 4 })
      );
    }
    else if (map == 'SATELLITE_MAP') {
      this.CesiumViewer.imageryLayers.addImageryProvider(
        new Cesium.IonImageryProvider({ assetId: 2 })
      );
    }
    else {

    }

    if (terrain == '2D_TERRAIN') {
      this.CesiumViewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider({});
    }
    else if (terrain == '3D_TERRAIN') {
      this.CesiumViewer.scene.terrainProvider = new Cesium.CesiumTerrainProvider({
        url : Cesium.IonResource.fromAssetId(1),
        requestWaterMask: true
      });
    }
    else {

    }


  }

  /* Layers */
  if (layer == 'NO_LAYER') {
    $('#cdr-guages-'+this.splIdentifier).empty();
    adsb.destroy(key);
  }
  else if (layer == 'ADI') {
    $('#cdr-guages-'+this.splIdentifier).empty();
    drawHUD('cdr-guages-'+this.splIdentifier);
    adsb.destroy(key);
  }
  else if (layer == 'ADSB') {
    if(channel == 'CESIUM_MAPS'){
      adsb.init(key);
    }
    else {
      adsb.destroy(key);
    }
  }
  else {
    adsb.destroy(key);
  }

  return SUCCESS;
}

/**
 * Update display state
 * @param  {String} key   key
 * @param  {Object} value value
 */
CommanderDisplay.prototype.updateDisplayState = function(key,value) {

  cu.assert(key in this.DISP_META, 'Commander Display | updateDisplayState | unknown key received');
  cu.assert(typeof value == 'number', 'Commander Display | updateDisplayState | value should be a number');
  cu.assert(value in Object.keys(this.DISP_META[key]).map(Number), 'Commander Display | updateDisplayState | got invalid channel value');

  var prevValue = this.DISP_STATE[key];
  this.DISP_STATE[key] = value;

  if(!this.updateDisplay()) {
    this.DISP_STATE[key] = prevValue;
    cu.logError('Commander Display | updateDisplayState | Unable to update, ', key, ' from ', prevValue, ' to ', value);
  }
  else{
    this.updateIndicators();
  }

}
