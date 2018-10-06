
/* Application Data*/
var subscriptions = {};
var dataplot_subscriptions = {};
//var windows = {};

/* Utility functions */
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

function genRandomKey(){
    return Math.random().toString(36).slice(2)
}

function generateUUID(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); // use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function isDescendant(parent, child) {
    var node = child.parentNode;
    while (node != null) {
        if (node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

function getJSONObj(str){

  var JSONObj = undefined;
  if (typeof str === 'string' || str instanceof String) {
      // it's a string
      JSONObj = JSON.parse(str);
  }
  else if (typeof str === 'object' || str instanceof Object) {
      // it's an object
      JSONObj = str;
  }
  else {
      // it's something else
      console.error('unknown data')
  }
  return JSONObj;
}

function isArray(obj){
  /* Backwards compatability */
  if (typeof Array.isArray === 'undefined') {
    Array.isArray = function(obj) {
      return (Object.prototype.toString.call(obj) === '[object Array]');
    }
  }
  return Array.isArray(obj);
}

function getRandomColor() {
  var letters = '0123456789abcdef';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/* View generation */
function processTelemetryUpdate(param) {
    // console.log('top',param);
    var sample = param.sample[param.sample.length - 1];
    var value = sample.value;
    var opsPath = param.opsPath;
    if(opsPath in subscriptions){
        var opsPathDef = undefined;
        if (subscriptions[opsPath].hasOwnProperty('def')) {
            opsPathDef = subscriptions[opsPath].def;
        }
        for(var i = 0; i < subscriptions[opsPath].elms.length; ++i){
            var nodeElm = subscriptions[opsPath].elms[i];
            var reqObj = getJSONObj(nodeElm.getAttribute('data-cdr'));
            var indicatorFormat = reqObj.indicator;
            assert(indicatorFormat!=undefined,'indicator format is not found');
            if(indicatorFormat=='text'){
                if(opsPathDef != undefined) {
                  switch (opsPathDef.dataType) {
                    case 'char':
                    case 'string':
                    case 'int8':
                    case 'uint8':
                    case 'int16':
                    case 'uint16':
                    case 'int32':
                    case 'uint32':
                    case 'int64':
                    case 'uint64': {
                      nodeElm.textContent = value;
                      break;
                    }
                    case 'double':
                    case 'float': {
                      nodeElm.textContent = value.toFixed(3);
                      break;
                    }
                    case 'boolean': {
                      nodeElm.textContent = '';
                      if (value) {
                        nodeElm.setAttribute('class','led-basic led-on')
                      }
                      else {
                        nodeElm.setAttribute('class','led-basic led-off')
                      }
                      break;
                    }
                  }
                }
            }
            else if (indicatorFormat=='dataplot') {
              /* Handle dataplot subscriptions */
              if(nodeElm.getAttribute('plot-initialized')===undefined
                ||nodeElm.getAttribute('plot-initialized')===null
               ||nodeElm.getAttribute('plot-initialized')===false){
                /* Upon seeing dataplot canvas we initialize canvas after
                which will keep adding data to initialized canvas */
                var tlmObj = getJSONObj(nodeElm.getAttribute('data-cdr'));

                var dataPlotDef = {};
                dataPlotDef['data'] = [];
                dataPlotDef['options'] = {};

                if(tlmObj.hasOwnProperty('tlm')){

                  assert(tlmObj.hasOwnProperty('label'),'label array doesnot exist');
                  assert(tlmObj.tlm.length===tlmObj.label.length,'tlm and labels arrays have different lengths');
                  assert(tlmObj.tlm.length > 0 && tlmObj.label.length > 0,'tlm and label arrays are empty');

                  var colorArr = []
                  if(!(tlmObj.hasOwnProperty('color') &&
                    isArray(tlmObj.color) &&
                    tlmObj.color.length == tlmObj.tlm.length)) {
                    for(var c = 0; c < tlmObj.tlm.length; ++c) {
                      var clr = getRandomColor();
                      while (clr in colorArr) {
                        clr = getRandomColor();
                      }
                      colorArr.push(clr);
                    }
                  }
                  else {
                    colorArr = tlmObj.color;
                  }

                  for(var i = 0; i < tlmObj.tlm.length; i++){

                    dataPlotDef['data'].push({
                      'tlm':{name:tlmObj.tlm[i].name},
                      'label':tlmObj.label[i],
                      'color':colorArr[i]
                    });

                  }

                  var generatedKey = genRandomKey();
                  while (generatedKey in dataplot_subscriptions){
                    generatedKey = genRandomKey();
                  }
                  nodeElm.setAttribute('plot-key',generatedKey);
                  dataplot_subscriptions[generatedKey] = new CmdrTimeSeriesDataplot(nodeElm, dataPlotDef,param)

                }
                 nodeElm.setAttribute('plot-initialized',true);
               }
               else{
                 // console.log('duplicate -- ', param)
                 dataplot_subscriptions[nodeElm.getAttribute('plot-key')].addData(param);
               }

            }
        }
    }
}

function processTelemetryDefinitionUpdate(opsPaths){
  opsPaths.forEach((path)=>{
    var def = subscriptions[path].def;
    var elms = subscriptions[path].elms
    /* Check elms if it has atlest 1 elm to apply update */
    if(elms != undefined && def != undefined) {
      elms.forEach((e)=>{
        /* TODO: Add tool tip functionality here */
      });
    }
  });
}

function isTemplateCommand(commandInfo) {
    var found = false;
    if(commandInfo.hasOwnProperty('argument')){
        if(commandInfo.argument.length > 0){
            /* Look for at least 1 unspecified value. */
            for(i=0; i < commandInfo.argument.length; i++){
                if(!commandInfo.argument[i].hasOwnProperty('value')){
                    found = true;
                }
            }
        }
    }
    return found;
}

function sendCmd(){
    var args = {};
    var labels = $("#genericInputModal").find('label');
    for(var i = 0; i < labels.length ; ++i){
        var label = labels[i].textContent;
        var value = labels[i].control.value;
        args[label] = value;
    }
    var cmdObj = JSON.parse($("#genericInputModal").attr('data-info'));
    session.sendCommand({ops_path:cmdObj.cmd.name,args:args})
}



class Panel {

  constructor(panelElm){

      this.panelElm = panelElm;
      this.title = 'Unknown'
      this.loadTimeout = 500; /* ms */
      this.tlm = [];

  }

  subscribeText(d,s) {
      /* check d has telemetry request info */
      if (d.hasOwnProperty('tlm')) {

          /* Map each tlm item to respective DOM objects, it manipulates */
          for(var i = 0; i < d.tlm.length; ++i) {
              var obj = d.tlm[i];
              /* Check if record exists */
              if(obj.name in subscriptions) {
                  var isBound = false;
                  /* Check if bound to atlest 1 element */
                  if(subscriptions[obj.name].hasOwnProperty('elms')) {
                    if (isArray(subscriptions[obj.name].elms) &&
                        subscriptions[obj.name].elms.length > 0) {
                          subscriptions[obj.name].elms.push(s);
                          isBound = true;
                    }
                  }
                  else {
                    subscriptions[obj.name].elms = [s];
                  }
              }
              else {
                subscriptions[obj.name] = {};
                subscriptions[obj.name].elms = [s];
              }
              /* Store in panel instance's context */
              this.tlm.push({name:obj.name, nodeElm:s});
          }
          /* Subscribe to tlm */
          session.subscribe(d.tlm, processTelemetryUpdate);
          /* Get tlm definitions and add this additinal info to subscriptions */
          session.getTlmDefs(d.tlm, function(tlmDef) {
            var opsPaths = [];
            /* Store in document's context */
            for(var i = 0; i < tlmDef.length; ++i) {
              if (!(tlmDef[i].opsPath in subscriptions)) {
                subscriptions[tlmDef[i].opsPath] = {};
              }
              subscriptions[tlmDef[i].opsPath].def = tlmDef[i];
              opsPaths.push(tlmDef[i].opsPath);
            }
            /* Apply definition update */
            processTelemetryDefinitionUpdate(opsPaths);
          });
      }
  }

  loadCommanding(d,s) {
  	if (d.hasOwnProperty('cmd')) {
  		var cmdObj = d.cmd;
  		var btnObj = $(s);
  		session.getCmdDef({name:cmdObj.name}, function(cmdInfo) {
  			if(cmdObj.hasOwnProperty('uuid')) {
  				/* We already bound this element. */
  			} else {
  				if(cmdObj.name == cmdInfo.name) {
  					var uuid = generateUUID();
  					cmdInfo.uuid = uuid;
  					cmdObj.uuid = uuid;
  					// btnObj.attr('data-cdr',JSON.stringify(d));
  					/*
  					 * Copy any arguments we have from the command button
  					 * into the cmdInfo struct.
  					 */
  					if(cmdObj.hasOwnProperty('argument')) {
  						for(var i = 0; i < cmdObj.argument.length; i++) {
  							for (var j = 0; j < cmdInfo.argument.length; j++) {
  								if (cmdInfo.argument[j].name == cmdObj.argument[i].name) {
  									cmdInfo.argument[j].value = cmdObj.argument[i].value;
  								}
  							}
  						}
  					}

  					if (isTemplateCommand(cmdInfo) == false) {
  						/*
  						 * This is a fully instantiated command. No need to
  						 * create a popup form. Just send the command when
  						 * the user clicks the button.
  						 */
  						var args = [];
  						if(cmdInfo.hasOwnProperty('argument')) {
  							for(var i = 0; i < cmdInfo.argument.length; i++) {
  								args.push({name: cmdInfo.argument[i].name, value:cmdInfo.argument[i].value.toString()});
  							}
  						}
  						btnObj[0].onclick = function(eventObject) {
  							session.sendCommand({ops_path:cmdInfo.name});
  						};
  					} else {
  						/*
  						 * This is not a fully instantiated command. We need
  						 * to present a popup form to allow the user to
  						 * enter the remaining command arguments before
  						 * sending the command.
  						 *
  						 * First, generate UUIDs to be used later as element
  						 * IDs.
  						 */
  						for (i = 0; i < cmdInfo.argument.length; i++) {
  							cmdInfo.argument[i].uuid = uuid + "_" + cmdInfo.argument[i].name;
  						}
  						/*
  						 * Next set stringLength for string parameters to be
  						 * used for form validation later.
  						 */
  						for (i = 0; i < cmdInfo.argument.length; i++) {
  							if (cmdInfo.argument[i].type === 'string') {
  								/*
  								 * Add a new stringLength (in bytes)
  								 * attribute for parameter validation later.
  								 */
  								cmdInfo.argument[i].stringLength = cmdOut.argument[i].bitSize / 8;
  							}
  						}

  						/* Make button fire modal */
  						btnObj.attr('data-toggle','modal');
  						btnObj.attr('data-target','#genericInputModal');
  						btnObj.attr('data-title','Submit ' + cmdInfo.name + ' Arguments');
  						btnObj.attr('data-submit','sendCmd');
  						var argArray = [];

  						for(var i in cmdInfo.argument) {
  							var label = cmdInfo.argument[i].name;
  							var type = cmdInfo.argument[i].type;
  							switch(type) {
  								case 'char': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'uint8': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'int8': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'string': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'string'
  									});
  									break;
  								}

  								case 'uint16': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'int16': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'uint32': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'int32': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'float': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'float'
  									});
  									break;
  								}

  								case 'double': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'float'
  									});
  									break;
  								}

  								case 'boolean': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'uint64': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}

  								case 'int64': {
  									/* integer action */
  									argArray.push({
  										'label':label,
  										'type':'field',
  										'dtype':'integer'
  									});
  									break;
  								}


  							}
  							btnObj.attr('data-custom', JSON.stringify(argArray));
  						}
  					}
  				}
  			}
  		});
  	}
  }

  loadPanel() {
      console.log('load panel')
      var cls = this;

      assert(this.panelElm.hasOwnProperty('element'),'this.panelElm has no prop element');
      assert(typeof this.panelElm.element === 'object','this.panelElm.element is not of type object');

      setTimeout(()=>{

          assert(this.panelElm.hasOwnProperty('config'),'this.panelElm has no prop config');
          assert(typeof this.panelElm.config === 'object','this.panelElm.config is not of type object');
          assert(this.panelElm.config.hasOwnProperty('title'),'this.panelElm.config has no prop title');
          assert(typeof this.panelElm.config.title === 'string','this.panelElm.config.title is not of type title');

          console.log('created panel : ',this.panelElm.config.title)
          this.title = this.panelElm.config.title;
          $(this.panelElm.element).find('[data-cdr]').each(function(){

              var dataObj = getJSONObj($(this).attr('data-cdr'))
              var self = this;
              var format = dataObj.indicator;
              assert(format!=undefined,'indicator format is not found');
              switch (format) {
                case 'text':
                case 'dataplot': {
                  cls.subscribeText(dataObj,self);
                  break;
                }
                case 'cmd': {
                  cls.loadCommanding(dataObj,self);
                  break;
                }
                case 'splcmd': {
                  break;
                }
              }
          });
      }, this.loadTimeout);

  }

  destroyPanelProceadure(){
      this.panelElm.on('itemDestroyed',(it)=>{

          assert(it.hasOwnProperty('origin'),'has no prop origin');
          assert(typeof it.origin === 'object','origin is not of type object');
          assert(it.origin.hasOwnProperty('config'),'has no prop config');
          assert(typeof it.origin.config === 'object','config is not of type object');
          assert(it.origin.config.hasOwnProperty('type'),'has no prop type');
          assert(typeof it.origin.config.type === 'string','type is not of type string');

          if(it.origin.config.type=='component'){
              for(var i = 0; i < this.tlm.length; ++i){
                  assert(Object.keys(subscriptions).length > 0 ,'subscriptions is empty');
                  var opsPath = this.tlm[i].name;
                  var nodeElm = this.tlm[i].nodeElm;
                  if(opsPath in subscriptions){
                      if(subscriptions[opsPath].elms.length > 0){
                          var index = subscriptions[opsPath].elms.indexOf(nodeElm)
                          if(index != -1){
                              delete dataplot_subscriptions[nodeElm.getAttribute('plot-key')]
                              subscriptions[opsPath].elms.splice(index,1);
                          }
                          else{
                              console.error('element key not fount in subscriptions array')
                          }
                          if(subscriptions[opsPath].elms.length < 1){
                              delete subscriptions[opsPath];
                              /* Unsubscribe */
                              session.unsubscribe([{name:opsPath}]);
                          }
                      }
                      else{
                          console.error('subscription is not associated with any element')
                      }
                  }
              }
              console.log('created panel : ', this.title);
              this.tlm = [];
          }
      });
  }

}



/* Event handlers */
window.addEventListener('first-layout-load-complete',()=>{
    console.log('check');
    console.log(myLayout);
    myLayout.on('tabCreated',(t)=>{
        console.log('tab')
        assert(t.hasOwnProperty('contentItem'),'has no prop contentItem');
        assert(typeof t.contentItem === 'object','contentItem is not of type object');
        assert(t.contentItem.hasOwnProperty('type'),'has no prop type');
        assert(typeof t.contentItem.type === 'string','type is not of type string');

        if(t.contentItem.type == 'component'){
            var panel = new Panel(t.contentItem);
            panel.loadPanel();
            panel.destroyPanelProceadure();
        }

    });

    myLayout.on("stateChanged",(i)=>{
      /* Handle dataplot overflow when layout resize happens */
      for (var key in dataplot_subscriptions) {
        if (dataplot_subscriptions.hasOwnProperty(key)) {
            var ug = dataplot_subscriptions[key].getUtilGraph();
            ug.resize(); ug.setupGrid(); ug.draw();
        }
      }
    });

});
