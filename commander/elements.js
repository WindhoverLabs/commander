/* Useful global variables and functions */
// var dataPlotElements = []
// var TextSubscriptions = []
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

var PageKeyCollection = []
function genUniqueKey(){
  var k = Math.random().toString(36).slice(2);
  while(PageKeyCollection.indexOf(k) > -1){
    k = Math.random().toString(36).slice(2);
  }
  return k
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

/* Custom Element Classes*/
// class Text extends HTMLElement{
//   constructor(){
//     super();
//
//     var self = this;
//     this.textContent = "---";
//
//     if(self.hasAttribute("data-tlm")){
//       /* TODO:subscribe */
//       session.getRandomNumber(function (val) {
//         self.textContent = val.toFixed(4)
//       })
//     }
//     else{
//       console.error("attribute, data-tlm is undefined")
//     }
//
//
//
//     myLayout.on("itemDestroyed",(i)=>{
//
//       if(i.type="component" && isDescendant(i.element[0],this)){
//         console.log("item has beeen destroyed - this section can be used as destructor")
//         // console.log(this)
//         // console.log(isDescendant(i.element[0],this))
//       }
//     })
//   }
// }
//
// class Button extends HTMLElement{
//   constructor(){
//     super();
//     this.setAttribute("class","btn btn-primary");
//     this.two_step = false;
//     this.step_names = null;
//     this.step = 0;
//     this.text = null;
//     this.data = null;
//
//     if(this.hasAttribute("data-steps")){
//         if(this.hasAttribute("data-cmd")){
//           this.step_names = $(this).data("steps")
//           assert(typeof this.step_names ==="object")
//           assert(this.step_names.length === 2)
//           this.textContent = this.step_names[this.step];
//           this.onclick = (e)=>{
//             this.step = this.step + 1;
//             if(this.step > this.step_names.length-1){
//               this.step = 0
//             }
//             //TODO: step1 logic
//             this.textContent = this.step_names[this.step];
//             //TODO: step2 logic
//           }
//         }
//     }
//     else if(this.hasAttribute("data-text")){
//       if(this.hasAttribute("data-cmd")){
//         this.textContent = $(this).data("text");
//         //TODO: send command code
//       }
//     }
//
//   }
//
//   connectedCallback(){}
//   disconnectedCallback() {}
//   attributeChangedCallback(name, oldValue, newValue) {}
//
// }
//
// class DataPlot extends HTMLElement{
//   constructor(){
//     super();
//     var parsedData = []
//     var self = this;
//     var minPoints = 10;
//     var maxPoints = 15;
//     var margin = {};
//     var width = 0;
//     var height = 0;
//     var x = null;
//     var y = null;
//     var xAxis = null;
//     var yAxis =null;
//     var valueline = null;
//     var svg = null;
//     var formatTime = d3.timeFormat("%M:%S:%L")
//     var parseTime = d3.timeParse("%M:%S:%L")
//     $(self).empty();
//
//     myLayout.on("stateChanged",(i)=>{
//
//
//         var validGraphUpdate = false;
//         for(var item in i.origin.contentItems){
//           if(isDescendant(i.origin.contentItems[item].element[0],this)){
//             validGraphUpdate = true;
//           }
//         }
//
//         if(validGraphUpdate){
//           //console.log("done")
//           console.log("valid resize event if fired -  adjusting graph to acommodate new size")
//           width = self.parentElement.offsetWidth - margin.left - margin.right;
//           height = self.parentElement.offsetHeight - margin.top - margin.bottom;
//
//           x = d3.scaleTime().range([0, width]);
//           y = d3.scaleLinear().range([height, 0]);
//           xAxis = d3.axisBottom(x).tickFormat(formatTime);
//           yAxis = d3.axisLeft(y);
//           d3.select(self).select("svg")
//              .attr("width", width + margin.left + margin.right)
//              .attr("height", height + margin.top + margin.bottom);
//           d3.select(self).select("svg").select(".canvas")
//              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//         }
//
//
//     })
//     // self.addEventListener('component-resize-event',(e)=>{
//     //   //console.log("ack",this,self.parentElement.offsetWidth)
//     //   width = self.parentElement.offsetWidth - margin.left - margin.right;
//     //   height = self.parentElement.offsetHeight - margin.top - margin.bottom;
//     //   x = d3.scaleTime().range([0, width]);
//     //   y = d3.scaleLinear().range([height, 0]);
//     //   xAxis = d3.axisBottom(x).tickFormat(formatTime);
//     //   yAxis = d3.axisLeft(y);
//     //   d3.select(self).select("svg")
//     //      .attr("width", width + margin.left + margin.right)
//     //      .attr("height", height + margin.top + margin.bottom);
//     //  d3.select(self).select("svg").select(".canvas")
//     //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//     // })
//
//     session.getRandomNumber(function (val) {
//
//       var date = parseTime(formatTime(new Date()));
//       parsedData.push({
//         x: date,
//         y: val
//       });
//
//       if(parsedData.length == minPoints){
//         dataPlotElements.push(self);
//         margin = { top: 30, right: 30, bottom: 30, left: 50 };
//         width = self.parentElement.offsetWidth - margin.left - margin.right;
//         height = 300 - margin.top - margin.bottom;
//
//         x = d3.scaleTime().range([0, width]);
//         y = d3.scaleLinear().range([height, 0]);
//         xAxis = d3.axisBottom(x).tickFormat(formatTime);;
//         yAxis = d3.axisLeft(y);
//         valueline = d3.line()
//             .x(function (d) {
//               return x(d.x);
//             })
//             .y(function (d) {
//               return y(d.y);
//             });
//         svg = d3.select(self)
//             .append("svg")
//             .attr("width", width + margin.left + margin.right)
//             .attr("height", height + margin.top + margin.bottom)
//             .append("g")
//             .attr("class", "canvas")
//             .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//         parsedData.forEach(function (d) {
//             d.x = d.x;
//             d.y = +d.y;
//         });
//         // Scale the range of the data
//         x.domain(d3.extent(parsedData, function (d) {
//             return d.x;
//             }));
//         y.domain([0, d3.max(parsedData, function (d) {
//             return d.y;
//             })]);
//         svg.append("path") // Add the valueline path.
//             .attr("d", valueline(parsedData));
//         svg.append("g") // Add the X Axis
//             .attr("class", "x axis")
//             .attr("transform", "translate(0," + height + ")")
//             .call(xAxis);
//         svg.append("g") // Add the Y Axis
//             .attr("class", "y axis")
//             .call(yAxis);
//
//       }
//
//       if(parsedData.length > minPoints){
//
//
//
//         parsedData.forEach(function (d) {
//             d.x = d.x;
//             d.y = +d.y;
//         });
//         // Scale the range of the data
//         x.domain(d3.extent(parsedData, function (d) {
//             return d.x;
//             }));
//         y.domain([0, d3.max(parsedData, function (d) {
//             return d.y;
//             })]);
//         svg.select("path")   // change the line
//             .attr("d", valueline(parsedData));
//         svg.select(".x.axis") // change the x axis
//             .call(xAxis);
//         svg.select(".y.axis") // change the y axis
//             .call(yAxis);
//
//       }
//
//       if(parsedData.length > maxPoints){
//
//         parsedData.shift();
//
//       }
//
//     });
//
//   }
// }
//
// class Led extends HTMLElement{
//   constructor(){
//     super();
//     this.textContent = "";
//     this.divElement = null;
//     var self = this;
//     var divElement = document.createElement("div");
//     divElement.setAttribute("class","led-basic");
//     this.appendChild(divElement)
//
//     session.getRandom(function (val) {
//       if(val){
//         divElement.setAttribute("class","led-basic led-on");
//       }
//       else{
//         divElement.setAttribute("class","led-basic led-off");
//       }
//     });
//
//   }
// }

// customElements.define("cmdr-text", Text);
// customElements.define("cmdr-button", Button);
// customElements.define("cmdr-dataplot", DataPlot);
// customElements.define("cmdr-led", Led);

// window.addEventListener('layout-from-config-load-complete',()=>{
//
//   var result = [];
//   var unVisited = []
//   var leafTypes = ['stack','tab'];
//   var root = myLayout.root
//
//   unVisited.push(root);
//
//   while(unVisited.length > 0){
//
//     var node = unVisited.pop();
//
//     if(leafTypes.indexOf(node.type) >= 0){
//       result.push(node);
//     }
//     else if(node.hasOwnProperty('contentItems')){
//       for(var i = 0; i < node.contentItems.length; i++){
//         unVisited.push(node.contentItems[i])
//       }
//     }
//   }
//
//   result.forEach((e)=>{
//     console.log(e)
//     assert(e.hasOwnProperty('contentItems'),'has no prop contentItems');
//     assert(typeof e.contentItems === 'object','contentItems is not of type object');
//     assert(e.contentItems.length === 1,'contentItems is not of valid length');
//     assert(e.contentItems[0].hasOwnProperty('type'),'has no prop type');
//     assert(typeof e.contentItems[0].type === 'string','type is not of type string');
//
//     if(e.contentItems[0].type == 'component'){
//       LoadPanel(e.contentItems[0]);
//     }
//
//   })
// });
var subscriptions = {};
var windows = {};

function processTelemetryUpdate(param){

  var value = param.val;
  var opsPath = param.opsPath;
  // console.log(param)
  if(opsPath in subscriptions){
    for(var i = 0; i < subscriptions[opsPath].length; ++i){
      var nodeElm = subscriptions[opsPath][i];
      nodeElm.textContent = value.toFixed(3);
    }
  }
}

class DataPlot{

  constructor(elm,lines){
    var parsedData = []
    var minPoints = 10;
    var maxPoints = 15;
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
    var elm = elm;
    $(elm).empty();
    var self = this;

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
    var date = parseTime(formatTime(new Date()));
    // parsedData.push({
    //   date: date,
    //   value: 0
    // });
    // parsedData.forEach(function (d) {
    //     d.date = d.date;
    //     d.value = +d.value;
    // });
    // Scale the range of the data
    x.domain(d3.extent(parsedData, function (d) {
        return d.x;
        }));
    y.domain([0, d3.max(parsedData, function (d) {
        return d.y;
        })]);
    svg.append("path") // Add the valueline path.
        .attr("d", valueline(parsedData));
    svg.append("g") // Add the X Axis
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
    svg.append("g") // Add the Y Axis
        .attr("class", "y axis")
        .call(yAxis);
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
    this.lines = lines;
    this.paths = {}

  }

  update(val){
    console.log(val);
    //TODO: Multi line plot
    // if(!val.opsPath in this.paths){
    //
    // }
    var date = this.parseTime(this.formatTime(new Date()));
    this.parsedData.push({
      x: date,
      y: val
    });
    this.parsedData.forEach(function (d) {
        d.x = d.x;
        d.y = +d.y;
    });
    // Scale the range of the data
    this.x.domain(d3.extent(this.parsedData, function (d) {
        return d.x;
        }));
    this.y.domain([0, d3.max(this.parsedData, function (d) {
        return d.y;
        })]);
    this.svg.select("path")   // change the line
        .attr("d", this.valueline(this.parsedData));
    this.svg.select(".x.axis") // change the x axis
        .call(this.xAxis);
    this.svg.select(".y.axis") // change the y axis
        .call(this.yAxis);
  }

  eatTail(){
    if(this.parsedData.length > this.maxPoints){
      this.parsedData.shift();
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

  subscribeLed(){}

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
      var plot = new DataPlot(s,jsonObj.tlm.length);
      for(var i = 0; i < jsonObj.tlm.length; ++i){
        var obj = jsonObj.tlm[i];
        if(obj.name in subscriptions){
          subscriptions[obj.name].push(s);
        }
        else{
          subscriptions[obj.name] = [s];
          /* call subscribe function here */

          session.subscribe(jsonObj.tlm, (val)=>{
            var d = (val.val/(5*Math.random()));
            plot.update(val);
            plot.eatTail();
          });
        }
        this.tlm.push({name:obj.name, nodeElm:s});
      }
    }

    // session.getRandom(function (val) {
    //
    // });
    // console.log(plot)


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
                console.log('unsubscribed --->  ',opsPath);
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
