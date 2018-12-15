/**
 * Initial position
 * @type {Object}
 */
var Position = {
  Lat: 0,
  Lon: 0,
  Alt: 0
};
/**
 * Initial Altitude
 * @type {Object}
 */
var Attitude = {
  Yaw: 0,
  Pitch: 0,
  Roll: 0
};
var HUDCount = 0;
var HUDStarted = false;
/**
 * Will hold draw object, responsible for drawing shapes on the screen
 * @type {Object}
 */
var draw;
/**
 * HUD opacity
 * @type {Number}
 */
var bgOpacity = 0.5;
var curHeading = 0;
var curPitch = 0;
var curRoll = 0;
var curAltitude = 0.0;
var textHeading;
var hdTicks;
var hdTicksMask;
var hdWidth;

/**
 * HUD height
 * @type {Number}
 */
var hudHeight;
/**
 * HUD Width
 * @type {Number}
 */
var hudWidth;

var pxPer15Degrees;
var pxPerDegree;
var adiState;
/**
 * Degrees per pitch line
 * @type {Number}
 */
var degPerPitchLine = 15;
var posPitchLineOnScreen = 5;
var pxPerPitchLine;
var pxPerDegreePitch;
var pitchIndicator;
var altPosMetersOnScreen = 5;
var altPxPerMeter;
var altitudeIndicator;
var textAltitude;
var altTicks;
var OffsetY = 0;
var rotation = 0;
var hrzWidth;
var cameraImage;
var imageBuffer;
/**
 * Quaternions
 * @type {Array}
 */
var Q = [];
var AltOffset = 0;
var prevTS = 0;
var currTS = 0;
var ctr = 0;
var fps = 0;
var currentAltimeterCenter = 0.0;
var altitudeOffsetSwitch = false;
var altimeter;
var altTicksArea;
/**
 * Pitch initial direction
 * @type {Number}
 */
var pitchDirection = 0.2;
var altitudeDirection = 0.01;
var toggle = 0;
/**
 * HUD text color
 * @type {String}
 */
var text_color = '#0f0';

/**
 * Update HUD heading
 * @param  {Number} newHeading
 * @return {undefined}
 */
function updateHUDHeading( newHeading ) {

  if ( newHeading < 0 ) {
    newHeading = newHeading + 360;
  }

  textHeading.text( newHeading.toFixed( 0 ).toString() );
  hdTicks.x( -newHeading * pxPerDegree );
}
/**
 * Update HUD pitch
 * @param  {Number} newPitch
 * @return {undefined}
 */
function updateHUDPitch( newPitch ) {
  OffsetY = newPitch * pxPerDegreePitch;
}
/**
 * Update HUD roll
 * @param  {Number} newRoll
 * @return {undefined}
 */
function updateHUDRoll( newRoll ) {
  rotation = newRoll;
  pitchIndicator.rotate( 0 );
  pitchIndicator.y( 0 );
  pitchIndicator.y( OffsetY ).rotate( rotation );
}
/**
 * Draws HUD on given element
 * @param  {String} dom indentifier
 * @return {undefined}
 */
function drawHUD( id ) {

  var aspectRatio = 320.0 / 180.0;

  hudWidth = $( '#' + id ).width();
  hudHeight = $( '#' + id ).height();

  /* define size for tthe svg */
  draw = SVG( id ).size( '100%', hudHeight );

  if ( SVG.supported == false ) {

    cu.logError( 'drawHUD | SVG not supported with ths browser.' );

  } else {

    draw.attr( 'preserveAspectRatio', 'x320Y180 meet' );

    /* -------------------------
     Draw altimeter
     ------------------------- */
    var altWidth = 50;
    var altHeight = hudHeight - 10;

    altPxPerMeter = altHeight / altPosMetersOnScreen;

    var altPxPerDecimeter = altPxPerMeter / 10.0;
    var altPxPerCentimeter = altPxPerMeter / 100.0;
    var altPxPerMillimeter = altPxPerMeter / 1000.0;

    altimeter = draw.group();
    // /* Draw ticks group. */
    altTicksArea = altimeter.group();
    altTicks = altTicksArea.group();
    var altCenter = altimeter.group();
    var altCenterHeight = 30;
    var altTicksMask = altimeter.mask();


    /* -------------------------
     Draw Heading
     ------------------------- */
    var hdHeight = 50;
    hdWidth = hudWidth - 40;
    pxPer15Degrees = ( hdWidth / 2 ) / 5;
    pxPerDegree = pxPer15Degrees / 15.0;
    var heading = draw.group();
    var headingBorder = heading.group();
    /* Draw border. */
    var hdRec1 = headingBorder.rect( hdWidth, hdHeight ).attr( {
      x: ( hudWidth - hdWidth ) / 2,
      y: hudHeight - hdHeight - 7,
      rx: 5,
      ry: 5,
      'fill-opacity': bgOpacity
    } );

    /* draw ticks */
    hdTicksArea = heading.group();
    hdTicks = hdTicksArea.group();
    for ( i = 0; i < ( 360 + 90 ); i++ ) {
      if ( i % 5 == 0 ) {

        x = ( ( hudWidth ) / 2 ) + ( pxPerDegree * i );

        hdTicks.line( x, hudHeight - hdHeight - 3, x, hudHeight - hdHeight + 10 ).attr( {
          width: 1,
          stroke: text_color
        } );

        var fixedHeading = i;

        if ( i < 0 ) {

          fixedHeading = 360 + i;

        } else if ( i >= 360 ) {

          fixedHeading = i - 360;

        }

        var textHeadingTick = hdTicks.text( fixedHeading.toString() ).move( x, hudHeight - hdHeight + 13 );
        textHeadingTick.font( {
          fill: text_color,
          anchor: 'middle',
          size: 13
        } );
      }
    }
    for ( i = 0; i > ( -360 - 90 ); i-- ) {
      if ( i % 5 == 0 ) {

        x = ( ( hudWidth ) / 2 ) + ( pxPerDegree * i );

        hdTicks.line( x, hudHeight - hdHeight - 3, x, hudHeight - hdHeight + 10 ).attr( {
          width: 1,
          stroke: text_color
        } );

        var fixedHeading = i;

        if ( i < 0 ) {

          fixedHeading = 360 + i;

        } else if ( i >= 360 ) {

          fixedHeading = i - 360;

        }

        var textHeadingTick = hdTicks.text( fixedHeading.toString() ).move( x, hudHeight - hdHeight + 13 );
        textHeadingTick.font( {
          fill: text_color,
          anchor: 'middle',
          size: 13
        } );

      }
    }

    /* draw a mask for preventing ticks from overflow */
    var headingMask = hdTicks.mask();

    headingMask.rect( hdWidth, hdHeight ).attr( {
      fill: '#ffffff',
      x: ( hudWidth - hdWidth ) / 2,
      y: hudHeight - hdHeight - 7,
      rx: 5,
      ry: 5,
    } );

    hdTicksArea.maskWith( headingMask );

    /* Draw center heading indicator. */
    var hdCenter = heading.group();

    hdCenter.polyline( [
      [ ( ( hudWidth + 20 ) / 2 ) + 10, hudHeight - hdHeight - 48 ],
      [ ( ( hudWidth + 20 ) / 2 ) + 10, hudHeight - hdHeight - 18 ],
      [ ( hudWidth + 20 ) / 2, hudHeight - hdHeight - 18 ],
      [ hudWidth / 2, hudHeight - hdHeight - 8 ],
      [ ( hudWidth - 20 ) / 2, hudHeight - hdHeight - 18 ],
      [ ( ( hudWidth - 20 ) / 2 ) - 10, hudHeight - hdHeight - 18 ],
      [ ( ( hudWidth - 20 ) / 2 ) - 10, hudHeight - hdHeight - 48 ]
    ] ).attr( {
      'fill': '#000',
      'fill-opacity': bgOpacity
    } );
    textHeading = draw.text( '0' ).move( ( hudWidth / 2 ), hudHeight - hdHeight - 43 );
    textHeading.font( {
      fill: text_color,
      anchor: 'middle',
      size: 16
    } );

    /* -------------------------
     Draw horizon
     ------------------------- */
    hrzWidth = ( hudWidth ) * 0.15;
    var hrzInterval;
    var horizonArea = draw.group();

    pxPerPitchLine = ( ( hudWidth / 2 ) / posPitchLineOnScreen );
    pxPerDegreePitch = pxPerPitchLine / degPerPitchLine;
    pitchIndicator = horizonArea.group();

    /* draw top half or pitch indicators */
    for ( i = 0; i <= 90; i++ ) {
      if ( i % degPerPitchLine == 0 ) {
        y = ( ( hudHeight ) / 2 ) - ( pxPerDegreePitch * i );

        if ( i > 0 ) {
          pitchIndicator.polyline( [
            [ ( hudWidth - hrzWidth ) / 2, y ],
            [ ( hudWidth - ( hrzWidth * 0.10 ) ) / 2, y ],
            [ hudWidth / 2, y + ( hrzWidth * 0.05 ) ],
            [ ( hudWidth + ( hrzWidth * 0.10 ) ) / 2, y ],
            [ ( hudWidth + hrzWidth ) / 2, y ]
          ] ).attr( {
            'stroke-width': 3,
            'fill-opacity': 0.0,
            stroke: '#000000'
          } );
          pitchIndicator.polyline( [
            [ ( hudWidth - hrzWidth ) / 2, y ],
            [ ( hudWidth - ( hrzWidth * 0.10 ) ) / 2, y ],
            [ hudWidth / 2, y + ( hrzWidth * 0.05 ) ],
            [ ( hudWidth + ( hrzWidth * 0.10 ) ) / 2, y ],
            [ ( hudWidth + hrzWidth ) / 2, y ]
          ] ).attr( {
            'stroke-width': 2,
            'fill-opacity': 0.0,
            stroke: '#00ff00'
          } );

          var fixedPitch = i;
          if ( i > 90 ) {
            fixedPitch = 180 - i;
          }

          pitchIndicator.rect( 20, 20 ).attr( {
            fill: '#000000',
            x: ( hudWidth - hrzWidth ) / 2 - 22,
            y: y - 10,
            'fill-opacity': bgOpacity,
          } );
          var leftTextPitchLine = pitchIndicator.text( fixedPitch.toString() ).move( ( hudWidth - hrzWidth ) / 2 - 5, y - 7 );
          leftTextPitchLine.font( {
            fill: '#00ff00',
            anchor: 'end',
            size: 15,
          } );

          pitchIndicator.rect( 20, 20 ).attr( {
            fill: '#000000',
            x: ( hudWidth + hrzWidth ) / 2 + 3,
            y: y - 10,
            'fill-opacity': bgOpacity,
          } );
          var rightTextPitchLine = pitchIndicator.text( fixedPitch.toString() ).move( ( hudWidth + hrzWidth ) / 2 + 5, y - 7 );
          rightTextPitchLine.font( {
            fill: '#00ff00',
            anchor: 'start',
            size: 15,
          } );
        } else {
          pitchIndicator.line( 50, y, 2 * hudWidth, y ).attr( {
            'stroke-width': 3,
            stroke: '#000000'
          } );
          pitchIndicator.line( 50, y, 2 * hudWidth, y ).attr( {
            'stroke-width': 2,
            stroke: '#00ff00'
          } );
        }
      }
    }
    /* draw bottom half or pitch indicators */
    for ( i = 0; i >= -90; i-- ) {
      if ( i % degPerPitchLine == 0 ) {
        y = ( ( hudHeight ) / 2 ) - ( pxPerDegreePitch * i );

        if ( i < 0 ) {
          pitchIndicator.polyline( [
            [ ( hudWidth - hrzWidth ) / 2, y ],
            [ ( hudWidth - ( hrzWidth * 0.10 ) ) / 2, y ],
            [ hudWidth / 2, y - ( hrzWidth * 0.05 ) ],
            [ ( hudWidth + ( hrzWidth * 0.10 ) ) / 2, y ],
            [ ( hudWidth + hrzWidth ) / 2, y ]
          ] ).attr( {
            'stroke-width': 3,
            'fill-opacity': 0.0,
            stroke: '#000000'
          } );
          pitchIndicator.polyline( [
            [ ( hudWidth - hrzWidth ) / 2, y ],
            [ ( hudWidth - ( hrzWidth * 0.10 ) ) / 2, y ],
            [ hudWidth / 2, y - ( hrzWidth * 0.05 ) ],
            [ ( hudWidth + ( hrzWidth * 0.10 ) ) / 2, y ],
            [ ( hudWidth + hrzWidth ) / 2, y ]
          ] ).attr( {
            'stroke-width': 2,
            'fill-opacity': 0.0,
            stroke: '#00ff00'
          } );

          var fixedPitch = i;
          if ( i < -90 ) {
            fixedPitch = -180 - i;
          }

          pitchIndicator.rect( 25, 20 ).attr( {
            fill: '#000000',
            x: ( hudWidth - hrzWidth ) / 2 - 27,
            y: y - 10,
            'fill-opacity': bgOpacity,
          } );
          var leftTextPitchLine = pitchIndicator.text( fixedPitch.toString() ).move( ( hudWidth - hrzWidth ) / 2 - 5, y - 7 );
          leftTextPitchLine.font( {
            fill: '#00ff00',
            anchor: 'end',
            size: 15,
          } );

          pitchIndicator.rect( 25, 20 ).attr( {
            fill: '#000000',
            x: ( hudWidth + hrzWidth ) / 2 + 3,
            y: y - 10,
            'fill-opacity': bgOpacity,
          } );
          var rightTextPitchLine = pitchIndicator.text( fixedPitch.toString() ).move( ( hudWidth + hrzWidth ) / 2 + 5, y - 7 );
          rightTextPitchLine.font( {
            fill: '#00ff00',
            anchor: 'start',
            size: 15,
          } );
        }
      }
    }

    /* mask to avoid occlusion with heading indicator */
    hrzMask = pitchIndicator.mask();
    hrzMask.rect( hudWidth, hudHeight ).attr( {
      fill: '#000000'
    } );
    hrzMask.rect( hudWidth - altWidth - 20, hudHeight - hdHeight - 20 ).attr( {
      fill: '#ffffff',
      x: 5,
      y: 5
    } );
    horizonArea.maskWith( hrzMask );
  }
}