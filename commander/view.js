var subscriptions = {};
var windows = {};

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
    d += performance.now(); //use high-precision timer if available
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

function processTelemetryUpdate(param){
  // console.log(param)
  var value = param.val;
  var opsPath = param.opsPath;
  // console.log(param)
  if(opsPath in subscriptions){
    for(var i = 0; i < subscriptions[opsPath].length; ++i){
      var nodeElm = subscriptions[opsPath][i];
      if(nodeElm.getAttribute('data-format')=='text'){
        nodeElm.textContent = value.toFixed(3);
      }
    }
  }
}

function processTelemetryLedUpdate(param){
  // console.log(param.val)
  var value = param.val>=0.5;
  var opsPath = param.opsPath;
  // console.log(param)
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
  console.log(cmdObj)
  console.log('sendCommand',{ops_path:cmdObj.cmd.name,args:args})
  session.sendCommand({ops_path:cmdObj.cmd.name,args:args})

}

class DataPlot{

  constructor(elm,tlmObj){

    var parsedData = []
    var minPoints = 10;
    var maxPoints = 20;
    var margin = { top: 30, right: 30, bottom: 30, left: 50 };
    var width = 0;
    var height = 0;
    var x = null;
    var y = null;
    var xAxis = null;
    var yAxis =null;
    var valueline = null;
    var svg = null;
    var formatTime = d3.timeFormat("%M:%S:%L")
    var parseTime = d3.timeParse("%M:%S:%L")
    $(elm).empty();

    width = elm.parentElement.offsetWidth - margin.left - margin.right;
    height = 300 - margin.top - margin.bottom;
    svg = d3.select(elm)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("class", "canvas")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    x = d3.scaleTime().range([0, width]);
    y = d3.scaleLinear().range([height, 0]);
    xAxis = d3.axisBottom(x).tickFormat(formatTime);
    yAxis = d3.axisLeft(y);
    valueline = d3.line()
        .x(function (d) {
          return x(d.x);
        })
        .y(function (d) {
          return y(d.y);
        });
    this.elm = elm;
    this.minPoints = minPoints;
    this.maxPoints = maxPoints;
    this.parsedData = parsedData;
    this.parseTime = parseTime;
    this.formatTime = formatTime;
    this.x = x;
    this.y = y;
    this.valueline = valueline;
    this.svg = svg;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.width = width;
    this.height = height;
    this.margin = margin;
    this.paths = {};
    for(var i = 0; i < tlmObj.length; ++i){
      this.paths[tlmObj[i].name] = []
    }
  }

  update(op){
    this.paths[op.opsPath].push({
      t: this.parseTime(this.formatTime(new Date())),
      v: op.val
    })

    // var date = this.parseTime(this.formatTime(new Date()));
    // this.parsedData.push({
    //   x: date,
    //   y: val.val,
    //   z: val.opsPath
    // });
    // this.parsedData.forEach(function (d) {
    //     d.x = d.x;
    //     d.y = +d.y;
    // });
    // this.x.domain(d3.extent(this.parsedData, function (d) {
    //     return d.x;
    //     }));
    // this.y.domain([0, d3.max(this.parsedData, function (d) {
    //     return d.y;
    //     })]);
    // var dataNest  = d3.nest()
    //   .key(function(d){return d.z;})
    //   .entries(this.parsedData);
    //
    // var color = d3.scaleOrdinal(d3.schemeCategory10);
    // var self = this;
    // console.log(dataNest);
    // dataNest.forEach(function(d){
    //   self.svg.append('path')
    //     .attr('class','line')
    //     .style('stroke',function(){
    //       return d.color = color(d.key);
    //     })
    //     .attr('d',self.valueline(self.parsedData))
    // });
    //
    // this.svg.append("g") // Add the X Axis
    //     .attr("class", "x axis")
    //     .attr("transform", "translate(0," + this.height + ")")
    //     .call(this.xAxis);
    // this.svg.append("g") // Add the Y Axis
    //     .attr("class", "y axis")
    //     .call(this.yAxis);
    //
    // console.log(this);
    // console.log(this.parsedData);
    console.log(this.paths)
  }

  eatTail(){
    for(var k in this.paths){
      if(this.paths[k].length > this.maxPoints){
        this.paths[k].shift();
      }
    }

  }

}

class Panel {

  constructor(panelElm){

      this.panelElm = panelElm;
      this.title = 'Unknown'
      this.loadTimeout = 500; /* ms */
      this.tlm = [];

  }

  subscribeText(f,d,s){
      var jsonObj;
      if (typeof d === 'string' || d instanceof String) {
        // it's a string
        jsonObj = JSON.parse(d);
      }
      else if (typeof d === 'object' || d instanceof Object) {
        // it's an object
        jsonObj = d;
      }
      else {
        // it's something else
        return;
      }

      if (jsonObj.hasOwnProperty('tlm')) {
        for(var i = 0; i < jsonObj.tlm.length; ++i){
          var obj = jsonObj.tlm[i];
          if(obj.name in subscriptions){
            subscriptions[obj.name].push(s);
          }
          else{
            subscriptions[obj.name] = [s];
            /* call subscribe function here */
            session.subscribe(jsonObj.tlm, processTelemetryUpdate);
          }
          this.tlm.push({name:obj.name, nodeElm:s});
        }
      }

  }

  subscribeLed(f,d,s){
    var jsonObj;
    if (typeof d === 'string' || d instanceof String) {
      // it's a string
      jsonObj = JSON.parse(d);
    }
    else if (typeof d === 'object' || d instanceof Object) {
      // it's an object
      jsonObj = d;
    }
    else {
      // it's something else
      return;
    }

    if (jsonObj.hasOwnProperty('tlm')) {
      for(var i = 0; i < jsonObj.tlm.length; ++i){
        var obj = jsonObj.tlm[i];
        if(obj.name in subscriptions){
          subscriptions[obj.name].push(s);
        }
        else{
          subscriptions[obj.name] = [s];
          /* call subscribe function here */
          session.subscribe(jsonObj.tlm, processTelemetryLedUpdate);
        }
        this.tlm.push({name:obj.name, nodeElm:s});
      }
    }
  }

  subscribeDataplot(f,d,s){
    var jsonObj;
    if (typeof d === 'string' || d instanceof String) {
      // it's a string
      jsonObj = JSON.parse(d);
    }
    else if (typeof d === 'object' || d instanceof Object) {
      // it's an object
      jsonObj = d;
    }
    else {
      // it's something else
      return;
    }

    if (jsonObj.hasOwnProperty('tlm')) {
      var plot = new DataPlot(s,jsonObj.tlm);
      for(var i = 0; i < jsonObj.tlm.length; ++i){
        var obj = jsonObj.tlm[i];
        if(obj.name in subscriptions){
          subscriptions[obj.name].push(s);
        }
        else{
          subscriptions[obj.name] = [s];
          /* call subscribe function here */
          session.subscribe(jsonObj.tlm, (val)=>{
            plot.update(val);
            plot.eatTail();
          });
        }
        this.tlm.push({name:obj.name, nodeElm:s});
      }
    }
  }

  getCmdInfo(f,d,s){
    var jsonObj;
    if (typeof d === 'string' || d instanceof String) {
      // it's a string
      jsonObj = JSON.parse(d);
    }
    else if (typeof d === 'object' || d instanceof Object) {
      // it's an object
      jsonObj = d;
    }
    else {
      // it's something else
      return;
    }

    if (jsonObj.hasOwnProperty('cmd')) {
      var cmdObj = jsonObj.cmd;
      var btnObj = $(s);
      session.getCmdDefs({name:cmdObj.name},function(cmdInfo){
        if(cmdObj.hasOwnProperty('uuid')){
          /* We already bound this element. */
        } else {
          if(cmdObj.name == cmdInfo.qualifiedName){
               var uuid = generateUUID();
               cmdInfo.uuid = uuid;
               cmdObj.uuid = uuid;
               btnObj.attr('data-commander',JSON.stringify(jsonObj));
               /* Copy any arguments we have from the command button into the cmdInfo struct. */
               if(cmdObj.hasOwnProperty('argument')){
                 for(var i = 0; i < cmdObj.argument.length; i++){
                   for (var j = 0; j < cmdInfo.arfument.length; j++){
                     if (cmdInfo.argument[j].name == cmdObj.argument[i].name) {
                       cmdInfo.argument[j].value = cmdObj.argument[i].value;
                     }
                   }
                 }
               }
               var cmdOut = JSON.parse(JSON.stringify(cmdInfo));
               if (isTemplateCommand(cmdOut) == false) {
                 /* This is a fully instantiated command.  No need to
                  * create a popup form.  Just send the command when
                  * the user clicks the button. */
                  btnObj.click(function(eventObject){
                    var args = [];
                    if(cmdOut.hasOwnProperty('argument')){
                      for(var i = 0; i < cmdOut.argument.length; i++){
                        args.push({name: cmdOut.argument[i].name,value:cmdOut.argument[i].value.toString()});
                      }
                    }
                    // console.log({name:cmdOut.qualifiedName,args:args});
                    session.sendCommand({ops_path:cmdOut.qualifiedName});
                  });

               }else{
                 /* This is not a fully instantiated command.  We need to
                  * present a popup form to allow the user to enter the
                  * remaining command arguments before sending the command.
                  *
                  * First, generate UUIDs to be used later as element IDs. */
                  for (i = 0; i < cmdOut.argument.length; i++) {
                    cmdOut.argument[i].uuid = uuid + "_" + cmdOut.argument[i].name;
                  }
                  /* Next set stringLength for string parameters to be used for form validation later. */
                  for (i = 0; i < cmdOut.argument.length; i++) {
                    if (cmdOut.argument[i].type == "STRING") {
                      /* Add a new stringLength (in bytes) attribute for parameter validation later. */
                      cmdOut.argument[i].stringLength = cmdOut.argument[i].type.dataEncoding.sizeInBits / 8;
                    }
                  }
                  console.log('***>',cmdOut,btnObj);
                  /* Make button fire modal */
                  btnObj.attr('data-toggle','modal');
                  btnObj.attr('data-target','#genericInputModal');
                  btnObj.attr('data-title','Submit '+cmdOut.name+' Arguments');
                  btnObj.attr('data-submit','sendCmd');
                  var argArray = [];
                  for(var i in cmdOut.argument){
                    var label = cmdOut.argument[i].name
                    var type = cmdOut.argument[i].type.engType
                    if(type == 'integer'){
                      /* integer action */
                    }
                    else if(type == 'float'){
                      /* float action */
                    }
                    else if(type == 'string'){
                      /* string action */
                    }
                    else if(type == 'enumeration'){
                      /* enumeration action */
                    }
                    argArray.push({
                      'label':label,
                      'type':'field'
                    })
                  }
                  btnObj.attr('data-custom',JSON.stringify(argArray));


               }
             }
        }
        console.log(cmdInfo)
      });
    }
  }

  loadPanel(){

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
        var self = this;
        assert(format!=undefined,'data-format attribute is not found');
        switch(format){
          case 'text':
            cls.subscribeText(format,data,self)
            break;
          case 'led':
            cls.subscribeLed(format,data,self)
            break;
          case 'dataplot':
            cls.subscribeDataplot(format,data,self)
            break;
          case 'cmd':
            cls.getCmdInfo(format,data,self);
            break;
        }
      });
    },this.loadTimeout);

  }

  destroyPanel(){
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
                subscriptions[opsPath].splice(index,1);
              }
              else{
                console.error('element key not fount in subscriptions array')
              }
              if(subscriptions[opsPath].length < 1){
                delete subscriptions[opsPath];
                /* call unsubscribe function here */
                session.unsubscribe([{name:opsPath}]);
                // console.log('unsubscribed --->  ',opsPath);
              }
            }
            else{
              console.error('subscription is not associated with any element')
            }
          }
        }
        console.log('tab destroyed');
        this.tlm = [];
      }
    });
  }

  destroyWindow(){

    for(var i = 0; i < this.tlm.length; ++i){
      assert(Object.keys(subscriptions).length > 0 ,'subscriptions is empty');
      var opsPath = this.tlm[i].name;
      var nodeElm = this.tlm[i].nodeElm;
      if(opsPath in subscriptions){
        if(subscriptions[opsPath].length > 0){
          var index = subscriptions[opsPath].indexOf(nodeElm)
          if(index != -1){
            subscriptions[opsPath].splice(index,1);
          }
          else{
            console.error('element key not fount in subscriptions array');
          }
          if(subscriptions[opsPath].length < 1){
            delete subscriptions[opsPath];
            /* call unsubscribe function here */
            console.log('unsubscribed --->  ',opsPath);
          }
        }
        else{
          console.error('subscription is not associated with any element');
        }
      }
    }

    this.tlm = [];
    console.log('window destroyed');

  }

}

window.addEventListener('first-layout-load-complete',()=>{

  myLayout.on('tabCreated',(t)=>{

    assert(t.hasOwnProperty('contentItem'),'has no prop contentItem');
    assert(typeof t.contentItem === 'object','contentItem is not of type object');
    assert(t.contentItem.hasOwnProperty('type'),'has no prop type');
    assert(typeof t.contentItem.type === 'string','type is not of type string');

    if(t.contentItem.type == 'component'){
      var panel = new Panel(t.contentItem);
      panel.loadPanel();
      panel.destroyPanel();
    }

  });

  myLayout.on('windowOpened',(t)=>{
    t.element = t.getGlInstance().container[0];
    t.config = t._config[0];
    windows[t._parentId] = new Panel(t)
    windows[t._parentId].loadPanel();
  });

  myLayout.on('windowClosed',(t)=>{
    windows[t._parentId].destroyWindow();
    delete windows[t._parentId]
  });

});
