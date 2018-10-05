
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


/* View generation */
function processTelemetryUpdate(param) {   
    var sample = param.sample[param.sample.length - 1];
    var value = sample.value;
    var opsPath = param.opsPath;
    if(opsPath in subscriptions){
        for(var i = 0; i < subscriptions[opsPath].length; ++i){
            var nodeElm = subscriptions[opsPath][i];
            if(nodeElm.getAttribute('data-format')=='text'){
                /* Handle simple text subscriptions */
                nodeElm.textContent = value.toFixed(3);

            }
            else if(nodeElm.getAttribute('data-format')=='led'){
              /* Handle boolean led type subscriptions */
              if(value>=0.5){
                  nodeElm.setAttribute('class','led-basic led-on')
              }else{
                  nodeElm.setAttribute('class','led-basic led-off')
              }

            }else if (nodeElm.getAttribute('data-format')=='dataplot') {
              /* Handle dataplot subscriptions */
              if(nodeElm.getAttribute('plot-initialized')===undefined
                ||nodeElm.getAttribute('plot-initialized')===null
               ||nodeElm.getAttribute('plot-initialized')===false){
                /* Upon seeing dataplot canvas we initialize canvas after
                which will keep adding data to initialized canvas */
                var tlm = nodeElm.getAttribute('data-commander');

                if (typeof tlm === 'string' || tlm instanceof String) {
  	                // it's a string
  	                tlmObj = JSON.parse(tlm);
  	            }
  	            else if (typeof tlm === 'object' || tlm instanceof Object) {
  	                // it's an object
  	                tlmObj = tlm;
  	            }
  	            else {
  	                // it's something else
  	                console.error('unknown data')
  	            }

                var dataPlotDef = {};
                dataPlotDef['data'] = [];
                dataPlotDef['options'] = {};

                if(tlmObj.hasOwnProperty('tlm')){
                  assert(tlmObj.hasOwnProperty('color'),'color array doesnot exist');
                  assert(tlmObj.hasOwnProperty('label'),'label array doesnot exist');
                  assert(tlmObj.tlm.length===tlmObj.color.length,'tlm and color arrays have different lengths');
                  assert(tlmObj.label.length===tlmObj.color.length,'label and color arrays have different lengths');
                  assert(tlmObj.tlm.length > 0 && tlmObj.color.length > 0,'tlm and color arrays are empty');
                  assert(tlmObj.label.length > 0,'tlm and color arrays are empty');
                  for(var i = 0; i < tlmObj.tlm.length; i++){

                    dataPlotDef['data'].push({
                      'tlm':{name:tlmObj.tlm[i].name},
                      'label':tlmObj.label[i],
                      'color':tlmObj.color[i]
                    });

                  }

                  var generatedKey = genRandomKey();
                  while (generatedKey in dataplot_subscriptions){
                    generatedKey = genRandomKey();
                  }
                  nodeElm.setAttribute('plot-key',generatedKey);
                  dataplot_subscriptions[generatedKey] = new CmdrTimeSeriesDataplot(nodeElm, dataPlotDef)

                }
                 nodeElm.setAttribute('plot-initialized',true);
               }
               else{
                 dataplot_subscriptions[nodeElm.getAttribute('plot-key')].addData(param);
               }

            }
        }
    }
}

function processTelemetryLedUpdate(param){
    var sample = param.sample[param.sample.length - 1];
    var value = sample.value >= 0.5;

    var opsPath = param.opsPath;
    if(opsPath in subscriptions){
        for(var i = 0; i < subscriptions[opsPath].length; ++i){
            var nodeElm = subscriptions[opsPath][i];
            if(nodeElm.getAttribute('data-format')=='led'){
                if(value){
                    nodeElm.setAttribute('class','led-basic led-on')
                }else{
                    nodeElm.setAttribute('class','led-basic led-off')
                }
            }
        }
    }
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

    subscribeText(d,s){
        if (d.hasOwnProperty('tlm')) {
            for(var i = 0; i < d.tlm.length; ++i){
                var obj = d.tlm[i];
                if(obj.name in subscriptions){
                    subscriptions[obj.name].push(s);
                }
                else{
                    subscriptions[obj.name] = [s];
                    /* Subscribe */
                    //session.getTlmDefs(d.tlm, function(tlmDef) {
                    //    console.log(tlmDef);
                    //});
                    session.subscribe(d.tlm, processTelemetryUpdate);
                }
                this.tlm.push({name:obj.name, nodeElm:s});
            }
        }
    }

    subscribeLed(d,s){
        if (d.hasOwnProperty('tlm')) {
            for(var i = 0; i < d.tlm.length; ++i){
                var obj = d.tlm[i];
                if(obj.name in subscriptions){
                    subscriptions[obj.name].push(s);
                }
                else{
                    subscriptions[obj.name] = [s];
                    /* Subscribe */
                    session.subscribe(d.tlm, processTelemetryLedUpdate);
                }
                this.tlm.push({name:obj.name, nodeElm:s});
            }
        }
    }

    subscribeDataplot(d,s){
        if (d.hasOwnProperty('tlm')) {

            var dataPlotDef = {};
            dataPlotDef['data'] = [];
            dataPlotDef['options'] = {};

            for(var i = 0; i < d.tlm.length; ++i){
                var obj = d.tlm[i];
                if(obj.name in subscriptions){
                  subscriptions[obj.name].push(s);
                }
                else{
                    subscriptions[obj.name] = [s];

                }

                dataPlotDef['data'].push({
                  'tlm':{name:obj.name},
                  'label':obj.name,
                  'color':obj.color
                });
                this.tlm.push({name:obj.name, nodeElm:s});
            }
            var dataplot = new CmdrTimeSeriesDataplot(s, dataPlotDef);
            /* Subscribe */
            session.subscribe(dataplot.getTlmObj, dataplot.addData);
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
						// btnObj.attr('data-commander',JSON.stringify(d));
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

//									case 'int64': {
//										/* enumeration action */
//										argArray.push({
//											'label':label,
//											'type':'select',
//											'dtype':type,
//											'getItem':cmdOut.argument[i].type.enumValue
//										})
//									}
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

	        $(this.panelElm.element).find('[data-commander]').each(function(){

	            var format = $(this).attr('data-format');
	            var data = $(this).attr('data-commander');
	            var dataObj;
	            var self = this;

	            assert(format!=undefined,'data-format attribute is not found');

	            if (typeof data === 'string' || data instanceof String) {
	                // it's a string
	                dataObj = JSON.parse(data);
	            }
	            else if (typeof data === 'object' || data instanceof Object) {
	                // it's an object
	                dataObj = data;
	            }
	            else {
	                // it's something else
	                console.error('unknown data')
	            }
              if( format == 'text' || format == 'led' || format == 'dataplot'){
                cls.subscribeText(dataObj,self)
              }
              else if(format == 'cmd'){
                cls.loadCommanding(dataObj,self);
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
	                    if(subscriptions[opsPath].length > 0){
	                        var index = subscriptions[opsPath].indexOf(nodeElm)
	                        if(index != -1){
                              delete dataplot_subscriptions[nodeElm.getAttribute('plot-key')]
	                            subscriptions[opsPath].splice(index,1);
	                        }
	                        else{
	                            console.error('element key not fount in subscriptions array')
	                        }
	                        if(subscriptions[opsPath].length < 1){
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

    myLayout.on('tabCreated',(t)=>{

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
