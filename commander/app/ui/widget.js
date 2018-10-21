/****************************************************************************
 *
 *   Copyright (c) 2018 Windhover Labs, L.L.C. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 * 3. Neither the name Windhover Labs nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
 * OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *****************************************************************************/

'use strict';
/**
 * Modal Object
 * @type {JQuery Object}
 */
var builder = $('#cdr-widget');

/**
 * Modal generation configuration
 * @type {Array}
 */
var config = [
  {
    "label": "Select A Widget",
    "type": "select",
    "getItem": [{
        "value": 'plotIndicator',
        "label": 'Dataplot Indicator',
      },
      {
        "value": 'textIndicator',
        "label": 'Text Indicator',
      },
      {
        "value": 'cdrThroughput',
        "label": 'Commander Throughput',
      },
      {
        "value": 'grndClock',
        "label": 'Ground Clock',
      }
    ]
  },
  {
    "label": "Enter a name (Optional)",
    "type": "field",
    "dtype": "text"
  }, {
    "label": "Enter a OpsPath 1 (Optional)",
    "type": "field",
    "dtype": "text"
  }, {
    "label": "Enter a OpsPath 2 (Optional)",
    "type": "field",
    "dtype": "text"
  }, {
    "label": "Enter a OpsPath 3 (Optional)",
    "type": "field",
    "dtype": "text"
  }
]
/* mut modal configuration in modal object */
builder.data('custom', config)
/**
 * Creates a widget
 * @constructor
 */
function Widget() {
  /**
   * Collection of elements
   * @type {Array}
   */
  this.elms = []
  /**
   * Collection intervals used by the widget
   * @type {Object}
   */
  this.intervals = {}
  /**
   * collection of sparkline objects used by the widget
   * @type {Object}
   */
  this.sparklines = {}
  /**
   * Current cycle values
   * @type {Object}
   */
  this.current = {}
}

/**
 * Initializes widget
 * @return {undefined}
 */
Widget.prototype.createWidget = function() {
  /* TODO: validate for space in DOM */
  wid.current = {}
  this.current.selection = $("[id='select0']").val()
  this.current.name = $("[id='inputField1']").val()
  this.current.opsPath = []
  this.current.opsPath.push($("[id='inputField2']").val())
  this.current.opsPath.push($("[id='inputField3']").val())
  this.current.opsPath.push($("[id='inputField4']").val())
  /* call the function that matched the selected name */
  this[this.current.selection].call();
}

/**
 * Clears up current cycle values
 * @return {undefined}
 */
Widget.prototype.cleanUp = function() {
  wid.current = {}
}
/**
 * Clears and intervals functions
 * @param  {string} id unique id
 * @return {undefined}
 */
Widget.prototype.clearIntervals = function(id) {
  clearInterval(wid.intervals[id]);
}


/* All Custom function go in here */
/**
 * First custom function : takes opsPath and generates a sparkline plotIndicator
 * @return {undefined}
 */
Widget.prototype.plotIndicator = function() {
  cu.assert(wid.current.name != undefined, 'createWidget | widget name is missing. remake widget.')
  var opsPaths = wid.current.opsPath.filter((el) => {
    return el != undefined
  })
  var opsPath = opsPaths[0];
  if (opsPath.length > 1) {
    cu.logError('createWidget | more than one opsPath received, first valid opsPath will be used.')
  }
  var bp = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp.html)
  $('#cdr-gadget-' + bp.id).append('<div data-key=' + bp.id + ' class="cdr-gadget-text">' + wid.current.name +
    '</div>' +
    '<div id=spark-cdr-gadget' + bp.id + ' data-key=' + bp.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>')
  wid.sparklines[bp.id] = new Sparkline(document.getElementById('spark-cdr-gadget' + bp.id), {
    width: 50,
    height: 20
  });
  wid.sparklines[bp.id].draw([]);
  if (!(opsPath in Object.keys(rouge_subscriptions))) {
    session.subscribe([{
      name: opsPath
    }], (param) => {
      try {
        var sample = param.sample[param.sample.length - 1];
        var value = sample.value;
        var gdgtObj = $('.cdr-gadget-value[data-key=' + bp.id + ']');
        gdgtObj.data('value').push(value);
        if (gdgtObj.data('value').length == 10) {
          gdgtObj.data('value').splice(0, 1);
        }
        wid.sparklines[bp.id].draw(gdgtObj.data('value'));
      } catch (e) {
        cu.logError("createWidget | unable to process response. error= ", e.message)
      }
    });
    rouge_subscriptions[opsPath] = '.cdr-gadget-value[data-key=' + bp.id + ']';
  }
}
/**
 * Plots commander thoughput
 * @return {undefined}
 */
Widget.prototype.cdrThroughput = function() {
  var bp_up = generateBoilerPlate()
  var bp_down = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp_up.html)
  $('#cdr-gadget-' + bp_up.id).append('<div data-key=' + bp_up.id + ' class="cdr-gadget-text">UP' +
    '</div>' +
    '<div id=spark-cdr-gadget' + bp_up.id + ' data-key=' + bp_up.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>')
  $('#cdr-gadget-container').append(bp_down.html)
  $('#cdr-gadget-' + bp_down.id).append('<div data-key=' + bp_down.id + ' class="cdr-gadget-text">DOWN' +
    '</div>' +
    '<div id=spark-cdr-gadget' + bp_down.id + ' data-key=' + bp_down.id + ' class="cdr-gadget-value" data-value=[]>' +
    '</div>')
  wid.sparklines[bp_up.id] = new Sparkline(document.getElementById('spark-cdr-gadget' + bp_up.id), {
    width: 50,
    height: 20,
  });
  wid.sparklines[bp_down.id] = new Sparkline(document.getElementById('spark-cdr-gadget' + bp_down.id), {
    width: 50,
    height: 20,
  });
  wid.sparklines[bp_up.id].draw(up);
  wid.sparklines[bp_down.id].draw(down);
  var up = []
  var down = []
  var interval = setInterval(() => {
    session.getPerfData((param) => {
      up.push(param.up)
      down.push(param.down)
      if (up.length == 10) {
        up.splice(0, 1);
      }
      if (down.length == 10) {
        down.splice(0, 1);
      }
      wid.sparklines[bp_up.id].draw(up);
      wid.sparklines[bp_down.id].draw(down);
    });
  }, 1000);
  wid.intervals[bp_up.id] = interval
  wid.intervals[bp_down.id] = interval
}
/**
 * Takes a opsPath and generates a indicator showing value in plain text
 * @return {undefined}
 */
Widget.prototype.textIndicator = function() {
  cu.assert(wid.current.name != undefined, 'createWidget | widget name is missing. remake widget.')
  var opsPaths = wid.current.opsPath.filter((el) => {
    return el != undefined
  })
  var opsPath = opsPaths[0];
  if (opsPath.length > 1) {
    cu.logError('createWidget | more than one opsPath received, first valid opsPath will be used.')
  }
  var bp = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp.html)
  $('#cdr-gadget-' + bp.id).append('<div data-key=' + bp.id + ' class="cdr-gadget-text">' + wid.current.name +
    '</div>' +
    '<div data-key=' + bp.id + ' class="cdr-gadget-value">' +
    '</div>')
  if (!(opsPath in Object.keys(rouge_subscriptions))) {
    session.subscribe([{
      name: opsPath
    }], (param) => {
      try {
        var sample = param.sample[param.sample.length - 1];
        var value = sample.value;
        var gdgtObj = $('.cdr-gadget-value[data-key=' + bp.id + ']');
        gdgtObj.text(value);
      } catch (e) {
        cu.logError("createWidget | unable to process response. error= ", e.message)
      }
    });
    rouge_subscriptions[opsPath] = '.cdr-gadget-value[data-key=' + bp.id + ']';
  }
}
/**
 * Shows time
 * @return {undefined}
 */
Widget.prototype.grndClock = function() {
  var bp = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp.html)
  var interval = setInterval(() => {
    var d = new Date();
    var time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    $('.cdr-gadget-content[data-key=' + bp.id + ']').text(time);
  }, 1000);
  wid.intervals[bp.id] = interval
}

/**
 * Widget instance
 * @type {Widget}
 */
var wid = new Widget();

/**
 * Calls create widget with clean up widget
 */
function MakeWidget() {
  wid.createWidget();
  wid.cleanUp();
}
/**
 * Generates html boiler plate code for Widget
 * @return {Object} HTMLObject
 */
function generateBoilerPlate() {
  var uniqueID = cu.makeKey();
  var uniqueGadgetID = 'cdr-gadget-' + uniqueID
  var gadgetHtml = '<div id=' + uniqueGadgetID + ' class="cdr-gadget" ' +
    'onmouseover=gadgetHoverHandle(this,"onmouseover") onmouseleave=gadgetHoverHandle(this,"onmouseleave")>' +
    '<div data-key=' + uniqueID + ' class="cdr-gadget-close" onclick=gadgetCloseHandle(this)>x' +
    '</div>' +
    '<div data-key=' + uniqueID + ' class="cdr-gadget-content">' +
    '</div>' +
    '</div>'
  var resObj = {
    id: uniqueID,
    html: gadgetHtml
  }
  return resObj;
}
/**
 * On Hover event is handled there
 * @param  {object} elm HTMLObject
 * @param  {object} evt Evnet Object
 */
function gadgetHoverHandle(elm, evt) {
  if (evt == 'onmouseover') {
    $(elm).find('.cdr-gadget-close').css('display', 'block')
  } else if (evt == 'onmouseleave') {
    /* Let close button be displayed for 2 more seconds */
    setTimeout(() => {
      $(elm).find('.cdr-gadget-close').css('display', 'none')
    }, 2000);
  }
}
/**
 * Handles close event on the Widget
 * @param  {object} elm HTMLObject
 */
function gadgetCloseHandle(elm) {
  var uniqueID = $(elm).data('key');
  $('#cdr-gadget-' + uniqueID).remove();
  wid.clearIntervals(uniqueID)
}
