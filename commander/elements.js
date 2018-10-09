/* Useful global variables and functions */
var dataPlotElements = []
var TextSubscriptions = []
/* Custom Element Classes*/
class Text extends HTMLElement {
  constructor() {
    super();

    var self = this;
    this.textContent = "---";

    if (self.hasAttribute("data-tlm")) {
      /* TODO:subscribe */
      session.getRandomNumber(function(val) {
        self.textContent = val.toFixed(4)
      })
    } else {
      console.error("attribute, data-tlm is undefined")
    }



    myLayout.on("itemDestroyed", (i) => {

      if (i.type = "component" && cu.isDescendant(i.element[0], this)) {
        console.log("item has beeen destroyed - this section can be used as destructor")
        // console.log(this)
        // console.log(cu.isDescendant(i.element[0],this))
      }
    })
  }
}

class Button extends HTMLElement {
  constructor() {
    super();
    this.setAttribute("class", "btn btn-primary");
    this.two_step = false;
    this.step_names = null;
    this.step = 0;
    this.text = null;
    this.data = null;

    if (this.hasAttribute("data-steps")) {
      if (this.hasAttribute("data-cmd")) {
        this.step_names = $(this).data("steps")
        cu.assert(typeof this.step_names === "object")
        cu.assert(this.step_names.length === 2)
        this.textContent = this.step_names[this.step];
        this.onclick = (e) => {
          this.step = this.step + 1;
          if (this.step > this.step_names.length - 1) {
            this.step = 0
          }
          //TODO: step1 logic
          this.textContent = this.step_names[this.step];
          //TODO: step2 logic
        }
      }
    } else if (this.hasAttribute("data-text")) {
      if (this.hasAttribute("data-cmd")) {
        this.textContent = $(this).data("text");
        //TODO: send command code
      }
    }

  }

  connectedCallback() {}
  disconnectedCallback() {}
  attributeChangedCallback(name, oldValue, newValue) {}

}

class DataPlotCE extends HTMLElement {
  constructor() {
    super();
    var parsedData = []
    var self = this;
    var minPoints = 10;
    var maxPoints = 15;
    var margin = {};
    var width = 0;
    var height = 0;
    var x = null;
    var y = null;
    var xAxis = null;
    var yAxis = null;
    var valueline = null;
    var svg = null;
    var formatTime = d3.timeFormat("%M:%S:%L")
    var parseTime = d3.timeParse("%M:%S:%L")
    $(self).empty();

    myLayout.on("stateChanged", (i) => {


      var validGraphUpdate = false;
      for (var item in i.origin.contentItems) {
        if (cu.isDescendant(i.origin.contentItems[item].element[0], this)) {
          validGraphUpdate = true;
        }
      }

      if (validGraphUpdate) {
        //console.log("done")
        console.log("valid resize event if fired -  adjusting graph to acommodate new size")
        width = self.parentElement.offsetWidth - margin.left - margin.right;
        height = self.parentElement.offsetHeight - margin.top - margin.bottom;

        x = d3.scaleTime().range([0, width]);
        y = d3.scaleLinear().range([height, 0]);
        xAxis = d3.axisBottom(x).tickFormat(formatTime);
        yAxis = d3.axisLeft(y);
        d3.select(self).select("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom);
        d3.select(self).select("svg").select(".canvas")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      }


    })
    // self.addEventListener('component-resize-event',(e)=>{
    //   //console.log("ack",this,self.parentElement.offsetWidth)
    //   width = self.parentElement.offsetWidth - margin.left - margin.right;
    //   height = self.parentElement.offsetHeight - margin.top - margin.bottom;
    //   x = d3.scaleTime().range([0, width]);
    //   y = d3.scaleLinear().range([height, 0]);
    //   xAxis = d3.axisBottom(x).tickFormat(formatTime);
    //   yAxis = d3.axisLeft(y);
    //   d3.select(self).select("svg")
    //      .attr("width", width + margin.left + margin.right)
    //      .attr("height", height + margin.top + margin.bottom);
    //  d3.select(self).select("svg").select(".canvas")
    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // })

    session.getRandomNumber(function(val) {

      var date = parseTime(formatTime(new Date()));
      parsedData.push({
        x: date,
        y: val
      });

      if (parsedData.length == minPoints) {
        dataPlotElements.push(self);
        margin = {
          top: 30,
          right: 30,
          bottom: 30,
          left: 50
        };
        width = self.parentElement.offsetWidth - margin.left - margin.right;
        height = 300 - margin.top - margin.bottom;

        x = d3.scaleTime().range([0, width]);
        y = d3.scaleLinear().range([height, 0]);
        xAxis = d3.axisBottom(x).tickFormat(formatTime);;
        yAxis = d3.axisLeft(y);
        valueline = d3.line()
          .x(function(d) {
            return x(d.x);
          })
          .y(function(d) {
            return y(d.y);
          });
        svg = d3.select(self)
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("class", "canvas")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        parsedData.forEach(function(d) {
          d.x = d.x;
          d.y = +d.y;
        });
        // Scale the range of the data
        x.domain(d3.extent(parsedData, function(d) {
          return d.x;
        }));
        y.domain([0, d3.max(parsedData, function(d) {
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

      }

      if (parsedData.length > minPoints) {



        parsedData.forEach(function(d) {
          d.x = d.x;
          d.y = +d.y;
        });
        // Scale the range of the data
        x.domain(d3.extent(parsedData, function(d) {
          return d.x;
        }));
        y.domain([0, d3.max(parsedData, function(d) {
          return d.y;
        })]);
        svg.select("path") // change the line
          .attr("d", valueline(parsedData));
        svg.select(".x.axis") // change the x axis
          .call(xAxis);
        svg.select(".y.axis") // change the y axis
          .call(yAxis);

      }

      if (parsedData.length > maxPoints) {

        parsedData.shift();

      }

    });

  }
}

class Led extends HTMLElement {
  constructor() {
    super();
    this.textContent = "";
    this.divElement = null;
    var self = this;
    var divElement = document.createElement("div");
    divElement.setAttribute("class", "led-basic");
    this.appendChild(divElement)

    session.getRandom(function(val) {
      if (val) {
        divElement.setAttribute("class", "led-basic led-on");
      } else {
        divElement.setAttribute("class", "led-basic led-off");
      }
    });

  }
}

// customElements.define("cmdr-text", Text);
// customElements.define("cmdr-button", Button);
// customElements.define("cmdr-dataplot", DataPlot);
// customElements.define("cmdr-led", Led);


/* Dataplot non-functional code*/

class DataPlot {

  constructor(elm, tlmObj) {

    var parsedData = []
    var minPoints = 10;
    var maxPoints = 20;
    var margin = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 50
    };
    var width = 0;
    var height = 0;
    var x = null;
    var y = null;
    var xAxis = null;
    var yAxis = null;
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
      .x(function(d) {
        return x(d.x);
      })
      .y(function(d) {
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
    for (var i = 0; i < tlmObj.length; ++i) {
      this.paths[tlmObj[i].name] = []
    }
  }

  update(op) {
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

  eatTail() {
    for (var k in this.paths) {
      if (this.paths[k].length > this.maxPoints) {
        this.paths[k].shift();
      }
    }

  }

}




/* pop-out window functionality */

// destroyWindow(){
//
//   for(var i = 0; i < this.tlm.length; ++i){
//     cu.assert(Object.keys(subscriptions).length > 0 ,'subscriptions is empty');
//     var opsPath = this.tlm[i].name;
//     var nodeElm = this.tlm[i].nodeElm;
//     if(opsPath in subscriptions){
//       if(subscriptions[opsPath].length > 0){
//         var index = subscriptions[opsPath].indexOf(nodeElm)
//         if(index != -1){
//           subscriptions[opsPath].splice(index,1);
//         }
//         else{
//           console.error('element key not fount in subscriptions array');
//         }
//         if(subscriptions[opsPath].length < 1){
//           delete subscriptions[opsPath];
//           /* call unsubscribe function here */
//           console.log('unsubscribed --->  ',opsPath);
//         }
//       }
//       else{
//         console.error('subscription is not associated with any element');
//       }
//     }
//   }
//
//   this.tlm = [];
//   console.log('window destroyed');
//
// }


// function sendCmd(){
//   var args = {};
//   var labels = $("#genericInputModal").find('label');
//   for(var i = 0; i < labels.length ; ++i){
//     var label = labels[i].textContent;
//     var value = labels[i].control.value;
//     args[label] = value;
//   }
//   var cmdObj = JSON.parse($("#genericInputModal").attr('data-info'));
//   session.sendCommand({ops_path:cmdObj.cmd.name,args:args})
//   $("#genericInputModal").modal('hide')
// }

// myLayout.on('windowOpened',(t)=>{
//   t.element = t.getGlInstance().container[0];
//   t.config = t._config[0];
//   windows[t._parentId] = new Panel(t)
//   windows[t._parentId].loadPanel();
// });
//
// myLayout.on('windowClosed',(t)=>{
//   windows[t._parentId].destroyWindow();
//   delete windows[t._parentId]
// });
//
// myLayout.eventHub.on('modal-invoking-button-click',(d)=>{
//
//   /* preparing modal */
//   if(d.hasOwnProperty('type') && d.type=='simple'){
//     session.sendCommand(d.data);
//   }
//   else{
//     if($("#genericInputModal").attr('class')=='modal fade'){
//       $("#genericInputModal").attr('data-info',d.info);
//       $('#modalSubmit').attr('onclick',d.submit);
//       $("#genericInputModal").modal('show')
//
//       $('#modalTitle').text(d.title);
//       var selectionType = false;
//       for(var e in d.args){
//         switch (d.args[e].type.engType) {
//           case 'integer':
//
//             break;
//           case 'float':
//
//             break;
//           case 'string':
//
//             break;
//           case 'enumeration':
//             selectionType = true;
//             break;
//         }
//         if(!selectionType){
//           /* field */
//           item = "<div class='form-group'>"
//             +"<label class='col-form-label' id=labelField"+e+" for=inputField"+e+">"+d.args[e].name+"</label>"
//             +"<input class='form-control' type='text' id=inputField"+e+">"
//             +"</div>"
//           $('#modalForm').append(item);
//         }
//         else{
//           /* selection */
//           item = "<div class='form-group'>"
//             +"<label class='col-form-label' id=labelField"+e+" for=inputField"+e+">"+d.args[e].name+"</label>"
//             +"<select class='custom-select mr-sm-2'id=select"+e+">"
//             +"<option selected>Choose..</option>"
//             +"</select>"
//             +"</div>"
//           $('#modalForm').append(item)
//         }
//       }
//     }else{
//       console.error('Command submission in progress. handle previous commands before submitting new one');
//     }
//   }
//
//
//
//
// });
