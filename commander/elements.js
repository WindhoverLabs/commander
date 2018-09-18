/* Useful global variables and functions */
// var dataPlotElements = []
// var TextSubscriptions = []
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
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



function processTelemetryUpdate(param,elm){
  elm.textContent = param.val.toFixed(4);
  //console.log(param);

}



function LoadPanel(item){

  var panelObj = {};
  panelObj.subscriptions = [];
  assert(item.hasOwnProperty('element'),'has no prop element');
  assert(typeof item.element === 'object','element is not of type object');

  setTimeout(()=>{

    /* Construct panel functionality */
    assert(item.hasOwnProperty('config'),'has no prop config');
    assert(typeof item.config === 'object','config is not of type object');
    assert(item.config.hasOwnProperty('title'),'has no prop title');
    assert(typeof item.config.title === 'string','title is not of type title');

    console.log('created panel : ',item.config.title)
    panelObj.title = item.config.title;


    $(item.element).find('[data-sage]').each(function(){

      var obj = $(this).attr('data-sage');
      var jsonObj;
      var self = this;

      if (typeof obj === 'string' || obj instanceof String) {
        // it's a string
        jsonObj = JSON.parse(obj);
      }
      else if (typeof obj === 'object' || obj instanceof Object) {
        // it's an object
        jsonObj = obj;
      }
      else {
        // it's something else
        return;
      }

      if (jsonObj.hasOwnProperty('tlm')) {
        /* sending in the element (self) aswell */
        session.subscribe(jsonObj, self, processTelemetryUpdate);
        panelObj.subscriptions.push(jsonObj);
      }
    });

    console.log(panelObj)

    /* Destroy panel functionality */
    item.on('itemDestroyed',(it)=>{

      assert(it.hasOwnProperty('origin'),'has no prop origin');
      assert(typeof it.origin === 'object','origin is not of type object');
      assert(it.origin.hasOwnProperty('config'),'has no prop config');
      assert(typeof it.origin.config === 'object','config is not of type object');
      assert(it.origin.config.hasOwnProperty('type'),'has no prop type');
      assert(typeof it.origin.config.type === 'string','type is not of type string');

      if(it.origin.config.type=='component'){
        panelObj.subscriptions.forEach((e)=>{
          console.log('unsubscribed --->  ',e);
        });
        panelObj.subscriptions = [];
      }

    });
  },500);

}

window.addEventListener('first-layout-load-complete',()=>{

  myLayout.on('tabCreated',(t)=>{

    assert(t.hasOwnProperty('contentItem'),'has no prop contentItem');
    assert(typeof t.contentItem === 'object','contentItem is not of type object');
    assert(t.contentItem.hasOwnProperty('type'),'has no prop type');
    assert(typeof t.contentItem.type === 'string','type is not of type string');

    if(t.contentItem.type == 'component'){
      LoadPanel(t.contentItem);
    }
  });

});
