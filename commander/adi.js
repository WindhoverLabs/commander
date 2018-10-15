
var Position = {Lat: 0, Lon: 0, Alt: 0};
var Attitude = {Yaw: 0, Pitch: 0, Roll: 0};
var HUDCount = 0;
var HUDStarted = false;
/* Heads Up Display */
var draw;
var bgOpacity = 0.5;
var curHeading = 0;
var curPitch = 0;
var curRoll = 0;
var curAltitude = 0.0;
var textHeading;
var hdTicks;
var hdTicksMask;
var hdWidth;
var hudHeight;
var hudWidth;
var pxPer15Degrees;
var pxPerDegree;
var degPerPitchLine = 15;
var posPitchLineOnScreen = 3.5;
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
var pitchDirection = 0.2;
var altitudeDirection = 0.01;
var toggle = 0;
var text_color = '#0f0'//'#EF402F'

//ADI
var GetTime = function(){
    var d = new Date();
    var seconds = d.getTime()/1000;
    return seconds;
}

function getSubscriptions() {
  session.subscribe({
      homogeneity: {tolerance: 0}, tlm: [
          {'name': '/CFS/PX4/VA_Q_0'},
          {'name': '/CFS/PX4/VA_Q_1'},
          {'name': '/CFS/PX4/VA_Q_2'},
          {'name': '/CFS/PX4/VA_Q_3'}
      ]
    },
    function (params) {
      for (var i = 0; i < params.length; ++i) {
        switch (params[i].id.name) {
          case '/CFS/PX4/VA_Q_0':
            Q[0] = params[i].engValue.floatValue;
            break;

          case '/CFS/PX4/VA_Q_1':
            Q[1] = params[i].engValue.floatValue;
            break;

          case '/CFS/PX4/VA_Q_2':
            Q[2] = params[i].engValue.floatValue;
            break;

          case '/CFS/PX4/VA_Q_3':
            Q[3] = params[i].engValue.floatValue;
            break;
        }
      }


      var phi = Math.atan2(2*((Q[2]*Q[3])+(Q[0]*Q[1])), 1.0-2.0*(Q[1]*Q[1])-(Q[2]*Q[2]));
      var t = 2.0 * (Q[0]*Q[2]-Q[1]*Q[3]);
      if(t>1){
      t = 1;
      }
      else if(t<-1){
      t = -1;
      }
      var theta =Math.asin(t);
      var psi = Math.atan2(2.0*((Q[1]*Q[2])+(Q[0]*Q[3])),1.0-2.0*((Q[2]*Q[2])+(Q[3]*Q[3])));

      Attitude.Pitch = theta;
      Attitude.Roll = (-1)*phi;
      Attitude.Yaw = psi;

      if (HUDStarted == false) {
        /* Skip the first one. */
        HUDStarted = true;
      } else {
        HUDCount++;
      }

      if (HUDStarted == true && adiState=='Active') {
        updateHUDHeading(Attitude.Yaw * 57.2958);
        updateHUDPitch(Attitude.Pitch * 57.2958);
        updateHUDRoll(Attitude.Roll * 57.2958);
      }
    }
  );
}

function updateHUDHeading(newHeading) {
  if(newHeading<0){
    newHeading = newHeading+360;
  }
  //console.log('YAW',newHeading);
  textHeading.text(newHeading.toFixed(0).toString());
  hdTicks.x(-newHeading * pxPerDegree);
}

function updateHUDPitch(newPitch) {
  OffsetY = newPitch * pxPerDegreePitch;
  //pitchIndicator.rotate(0);
  //pitchIndicator.y(0);
  //pitchIndicator.animate(10, '-', 0).y(OffsetY).rotate(rotation);
}

function updateHUDRoll(newRoll) {
  rotation = newRoll;
  pitchIndicator.rotate(0);
  pitchIndicator.y(0);
  pitchIndicator.y(OffsetY).rotate(rotation);
}

function drawHUD(id) {

  var aspectRatio = 320.0 / 180.0;
  hudWidth = $('#'+id).width();
  hudHeight = $('#'+id).height();
  draw = SVG(id).size('100%', hudHeight);

  if (SVG.supported == false) {
    alert('SVG not supported with ths browser.');
  }
  else {
    draw.attr('preserveAspectRatio', 'x320Y180 meet');
    var rollIndicator = draw.group();

    /* -------------------------
     Draw altimeter
     ------------------------- */
    var altWidth = 50;
    var altHeight = hudHeight - 10;
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
    altTicksMask.rect(hudWidth, hudHeight).attr({
      fill: '#000000'
    });
    altTicksMask.rect(altWidth, altHeight).attr({
      x: hudWidth - altWidth - 5,
      y: 5,
      fill: '#ffffff',
      'stroke-width': '3px',
      rx: 5,
      ry: 5
    });
    altTicksMask.polyline([
      [hudWidth - altWidth - 5, hudHeight / 2],
      [hudWidth - altWidth + 15, (hudHeight - altCenterHeight) / 2],
      [hudWidth - 5, (hudHeight - altCenterHeight) / 2],
      [hudWidth - 5, (hudHeight + altCenterHeight) / 2],
      [hudWidth - altWidth + 15, (hudHeight + altCenterHeight) / 2],
      [hudWidth - altWidth - 5, hudHeight / 2]]).attr({
      fill: '#00ff00'
    });
    altTicksArea.maskWith(altTicksMask);

    /* -------------------------
     Draw Heading
     ------------------------- */
    var hdHeight = 50;
    hdWidth = hudWidth - 40;
    pxPer15Degrees = (hdWidth / 2) / 5;
    pxPerDegree = pxPer15Degrees / 15.0;
    var heading = draw.group();
    var headingBorder = heading.group();
    /* Draw border. */
    var hdRec1 = headingBorder.rect(hdWidth, hdHeight).attr({
      x: (hudWidth - hdWidth) / 2,
      y: hudHeight - hdHeight - 7,
      rx: 5,
      ry: 5,
      'fill-opacity': bgOpacity
    });
    hdTicksArea = heading.group();
    hdTicks = hdTicksArea.group();
    for (i = 0; i < (360 + 90); i++) {
      if (i % 5 == 0) {
        x = ((hudWidth) / 2) + (pxPerDegree * i);
        hdTicks.line(x, hudHeight - hdHeight - 3, x, hudHeight - hdHeight + 10).attr({
          width: 1,
          stroke: text_color
        });

        var fixedHeading = i;
        if (i < 0) {
          fixedHeading = 360 + i;
        }
        else if (i >= 360) {
          fixedHeading = i - 360;
        }

        var textHeadingTick = hdTicks.text(fixedHeading.toString()).move(x, hudHeight - hdHeight + 13);
        textHeadingTick.font({
          fill: text_color,
          anchor: 'middle',
          size: 13
        });
      }
    }
    for (i = 0; i > (-360 - 90); i--) {
      if (i % 5 == 0) {
        x = ((hudWidth) / 2) + (pxPerDegree * i);
        hdTicks.line(x, hudHeight - hdHeight - 3, x, hudHeight - hdHeight + 10).attr({
          width: 1,
          stroke: text_color
        });

        var fixedHeading = i;
        if (i < 0) {
          fixedHeading = 360 + i;
        }
        else if (i >= 360) {
          fixedHeading = i - 360;
        }

        var textHeadingTick = hdTicks.text(fixedHeading.toString()).move(x, hudHeight - hdHeight + 13);
        textHeadingTick.font({
          fill: text_color,
          anchor: 'middle',
          size: 13
        });
      }
    }
    /* Draw center heading indicator. */
    var hdCenter = heading.group();
    var hdCenterWidth = 60;
    hdCenter.polyline([
      [(hudWidth + 20) / 2, hudHeight -hdHeight -18 ],
      [hudWidth / 2, hudHeight -hdHeight -8],
      [(hudWidth - 20) / 2, hudHeight -hdHeight -18 ]]).attr({
      // stroke: '#000',
      // 'stroke-width': 2,
      'fill': '#000',
      'fill-opacity': bgOpacity
    });
    textHeading = draw.text('0').move((hudWidth / 2), hudHeight - hdHeight -45);
    textHeading.font({
      fill: text_color,
      anchor: 'middle',
      size: 23
    });
    /* -------------------------
     Draw horizon
     ------------------------- */
    hrzWidth = (hudWidth - altWidth) * 0.3;
    var hrzInterval;
    var horizonArea = draw.group();
    pxPerPitchLine = ((hudWidth / 2) / posPitchLineOnScreen);
    pxPerDegreePitch = pxPerPitchLine / degPerPitchLine;
    pitchIndicator = horizonArea.group();

    for (i = 0; i <= 90; i++) {
      if (i % degPerPitchLine == 0) {
        y = ((hudHeight) / 2) - (pxPerDegreePitch * i);

        if (i > 0) {
          pitchIndicator.polyline([
            [(hudWidth - hrzWidth) / 2, y],
            [(hudWidth - (hrzWidth * 0.10)) / 2, y],
            [hudWidth / 2, y + (hrzWidth * 0.05)],
            [(hudWidth + (hrzWidth * 0.10)) / 2, y],
            [(hudWidth + hrzWidth) / 2, y]]).attr({
            'stroke-width': 3,
            'fill-opacity': 0.0,
            stroke: '#000000'
          });
          pitchIndicator.polyline([
            [(hudWidth - hrzWidth) / 2, y],
            [(hudWidth - (hrzWidth * 0.10)) / 2, y],
            [hudWidth / 2, y + (hrzWidth * 0.05)],
            [(hudWidth + (hrzWidth * 0.10)) / 2, y],
            [(hudWidth + hrzWidth) / 2, y]]).attr({
            'stroke-width': 2,
            'fill-opacity': 0.0,
            stroke: '#00ff00'
          });

          var fixedPitch = i;
          if (i > 90) {
            fixedPitch = 180 - i;
          }

          pitchIndicator.rect(20, 20).attr({
            fill: '#000000',
            x: (hudWidth - hrzWidth) / 2 - 22,
            y: y - 10,
            'fill-opacity': bgOpacity,
          });
          var leftTextPitchLine = pitchIndicator.text(fixedPitch.toString()).move((hudWidth - hrzWidth) / 2 - 5, y - 7);
          leftTextPitchLine.font({
            fill: '#00ff00',
            anchor: 'end',
            size: 15,
          });

          pitchIndicator.rect(20, 20).attr({
            fill: '#000000',
            x: (hudWidth + hrzWidth) / 2 + 3,
            y: y - 10,
            'fill-opacity': bgOpacity,
          });
          var rightTextPitchLine = pitchIndicator.text(fixedPitch.toString()).move((hudWidth + hrzWidth) / 2 + 5, y - 7);
          rightTextPitchLine.font({
            fill: '#00ff00',
            anchor: 'start',
            size: 15,
          });
        }
        else {
          pitchIndicator.line(50, y, 2 * hudWidth, y).attr({
            'stroke-width': 3,
            stroke: '#000000'
          });
          pitchIndicator.line(50, y, 2 * hudWidth, y).attr({
            'stroke-width': 2,
            stroke: '#00ff00'
          });
        }
      }
    }

    for (i = 0; i >= -90; i--) {
      if (i % degPerPitchLine == 0) {
        y = ((hudHeight) / 2) - (pxPerDegreePitch * i);

        if (i < 0) {
          pitchIndicator.polyline([
            [(hudWidth - hrzWidth) / 2, y],
            [(hudWidth - (hrzWidth * 0.10)) / 2, y],
            [hudWidth / 2, y - (hrzWidth * 0.05)],
            [(hudWidth + (hrzWidth * 0.10)) / 2, y],
            [(hudWidth + hrzWidth) / 2, y]]).attr({
            'stroke-width': 3,
            'fill-opacity': 0.0,
            stroke: '#000000'
          });
          pitchIndicator.polyline([
            [(hudWidth - hrzWidth) / 2, y],
            [(hudWidth - (hrzWidth * 0.10)) / 2, y],
            [hudWidth / 2, y - (hrzWidth * 0.05)],
            [(hudWidth + (hrzWidth * 0.10)) / 2, y],
            [(hudWidth + hrzWidth) / 2, y]]).attr({
            'stroke-width': 2,
            'fill-opacity': 0.0,
            stroke: '#00ff00'
          });

          var fixedPitch = i;
          if (i < -90) {
            fixedPitch = -180 - i;
          }

          pitchIndicator.rect(25, 20).attr({
            fill: '#000000',
            x: (hudWidth - hrzWidth) / 2 - 27,
            y: y - 10,
            'fill-opacity': bgOpacity,
          });
          var leftTextPitchLine = pitchIndicator.text(fixedPitch.toString()).move((hudWidth - hrzWidth) / 2 - 5, y - 7);
          leftTextPitchLine.font({
            fill: '#00ff00',
            anchor: 'end',
            size: 15,
          });

          pitchIndicator.rect(25, 20).attr({
            fill: '#000000',
            x: (hudWidth + hrzWidth) / 2 + 3,
            y: y - 10,
            'fill-opacity': bgOpacity,
          });
          var rightTextPitchLine = pitchIndicator.text(fixedPitch.toString()).move((hudWidth + hrzWidth) / 2 + 5, y - 7);
          rightTextPitchLine.font({
            fill: '#00ff00',
            anchor: 'start',
            size: 15,
          });
        }
      }
    }

    hrzMask = pitchIndicator.mask();
    hrzMask.rect(hudWidth, hudHeight).attr({
      fill: '#000000'
    });
    hrzMask.rect(hudWidth - altWidth - 20, hudHeight - hdHeight - 20).attr({
      fill: '#ffffff',
      x: 5,
      y: 5
    });
    horizonArea.maskWith(hrzMask);
  }
}
