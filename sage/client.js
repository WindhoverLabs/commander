'use strict';

var Sage = Sage || {};


var emit = EventEmitter.prototype.emitEvent;

function Sage(sessionParams) {
  this.activeInstances = [];
  this.isSocketConnected = false;
  this.socket;
  this.subscribers = [];
  this.eventSubscribers = [];
  this.videoSubscribers = [];
  this.alarmSubscribers = [];
  this.deferredSubscribers = [];
  //this.connection;
  this.defaultInstance = null;
  this.cmdSeqNum = 0;
  this.tlmSeqNum = 0;
  this.cmdInfo = [];

  if(typeof sessionParams !== 'undefined') {
    if(sessionParams.hasOwnProperty('defaultInstance')) {
      process.nextTick(function () {
        self.setDefaultInstance(sessionParams.defaultInstance);
      });
    }
  }

  this.start();

  this.ee = new EventEmitter();
};


Sage.prototype.start = function() {
  this.startSocket();
};


Sage.prototype.isSocketConnected = function() {
  /* TODO */
  return isSocketConnected;
};


Sage.prototype.getDirectoryListing = function (directory, cb){
  console.log('DIRlist',this.isSocketConnected)
  if(!this.isSocketConnected){
    console.log('hello')
    this.socket.emit('getDirListing', directory, function (listing) {
      cb(listing);
    });
  };
};


Sage.prototype.sageRunScript = function (url){
  if(this.isSocketConnected){
    this.socket.emit('run-script', {url: url});
  };
};

Sage.prototype.getTlmInfo = function(tlm,cb){
    if(this.isSocketConnected){
    this.socket.emit('getTlmInfo', tlm, function (listing) {
      cb(listing);
    });
  };
};

Sage.prototype.getInstanceList = function (cb){
  if(this.isSocketConnected){
    this.socket.emit('getAllInstances', function (instances) {
      cb(instances);
    });
  };
};


Sage.prototype.getADSBJson = function (cb){
  if(this.isSocketConnected){
    this.socket.emit('getADSBJson', function (adsb) {
      cb(adsb);
    });
  };
};


Sage.prototype.getInstanceDetail = function (instanceName){
  if(this.isSocketConnected){
    this.socket.emit('getInstance', instanceName, function (info) {
      $( document ).trigger( 'sage-instance-info-received', info );
    });
  };
};


Sage.prototype.getAllLinksList = function (){
  if(this.isSocketConnected){
    this.socket.emit('getAllLinks', function (links) {
      $( document ).trigger( 'sage-links-list-received', links );
    });
  };
};


Sage.prototype.getInstanceLinksList = function (instanceName){
  if(this.isSocketConnected){
    this.socket.emit('getInstanceLinks', instanceName);
  };
};


Sage.prototype.getInstanceLink = function (instanceName, linkName){
  if(this.isSocketConnected){
    this.socket.emit('getInstanceLink', {'instance':instanceName, 'name':linkName}, function (info) {
      $( document ).trigger( 'sage-link-info-received', info );
    });
  };
};


Sage.prototype.enableInstanceLink = function (instanceName, linkName){
  if(this.isSocketConnected){
    this.socket.emit('disableInstanceLink', {'instance':instanceName, 'name':linkName, 'data':{'state':'enabled'}});
  };
};


Sage.prototype.disableInstanceLink = function (instanceName, linkName){
  if(this.isSocketConnected){
    this.socket.emit('disableInstanceLink', {'instance':instanceName, 'name':linkName, 'data':{'state':'disabled'}});
  };
};


Sage.prototype.getEventsList = function (instanceName, source, start, stop, pos, limit, order){
  if(this.isSocketConnected){
    this.socket.emit('getEventsList', {'instance':instanceName, 'source':'CFS', 'start':start, 'stop':stop, 'pos':pos, 'limit':5, 'order':order});
  };
};


Sage.prototype.getStreamsList = function (instanceName){
  if(this.isSocketConnected){
    this.socket.emit('getStreamsList', instanceName);
  };
};


Sage.prototype.getStreamInfo = function (instanceName){
  if(this.isSocketConnected){
    this.socket.emit('getStreamsList', instanceName);
  };
};


Sage.prototype.getCommandInfo = function (cmd, cb){
  /* See if we can find it in the cache first. */
  var idx = -1;
  for(var i = 0; i < this.cmdInfo.length; i++) {
    if(this.cmdInfo[i].hasOwnProperty('name') && this.cmdInfo[i]['name'] === cmd['name']) {
      idx = i;
      break;
    }
  }

  if(idx != -1){
    /* It is in the cache.  Now see if we already received the command information. */
    if(this.cmdInfo[idx].hasOwnProperty('received')) {
      /* Yes.  We have already received.  Just return what we received.  No need to request it again. */
      cb(this.cmdInfo[idx]['received']);
    } else {
      /* No.  We have not received it yet.  Add it to the list of requesters. */
      if(!this.cmdInfo[idx].hasOwnProperty('requesters')) {
        /* This is the first receiver in the list. */
        this.cmdInfo[idx]['requesters'] = [cb];
      } else {
        /* This is not the first receiver in the list.  Just push it onto the list. */
        this.cmdInfo[idx]['requesters'].push(cb);
      }
    }
  } else {
    /* It is not in the cache.  Add the request to the cache so we don't rerequest it. */
    this.cmdInfo.push(cmd);

    /* Add this caller to the list of requesters. */
    cmd['requesters'] = [cb];

    /* Now send the request. */
    if(this.isSocketConnected){
      this.socket.emit('getCommandInfo', cmd, function(info) {
        /* Command info has been received.  Store the received definition so we don't have to rerequest it
           if requested again. */
        cmd['received'] = info;

        /* Now iterate through the receivers list and send the definition to any other caller that requested
           it while we were waiting. */
        for(var i = 0; i < cmd['requesters'].length; i++) {
          cmd['requesters'][i](info);
        }
      });
    };
  };
};


Sage.prototype.startSocket = function (){
  var self = this;

  this.socket = io({
  	//'reconnection': true ,
	  'reconnectionDelay' : 1000,
	  'reconnectDelayMax': 5000,
	  'timeout': 5000
  });
  this.socket.on('connect', function(){
    /* Connection established. */
    self.isSocketConnected = true;
    self.emit('connect');
  });
  this.socket.on('connect_error', function(error){
    /* Connection error. */
    self.isSocketConnected = false;
    self.emit('connect_error', error);
  });
  this.socket.on('connect_timeout', function(){
    /* Connection timeout. */
    self.isSocketConnected = false;
    self.emit('connect_timeout');
  });
  this.socket.on('reconnect', function(number){
    /* Reconnect occured. */
    self.isSocketConnected = true;
    self.emit('reconnect');
  });
  this.socket.on('reconnect_attempt', function(){
    /* Reconnecting. */
    self.isSocketConnected = false;
    self.emit('reconnect_attempt');
  });
  this.socket.on('reconnecting', function(number){
    /* Reconnect error occured */
    self.isSocketConnected = false;
    self.emit('reconnecting', number);
  });
  this.socket.on('reconnect_error', function(error){
    /* Reconnect error occured */
    self.isSocketConnected = false;
    self.emit('reconnect_error', error);
  });
  this.socket.on('reconnect_failed', function(){
    /* Reconnect failed. */
    self.isSocketConnected = false;
    self.emit('reconnect_failed');
  });
  this.socket.on('script-stdout', function(message) {
    self.emit('script-stdout', message);
  });
  this.socket.on('script-stderr', function(message) {
    self.emit('script-stderr', message);
  });
  this.socket.on('events', function(event) {
    self.emit('events', event);
  });
  this.socket.on('camera-image', function(info) {
    if (info.image) {
      for(var i=0; i < self.videoSubscribers.length; ++i) {
        //self.emit('camera-image', info.buffer);
        self.videoSubscribers[i](info.buffer);
      }
    }
  });
  this.socket.on('updateTelem', function(msg) {
    var obj = msg.data;
    var instanceName = msg.instance;
    switch(obj[1]){
      case 1:
        /* Request   */
        //console.log("Request:  " + JSON.stringify(obj));
        break;

      case 2:
        /* Reply     */
        //console.log("Reply:  " + JSON.stringify(obj));
        break;

      case 3:
        /* Exception */
        //console.log("Exception:  " + JSON.stringify(obj));
        break;

      case 4:
        switch(obj[3].dt){
          case 'PARAMETER':
            /* Data      */
            for(var i=0; i < obj[3].data.parameter.length; ++i){
              for(var j=0; j < self.subscribers.length; ++j) {
                var param = obj[3].data.parameter[i];
                param.instance = instanceName;
                var subscriber = self.subscribers[j];
                for (var k = 0; k < subscriber.params.tlm.length; ++k){
                  if (subscriber.params.tlm[k].name == param.id.name) {
                    /* Check to see if this is a duplicate. */
                    if(typeof subscriber.params.tlm[k].sample !== 'undefined') {
                      /* This is not the first sample we've received. */
                      if(subscriber.params.tlm[k].sample.acquisitionTime == param.acquisitionTime){
                        /* Time stamps match.  This is a duplicate.  Ignore it. */
                        continue;
                      }
                    }
                    //if (subscriber.params.tlm[k].sample.acquisitionTime
                    if (subscriber.params.hasOwnProperty('homogeneity')) {
                      /* First store the parameter so we can compare homogeneity. */
                      subscriber.params.tlm[k].sample = param;

                      /* Get the optional parameters. */
                      var homogenousBy = 'acquisitionTime';
                      var tolerance = 0;
                      if (subscriber.params.homogeneity.hasOwnProperty('by')) {
                        homogenousBy = subscriber.params.homogeneity.by;
                      };
                      if (subscriber.params.homogeneity.hasOwnProperty('tolerance')) {
                        tolerance = subscriber.params.homogeneity.tolerance;
                      };

                      /* Now determine if the samples are homogenous.  First,
                       * Get the timestamp of the current sample.
                       */
                      var timeStamp = new Date(param[homogenousBy]);

                      /* Now iterate through the remaining samples.  If any
                       * of them fall outside the defined tolerance, flag
                       * this not homogenous.
                       */
                      var isHomogenous = true;
                      for (var iSample = 0; iSample < subscriber.params.tlm.length; ++iSample) {
                        if(subscriber.params.tlm[iSample].hasOwnProperty('sample') == false){
                          isHomogenous = false;
                          break;
                        } else {
                          var sampleTimeStamp = new Date(subscriber.params.tlm[iSample].sample[homogenousBy]);
                          var diff = timeStamp.getTime() - sampleTimeStamp.getTime();
                          if (Math.abs(diff) > tolerance) {
                            isHomogenous = false;
                            break;
                          }
                        }
                      }
                      if(isHomogenous)
                      {
                        /* The sample group is homogenous.  Send the subscriber
                         * an array containing the entire group.
                         */
                        var params = [];
                        for (var iSample = 0; iSample < subscriber.params.tlm.length; ++iSample) {
                          params.push(subscriber.params.tlm[iSample].sample);
                        }
                        subscriber.updateFunc(params);
                      }
                    } else {
                      /* Homogeneity is not defined.  Just give it to the subscriber
                       * as its received. */
                        /* Apply calibration, if defined. */
                        if(subscriber.params.tlm[k].hasOwnProperty('calibration')){
                          if(subscriber.params.tlm[k].calibration.hasOwnProperty('type')){
                            if(subscriber.params.tlm[k].calibration.type == 'function'){
                              if(subscriber.params.tlm[k].calibration.hasOwnProperty('function')){
                                var value;
                                if (param.engValue.hasOwnProperty('floatValue')) {
                                  /* TODO */
                                  value = param.engValue.floatValue;
                                  param.engValue.floatValue = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('doubleValue')) {
                                  /* TODO */
                                  value = param.engValue.doubleValue;
                                  param.engValue.doubleValue = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('sint32Value')) {
                                  /* TODO */
                                  value = param.engValue.sint32Value;
                                  param.engValue.sint32Value = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('uint32Value')) {
                                  /* TODO */
                                  value = param.engValue.uint32Value;
                                  param.engValue.uint32Value = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('binaryValue')) {
                                  /* TODO */
                                  value = param.engValue.binaryValue;
                                  param.engValue.binaryValue = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('stringValue')) {
                                  /* TODO */
                                  value = trimNull(param.engValue.stringValue);
                                  param.engValue.stringValue = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('timestampValue')) {
                                  /* TODO */
                                  value = param.engValue.timestampValue;
                                  param.engValue.timestampValue = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('uint64Value')) {
                                  /* TODO */
                                  value = param.engValue.uint64Value;
                                  param.engValue.uint64Value = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('sint64Value')) {
                                  /* TODO */
                                  value = param.engValue.sint64Value;
                                  param.engValue.sint64Value = eval(subscriber.params.tlm[k].calibration.function);
                                } else if (param.engValue.hasOwnProperty('booleanValue')) {
                                  /* TODO */
                                  value = param.engValue.booleanValue;
                                  param.engValue.booleanValue = eval(subscriber.params.tlm[k].calibration.function);
                                } else {
                                  /* TODO */
                                  value = '???';
                                }

                              }
                            }
                          }
                        }
                        subscriber.updateFunc(param);
                    }
                  }
                }
              }
            };
            break;

          case 'ALARM_DATA':
            for(var i=0; i < self.alarmSubscribers.length; ++i) {
              self.alarmSubscribers[i](obj[3]);
            }
            break;

          case 'EVENT':
            for(var i=0; i < self.eventSubscribers.length; ++i) {
              self.eventSubscribers[i](obj[3]);
            }
            break;

          default:
            console.log(obj[3].dt);
        }
        break;
    };
  });
};


Sage.prototype.__proto__ = EventEmitter.prototype;


Sage.prototype.subscribe = function (args, updateFunc) {
  if (this.defaultInstance == null) {
    /* The default instance has not be set yet.  Defer this subscription for
     * later.
     */
    this.deferredSubscribers.push({'params': args, 'updateFunc': updateFunc});
  } else {
    /* The efault instance has been set. Subscribe as usual. */
    this.subscribers.push({'params':args, 'updateFunc':updateFunc});
    this.socket.emit('subscribe', args);
  }
};


Sage.prototype.subscribeToEvents = function (updateFunc) {
  this.eventSubscribers.push(updateFunc);
};


Sage.prototype.subscribeToVideo = function (updateFunc) {
  console.log("Subscribed to video");
  this.videoSubscribers.push(updateFunc);
  this.socket.emit('enableVideo');
};

Sage.prototype.unSubscribeToVideo = function () {
  console.log("UN-Subscribed from video");
  this.socket.emit('disableVideo');
};


Sage.prototype.subscribeToAlarms = function (updateFunc) {
  this.alarmSubscribers.push(updateFunc);
};


Sage.prototype.setDefaultInstance = function(name, cb) {
  var self = this;
  this.socket.emit('setDefaultInstance', name, function() {
    self.defaultInstance = name;
    while(self.deferredSubscribers.length > 0) {
      var subscriber = self.deferredSubscribers.pop();
      self.subscribe(subscriber.params, subscriber.updateFunc);
    }
    cb();
  });
};


Sage.prototype.unsubscribe = function (param){
  this.socket.emit('unsubscribe', param);
};


Sage.prototype.sendCommand = function(name, args)
{
  if(this.isSocketConnected){
    this.socket.emit('sendCommand',{name:name, args:args});
  };
};


Sage.prototype.unsubscribeAll = function(){
  while((sub=this.subscriptions.pop()) != null){
    this.telemetry_unsubscribe(sub);
  }
}























/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}



function SageTimeSeriesDataplot(domObject, objData) {
    this.objData = objData;
    this.objMergedData = {};

    function legendFormatter(label, series) {
        return '<div ' +
    	  'style="color:white;font-size:8pt;text-align:left;padding:4px;padding-left:10px">' +
    	  label + '</div>';
    };

    this.objMergedData = {
        update_interval: 100,
        homogeneity: {tolerance: 0},
        maxcount: 120,
        ignore_count: 3,
        options : {
            xaxis : {
            mode : 'time',
            font : {
                color: "#ffffff"
                }
            },
            yaxis : {
                font : {
                    color: "#ffffff"
                }
            },
            series : {
                lines : {
                    show : true
                },
                points: {
                    show: false
                }
            },
            legend: {
                show: true,
                labelFormatter: legendFormatter,
                labelBoxBorderColor: 'rgba(255, 255, 255, 0.0)',
                noColumns: 1,
                position: 'ne',
                margin: [10,10],
                backgroundColor: null,
                backgroundOpacity: 0,
                container: null,
                sorted: false
            },
            grid: {
                show: true,
                //aboveData: boolean
                //color: '#ffffff',
                //backgroundColor: color/gradient or null
                //margin: number or margin object
                //labelMargin: number
                //axisMargin: number
                //markings: [{ color: "#ffffff" }],
                //markings: array of markings or (fn: axes -> array of markings)
                //borderWidth: number or object with "top", "right", "bottom" and "left" properties with different widths
                //borderColor: color or null or object with "top", "right", "bottom" and "left" properties with different colors
                //minBorderMargin: number or null
                //clickable: boolean
                //hoverable: boolean
                //autoHighlight: boolean
                //mouseActiveRadius: number
            }
        }
    };

    mergeDeep(this.objMergedData, objData);

    this.UtilGraph = $.plot(domObject, [], this.objMergedData.options);

    var objTlm = [];
    for(var i=0; i < this.objMergedData.data.length; ++i) {
    	if(this.objMergedData.data[i].tlm !== undefined) {
            objTlm.push(this.objMergedData.data[i].tlm);
    	}
    }

    var count = 0;

    this.values = new Array(this.objMergedData.data.length);
    for(var i = 0; i < this.objMergedData.data.length; ++i) {
    	this.values[i] = [];
    }

	var self = this;

    if(objTlm.length > 0)
    {
        session.subscribe({
          homogeneity: self.objMergedData.homogeneity,
          'tlm': objTlm}, function(params) {
            count = count + 1;
            if(self.objMergedData.ignore_count > 0){
            	self.objMergedData.ignore_count = self.objMergedData.ignore_count - 1;
    	    } else {
    	        var timeStamp = new Date(params[0].acquisitionTime);
    		    for(var i = 0; i < objTlm.length; ++i) {
        	        if (self.values[i].length >= self.objMergedData.maxcount) {
        	        	self.values[i] = self.values[i].slice(1);
        	        }

        	        var value = params[i].engValue.floatValue;

        	    	/* compensation for boolean */
        	    	if(value == undefined){
	        	    	if (params[i].engValue.booleanValue){
	        	    		value = 1;
	        	    	}else{
	        	    		value = 0;
	        	    	}
        	    	}

        	        self.values[i].push([timeStamp, value]);
    	        }

    		    if(self.objMergedData.update_interval <= 0) {
    		    	update(self);
    		    };
    	    }
        });

        update();
    }

    function update() {
    	var dataArray = [];

		for(var i = 0; i < objTlm.length; ++i) {
		    var entry = {
		        data: self.values[i],
		        label: self.objMergedData.data[i].label,
		        color: self.objMergedData.data[i].color,
		    };

		    dataArray.push(entry);
		}

		self.UtilGraph.setData(dataArray);

		// since the axes don't change, we don't need to call plot.setupGrid()
		self.UtilGraph.setupGrid();
		self.UtilGraph.draw();

		if(self.objMergedData.update_interval > 0) {
	    	setTimeout(update, self.objMergedData.update_interval);
		};
    }
};



SageTimeSeriesDataplot.prototype.addData = function(params) {
	var self = this;

	self.count = self.count + 1;
    if(this.objMergedData.ignore_count > 0){
    	self.objMergedData.ignore_count = self.objMergedData.ignore_count - 1;
    } else {
        var timeStamp = new Date(params[0].acquisitionTime);
	    for(var i = 0; i < self.objMergedData.data.length; ++i) {
	        if (self.values[i].length >= self.objMergedData.maxcount) {
	        	self.values[i] = self.values[i].slice(1);
	        }

	        var value = params[i].engValue.floatValue;

	        self.values[i].push([timeStamp, value]);
        }
    }

    update();

    function update() {
    	var dataArray = [];

		for(var i = 0; i < self.objMergedData.data.length; ++i) {
		    var entry = {
		        data: self.values[i],
		        label: self.objMergedData.data[i].label,
		        color: self.objMergedData.data[i].color,
		    };

		    dataArray.push(entry);
		}

		self.UtilGraph.setData(dataArray);

		// since the axes don't change, we don't need to call plot.setupGrid()
		self.UtilGraph.setupGrid();
		self.UtilGraph.draw();

		if(self.objMergedData.update_interval > 0) {
	    	setTimeout(update, self.objMergedData.update_interval);
		};
    }
};
