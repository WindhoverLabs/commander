/* Useful global variables and functions */
var dataPlotElements = []
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
class Text extends HTMLElement{
  constructor(){
    super();
    var self = this;
    this.textContent = "---";

    if(self.hasAttribute("data-tlm")){
      /* TODO:subscribe */
      session.getRandomNumber(function (val) {
        self.textContent = val.toFixed(4)
      })
    }
    else{
      console.error("attribute, data-tlm is undefined")
    }
  }
}

class Button extends HTMLElement{
  constructor(){
    super();
    this.setAttribute("class","btn btn-primary");
    this.two_step = false;
    this.step_names = null;
    this.step = 0;
    this.text = null;
    this.data = null;

    if(this.hasAttribute("data-steps")){
        if(this.hasAttribute("data-cmd")){
          this.step_names = $(this).data("steps")
          assert(typeof this.step_names ==="object")
          assert(this.step_names.length === 2)
          this.textContent = this.step_names[this.step];
          this.onclick = (e)=>{
            this.step = this.step + 1;
            if(this.step > this.step_names.length-1){
              this.step = 0
            }
            //TODO: step1 logic
            this.textContent = this.step_names[this.step];
            //TODO: step2 logic
          }
        }
    }
    else if(this.hasAttribute("data-text")){
      if(this.hasAttribute("data-cmd")){
        this.textContent = $(this).data("text");
        //TODO: send command code
      }
    }

  }

  connectedCallback(){}
  disconnectedCallback() {}
  attributeChangedCallback(name, oldValue, newValue) {}

}

class DataPlot extends HTMLElement{
  constructor(){
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
    var yAxis =null;
    var valueline = null;
    var svg = null;
    var formatTime = d3.timeFormat("%M:%S:%L")
    var parseTime = d3.timeParse("%M:%S:%L")
    $(self).empty();


    self.addEventListener('component-resize-event',(e)=>{
      //console.log("ack",this,self.parentElement.offsetWidth)
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
    })

    session.getRandomNumber(function (val) {

      var date = parseTime(formatTime(new Date()));
      parsedData.push({
        x: date,
        y: val
      });

      if(parsedData.length == minPoints){
        dataPlotElements.push(self);
        margin = { top: 30, right: 30, bottom: 30, left: 50 };
        width = self.parentElement.offsetWidth - margin.left - margin.right;
        height = 300 - margin.top - margin.bottom;
        x = d3.scaleTime().range([0, width]);
        y = d3.scaleLinear().range([height, 0]);
        xAxis = d3.axisBottom(x).tickFormat(formatTime);;
        yAxis = d3.axisLeft(y);
        valueline = d3.line()
            .x(function (d) {
              return x(d.x);
            })
            .y(function (d) {
              return y(d.y);
            });
        svg = d3.select(self)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("class", "canvas")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        parsedData.forEach(function (d) {
            d.x = d.x;
            d.y = +d.y;
        });
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

      }

      if(parsedData.length > minPoints){



        parsedData.forEach(function (d) {
            d.x = d.x;
            d.y = +d.y;
        });
        // Scale the range of the data
        x.domain(d3.extent(parsedData, function (d) {
            return d.x;
            }));
        y.domain([0, d3.max(parsedData, function (d) {
            return d.y;
            })]);
        svg.select("path")   // change the line
            .attr("d", valueline(parsedData));
        svg.select(".x.axis") // change the x axis
            .call(xAxis);
        svg.select(".y.axis") // change the y axis
            .call(yAxis);

      }

      if(parsedData.length > maxPoints){

        parsedData.shift();

      }

    });

  }
}

class Led extends HTMLElement{
  constructor(){
    super();
    this.textContent = "";
    this.divElement = null;
    var self = this;
    var divElement = document.createElement("div");
    divElement.setAttribute("class","led-basic");
    this.appendChild(divElement)

    session.getRandom(function (val) {
      if(val){
        divElement.setAttribute("class","led-basic led-on");
      }
      else{
        divElement.setAttribute("class","led-basic led-off");
      }
    });

  }
}

customElements.define("cmdr-text", Text);
customElements.define("cmdr-button", Button);
customElements.define("cmdr-dataplot", DataPlot);
customElements.define("cmdr-led", Led);
