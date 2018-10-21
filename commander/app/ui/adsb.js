/**
 * My vehicle tail size
 * @type {number}
 */
MYVEH_tailSize = 60
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
var minimum_aircraft_safety_distance =50000;
/**
 * if true the adsb code starts executing
 * @type {Boolean}
 */
var adsbState = false;
MYVEH_dataPoints = [];
MYVEH_line = null;
MYVEH_prevLine = null;
MYVEH_currentPoint = null;
MYVEH_zoom_once = false;
var AIRCRAFTS = {};
var HISTORY = {} ;
var ALLMYLINES = [];

/**
 * Calculate distance
 * @param  {object} p1
 * @param  {object} p2
 * @return {object}
 */
function distance(p1, p2) {
        return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y),2) + Math.pow((p1.z - p2.z), 2));
}

/**
 * Draw path
 */
setInterval(function(){
  if(adsbState == "Active"){
    //remove old line
    if(MYVEH_line!=null){
      MYVEH_prevLine = MYVEH_line;

    }
    //add new point to end of queue
    MYVEH_dataPoints.push(Position.Lon);
    MYVEH_dataPoints.push(Position.Lat);
    MYVEH_dataPoints.push(Math.abs(Position.Alt-groundElevation) + altPadding);

    //eat tail
    if(MYVEH_dataPoints.length>MYVEH_tailSize*3){
      MYVEH_dataPoints.shift()
      MYVEH_dataPoints.shift()
      MYVEH_dataPoints.shift()
    }

    let dashedLine = this.cesiumViewer.entities.add({
      polyline : {
         positions : Cesium.Cartesian3.fromDegreesArrayHeights(MYVEH_dataPoints),
         width : 3,
         material : Cesium.Color.ORANGE,

      }
    });
    MYVEH_line = dashedLine;
    if(MYVEH_prevLine!=null){
      this.cesiumViewer.entities.removeById(MYVEH_prevLine.id)
    }
  }else if(adsbState == "Active" && (display[0].id!=$('#gv')[0].id || terrain[0].id!=$('#2d')[0].id)){
    this.cesiumViewer.entities.removeById(MYVEH_line.id)
    MYVEH_dataPoints = [];
    MYVEH_line = null;
    MYVEH_prevLine = null;
  }


},2000)

/**
 * Draw vehicle
 */
setInterval(function(){

  if(adsbState == "Active" && display[0].id==$('#gv')[0].id && terrain[0].id==$('#2d')[0].id){

    //height adjustment
    var currentAlt = Math.abs(Position.Alt-groundElevation) + altPadding
    var position = Cesium.Cartesian3.fromDegrees(Position.Lon,Position.Lat,currentAlt);
    var heading = Attitude.Yaw;
    var pitch = Attitude.Roll;
    var roll = Attitude.Pitch;
    //console.log(heading,pitch,roll)
    var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    //first run - initialization
    if(!MYVEH_zoom_once){
      this.cesiumViewer.entities.removeAll();


      var entity = this.cesiumViewer.entities.add({
          name : 'vehicle',
          position : position,
          orientation : orientation,
          model : {
              uri : '/img/plane_v3.gltf',
              minimumPixelSize : 128,
              maximumScale : 2000,
              scale: 0.5,
          },

      });
      // this.cesiumViewer.zoomTo(entity);
      MYVEH_currentPoint = entity;
      MYVEH_zoom_once = true;
    }else {

      MYVEH_currentPoint.position = position;
      MYVEH_currentPoint.orientation = orientation;
    }
  }
  else if(adsbState == "Active" && (display[0].id!=$('#gv')[0].id || terrain[0].id!=$('#2d')[0].id)){
    adsbSwitch();
    MYVEH_currentPoint = null;
    MYVEH_zoom_once = false;
    this.cesiumViewer.entities.removeAll();

  }


},1000);

/**
 * Draw my vehicle
 */
setInterval(function(){
  if(adsbState == 'Active'){
    session.getADSBJson(function(adsb){
      if(!CLOSE_ADSB_SUB){
        //Create common timestamp
        var timestamp = Math.floor(Date.now());
        //Loop over response
        for(i=0; i<adsb.length;i++){
          var instance = adsb[i];
          // Full information needed to plot not available
          if(isNaN(instance.lat)  || isNaN(instance.lon) || isNaN(instance.altitude) || instance.lat==0  || instance.lon==0 || instance.altitude ==0){
            continue;
          }else{
            //calculate distance of an aircraft from vehicle_debug
            var d = distance(new Cesium.Cartesian3(Position.Lon,Position.Lat,Math.abs(Position.Alt-groundElevation) + altPadding), new Cesium.Cartesian3(instance.lon,instance.lat,instance.altitude));
             //Clean previous, old and corrupt points
             if(d<=minimum_aircraft_safety_distance){
               lat = instance.lat;
               lon = instance.lon;
               alt = instance.altitude;
               tme = timestamp;
               hex = instance.hex;
               //fresh point


               var position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

               if(!(hex in AIRCRAFTS)){
                var POINTQUE = [];
                try{
                  var hpr = new Cesium.HeadingPitchRoll(0, 0, 0);
                  var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
                  var enty = this.cesiumViewer.entities.add({
                    position : position,
                    orientation: orientation,
                    model : {
                        uri : '/img/genplane.gltf',
                        minimumPixelSize : 128,
                        maximumScale : 60000,
                        scale: 1,
                        color : Cesium.Color.fromAlpha(Cesium.Color.RED, parseFloat(1.0)),//getColor(viewModel.color, viewModel.alpha),
                    },
                  });
                }
                catch(e){console.log('some Err');}
                //this.cesiumViewer.zoomTo(enty);
                POINTQUE.push(lon);
                POINTQUE.push(lat);
                POINTQUE.push(alt);
                AIRCRAFTS[hex]={t:tme,key:enty.id,ent:enty};
                HISTORY[hex] = POINTQUE;
               }
               else{
                 var AIRCRAFT = AIRCRAFTS[hex];
                 var enty = AIRCRAFT.ent
                 AIRCRAFT.t =tme;
                 //cal yaw
                 var yaw = 0;
                 var hist = HISTORY[hex]
                 if(hist.length>=5){
                   let l = hist.length -1;
                   let dx = hist[l-5] - hist[l-2]
                   let dz = hist[l-3] - hist[l]
                   yaw = Math.atan2(dz, dz)-(45*(Math.PI/180));

                 }
                 console.log(yaw)
                 enty.position = position;
                 var hpr = new Cesium.HeadingPitchRoll((-1)*yaw, 0, 0);
                 var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
                 enty.orientation = orientation;
                 var POINTQUE = HISTORY[hex];
                 POINTQUE.push(lon);
                 POINTQUE.push(lat);
                 POINTQUE.push(alt);
                 HISTORY[hex] = POINTQUE;
                 //console.log(hex)
               }
             }
          }
        }
      }


    });
  }


  if(!CLOSE_ADSB_SUB){
    if(adsbState == "Active"){

      for(var i in AIRCRAFTS){
        var aircraft = AIRCRAFTS[i]
        var last_ts = aircraft.t;
        var curr_ts = Math.floor(Date.now());
        if(Math.abs(curr_ts-last_ts)>(outdated_seconds*1000)){
          console.log(Math.abs(curr_ts-last_ts))
          this.cesiumViewer.entities.removeById(aircraft.key)
          delete AIRCRAFTS.i
        }
      }

    }else if(adsbState == "Active" && (display[0].id!=$('#gv')[0].id || terrain[0].id!=$('#2d')[0].id)){
      AIRCRAFTS = {};
      HISTORY = {} ;
      ALLMYLINES = [];
      CLOSE_ADSB_SUB = true;

    }
  }

},2000);
