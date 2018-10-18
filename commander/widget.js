/* Generate widget Builder */
var models = {}

var builder = $('#cdr-widget');

var config = [{
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
}, {
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
}]

builder.data('custom', config)

function Widget() {
  this.elms = []
  this.intervals = {}
  this.sparklines = {}
  this.current = {}
}

Widget.prototype.createWidget = function() {
  /* TODO: validate for space in DOM */
  wid.current = {}
  this.current.selection = $("[id='select0']").val()
  this.current.name      = $("[id='inputField1']").val()
  this.current.opsPath   = []
  this.current.opsPath.push($("[id='inputField2']").val())
  this.current.opsPath.push($("[id='inputField3']").val())
  this.current.opsPath.push($("[id='inputField4']").val())
  /* call the function that matched the selected name */
  this[this.current.selection].call();
}

Widget.prototype.cleanUp = function() {
  wid.current = {}
}

Widget.prototype.clearIntervals = function(id) {
  clearInterval(wid.intervals[id]);
}


/* All Custom function go in here */

Widget.prototype.plotIndicator = function() {
  cu.assert(wid.current.name != undefined,'createWidget | widget name is missing. remake widget.')
  var opsPaths = wid.current.opsPath.filter((el)=>{return el!=undefined})
  var opsPath = opsPaths[0];
  if(opsPath.length > 1){
    cu.logError('createWidget | more than one opsPath received, first valid opsPath will be used.')
  }
  var bp = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp.html)
  $('#cdr-gadget-'+bp.id).append('<div data-key='+bp.id+' class="cdr-gadget-text">'+ wid.current.name +
    '</div>'+
    '<div id=spark-cdr-gadget'+bp.id+' data-key='+bp.id+' class="cdr-gadget-value" data-value=[]>'+
    '</div>')
  wid.sparklines[bp.id] = new Sparkline(document.getElementById('spark-cdr-gadget'+bp.id),{width: 50, height:20});
  wid.sparklines[bp.id].draw([]);
  if(!(opsPath in Object.keys(rouge_subscriptions))) {
    session.subscribe([{name:opsPath}], (param)=>{
      try {
        var sample = param.sample[param.sample.length - 1];
        var value = sample.value;
        var gdgtObj = $('.cdr-gadget-value[data-key='+bp.id+']');
        gdgtObj.data('value').push(value);
        if (gdgtObj.data('value').length == 10) {
          gdgtObj.data('value').splice(0,1);
        }
        wid.sparklines[bp.id].draw(gdgtObj.data('value'));
      }
      catch(e){
        cu.logError("createWidget | unable to process response. error= ",e.message)
      }
    });
    rouge_subscriptions[opsPath] = '.cdr-gadget-value[data-key='+bp.id+']';
  }
}

Widget.prototype.cdrThroughput = function() {
  var bp_up = generateBoilerPlate()
  var bp_down = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp_up.html)
  $('#cdr-gadget-'+bp_up.id).append('<div data-key='+bp_up.id+' class="cdr-gadget-text">UP'+
    '</div>'+
    '<div id=spark-cdr-gadget'+bp_up.id+' data-key='+bp_up.id+' class="cdr-gadget-value" data-value=[]>'+
    '</div>')
  $('#cdr-gadget-container').append(bp_down.html)
  $('#cdr-gadget-'+bp_down.id).append('<div data-key='+bp_down.id+' class="cdr-gadget-text">DOWN'+
    '</div>'+
    '<div id=spark-cdr-gadget'+bp_down.id+' data-key='+bp_down.id+' class="cdr-gadget-value" data-value=[]>'+
    '</div>')
  wid.sparklines[bp_up.id] = new Sparkline(document.getElementById('spark-cdr-gadget'+bp_up.id),{
    width: 50,
    height:20,
  });
  wid.sparklines[bp_down.id] = new Sparkline(document.getElementById('spark-cdr-gadget'+bp_down.id),{
    width: 50,
    height:20,
  });
  wid.sparklines[bp_up.id].draw(up);
  wid.sparklines[bp_down.id].draw(down);
  var up = []
  var down = []
  var interval = setInterval(()=>{
    session.getPerfData((param)=>{
      up.push(param.up)
      down.push(param.down)
      if (up.length == 10) {
        up.splice(0,1);
      }
      if (down.length == 10) {
        down.splice(0,1);
      }
      wid.sparklines[bp_up.id].draw(up);
      wid.sparklines[bp_down.id].draw(down);
    });
  },1000);
  wid.intervals[bp_up.id] = interval
  wid.intervals[bp_down.id] = interval
}

Widget.prototype.textIndicator = function() {
  cu.assert(wid.current.name != undefined,'createWidget | widget name is missing. remake widget.')
  var opsPaths = wid.current.opsPath.filter((el)=>{return el!=undefined})
  var opsPath = opsPaths[0];
  if(opsPath.length > 1){
    cu.logError('createWidget | more than one opsPath received, first valid opsPath will be used.')
  }
  var bp = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp.html)
  $('#cdr-gadget-'+bp.id).append('<div data-key='+bp.id+' class="cdr-gadget-text">'+ wid.current.name +
    '</div>'+
    '<div data-key='+bp.id+' class="cdr-gadget-value">'+
    '</div>')
  if(!(opsPath in Object.keys(rouge_subscriptions))) {
    session.subscribe([{name:opsPath}], (param)=>{
      try {
        var sample = param.sample[param.sample.length - 1];
        var value = sample.value;
        var gdgtObj = $('.cdr-gadget-value[data-key='+bp.id+']');
        gdgtObj.text(value);
      }
      catch(e){
        cu.logError("createWidget | unable to process response. error= ",e.message)
      }
    });
    rouge_subscriptions[opsPath] = '.cdr-gadget-value[data-key='+bp.id+']';
  }
}

Widget.prototype.grndClock = function() {
  var bp = generateBoilerPlate()
  $('#cdr-gadget-container').append(bp.html)
  var interval = setInterval(()=>{
    var d = new Date();
    var time = d.getHours() + ":" + d.getMinutes()+ ":" + d.getSeconds();
    $('.cdr-gadget-content[data-key='+bp.id+']').text(time);
  },1000);
  wid.intervals[bp.id] = interval
}

/* Cannot have more than one instantiation*/
var wid = new Widget();


function MakeWidget() {
  wid.createWidget();
  wid.cleanUp();
}

function generateBoilerPlate() {
  var uniqueID = cu.makeKey();
  var uniqueGadgetID = 'cdr-gadget-'+uniqueID
  var gadgetHtml = '<div id='+uniqueGadgetID+' class="cdr-gadget" '+
    'onmouseover=gadgetHoverHandle(this,"onmouseover") onmouseleave=gadgetHoverHandle(this,"onmouseleave")>'+
    '<div data-key='+uniqueID+' class="cdr-gadget-close" onclick=gadgetCloseHandle(this)>x'+
    '</div>'+
    '<div data-key='+uniqueID+' class="cdr-gadget-content">'+
    '</div>'+
    '</div>'
  var resObj = {
    id:uniqueID,
    html:gadgetHtml
  }
  return resObj;
}

function gadgetHoverHandle(elm, evt) {
  if(evt == 'onmouseover') {
    $(elm).find('.cdr-gadget-close').css('display','block')
  }
  else if(evt == 'onmouseleave') {
    /* Let close button be displayed for 2 more seconds */
    setTimeout(()=>{
      $(elm).find('.cdr-gadget-close').css('display','none')
    },2000);
  }
}

function gadgetCloseHandle(elm) {
  var uniqueID = $(elm).data('key');
  $('#cdr-gadget-'+uniqueID).remove();
  wid.clearIntervals(uniqueID)
}
