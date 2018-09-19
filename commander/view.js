function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

function genRandomKey(){
  return Math.random().toString(36).slice(2)
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

var subscriptions = {};
var windows = {};

function processTelemetryUpdate(param){
  console.log(param)
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
