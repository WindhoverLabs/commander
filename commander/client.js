'use strict';

var CommanderClient = CommanderClient || {};

CommanderClient.prototype.__proto__ = EventEmitter.prototype;

function CommanderClient() {
    this.isSocketConnected = false;
	this.socket;
	this.subscriptions = {};

	console.log('CommanderClient');

	this.connect();
}



CommanderClient.prototype.isSocketConnected = function() {
  /* TODO */
  return isSocketConnected;
};



CommanderClient.prototype.getLayouts = function (path, cb){
	this.getDirectoryListing(path, 'layout', cb);
};



CommanderClient.prototype.getPanels2 = function (path, cb){
    console.log('********************');
    console.log(path);
	this.getDirectoryListing(path, 'pug', cb);
};



CommanderClient.prototype.getPanels = function (path, cb) {
    this.socket.emit('getPanels', path, function(result){
        cb(result);
    });
};



CommanderClient.prototype.getRandom = function (cb){
    setInterval(function() {
        var random_boolean = Math.random() >= 0.5;
        cb(random_boolean);
    }, 500);
};



CommanderClient.prototype.getDirectoryListing = function (path, extension, cb){
	var re = /(?:\.([^.]+))?$/;

    if(this.isSocketConnected){
    	this.socket.emit('getDirectoryListing', path, function(result){
    		var entries = [];
    		var dirEntries = result.files;

            for(var i=0; i < dirEntries.length; ++i) {
            	var entry = dirEntries[i];

            	if(entry.hasOwnProperty('type')) {
            		if(entry.type == 'dir') {
            			/* This is a directory. */
                        entries.push(entry);
            		} else {
                		var ext = re.exec(entry.name)[1];

                		if(ext != null) {
                		    if(ext == extension) {
                                entries.push(entry);
                		    }
                		} else {
                            entries.push(entry);
                		}
            		}
            	} else {
                    entries.push(entry);
            	}
            }

            cb(entries);
        });
    };
};



CommanderClient.prototype.getViews = function (cb){
    if(this.isSocketConnected){
    	this.socket.emit('getViews', function(views){
            cb(views);
        });
    };
};



CommanderClient.prototype.getCmdDefs = function (cmdObj,cb){
    if(this.isSocketConnected){
        this.socket.emit('getCmdDefs', cmdObj, function(cmdDefs) {
        	var outCmdDefs = {name:cmdDefs.opsPath, argument:cmdDefs.args};
        	
            cb(outCmdDefs);
        });
        
      /* stubs */

//      if(cmdObj.name=='/CFE/SetMaxPRCount'){
//        cb({
//          "name": "SetMaxPRCount",
//          "qualifiedName": "/CFE/SetMaxPRCount",
//          "alias": [
//            {
//              "name": "SetMaxPRCount",
//              "namespace": "/CFS/CFE_ES"
//            }
//          ],
//          "baseCommand": {
//            "name": "cfs-cmd",
//            "qualifiedName": "/CFS/cfs-cmd",
//            "alias": [
//              {
//                "name": "cfs-cmd",
//                "namespace": "/CFS"
//              }
//            ],
//            "abstract": true,
//            "argument": [
//              {
//                "name": "ccsds-apid",
//                "type": {
//                  "engType": "integer",
//                  "dataEncoding": {
//                    "type": "INTEGER",
//                    "littleEndian": false,
//                    "sizeInBits": 11,
//                    "encoding": "unsigned"
//                  }
//                }
//              },
//              {
//                "name": "timeId",
//                "initialValue": "0",
//                "type": {
//                  "engType": "integer",
//                  "dataEncoding": {
//                    "type": "INTEGER",
//                    "littleEndian": false,
//                    "sizeInBits": 2,
//                    "encoding": "unsigned"
//                  }
//                }
//              },
//              {
//                "name": "checksumIndicator",
//                "initialValue": "1",
//                "type": {
//                  "engType": "integer",
//                  "dataEncoding": {
//                    "type": "INTEGER",
//                    "littleEndian": false,
//                    "sizeInBits": 1,
//                    "encoding": "unsigned"
//                  }
//                }
//              },
//              {
//                "name": "packet-type",
//                "initialValue": "1",
//                "type": {
//                  "engType": "integer",
//                  "dataEncoding": {
//                    "type": "INTEGER",
//                    "littleEndian": true,
//                    "sizeInBits": 4,
//                    "encoding": "unsigned"
//                  }
//                }
//              },
//              {
//                "name": "packet-id",
//                "initialValue": "0",
//                "type": {
//                  "engType": "integer",
//                  "dataEncoding": {
//                    "type": "INTEGER",
//                    "littleEndian": true,
//                    "sizeInBits": 32,
//                    "encoding": "unsigned"
//                  }
//                }
//              },
//              {
//                "name": "cfs-cmd-code",
//                "type": {
//                  "engType": "integer",
//                  "dataEncoding": {
//                    "type": "INTEGER",
//                    "littleEndian": true,
//                    "sizeInBits": 7,
//                    "encoding": "unsigned"
//                  }
//                }
//              }
//            ],
//            "url": "http://localhost:8090/api/mdb/Bebop_2_SITL/commands/CFS/cfs-cmd"
//          },
//          "abstract": false,
//          "argument": [
//            {
//              "name": "Payload.MaxPRCount",
//              "type": {
//                "engType": "enumeration",
//                "dataEncoding": {
//                  "type": "INTEGER",
//                  "littleEndian": true,
//                  "sizeInBits": 16,
//                  "encoding": "unsigned"
//                },
//                "enumValue":[
//                  {
//                    "value":0,
//                    "label":"A"
//                  },
//                  {
//                    "value":1,
//                    "label":"B"
//                  },
//                  {
//                    "value":2,
//                    "label":"C"
//                  }
//                ]
//              }
//            }
//          ],
//          "argumentAssignment": [
//            {
//              "name": "ccsds-apid",
//              "value": "6"
//            },
//            {
//              "name": "cfs-cmd-code",
//              "value": "20"
//            }
//          ],
//          "url": "http://localhost:8090/api/mdb/Bebop_2_SITL/commands/CFS/CFE_ES/SetMaxPRCount",
//          "uuid": "915bd538-910b-49dd-af34-407c7d92b4e4"
//        });
//      }
//
//


    };
};



CommanderClient.prototype.getTlmDefs = function (cb){
    if(!this.isSocketConnected){
    	this.socket.emit('getTlmDefs', function(tlmDefs){
            cb(tlmDefs);
        });
    };
};



CommanderClient.prototype.updateTelemetry = function (items) {
	var self = this;

	for(var itemID in items) {
		var subs = self.subscriptions[itemID];
		for(var funcName in subs) {
			var cb = subs[funcName].cb;
      var opsPath = subs[funcName].opsPath;
			var param = {
        val: items[itemID].value,
        opsPath:opsPath
      };
			cb(param);
		}
	}
}

CommanderClient.prototype.unsubscribe = function (tlmObj){
    if(this.isSocketConnected){
    	var tlmOpsPaths = [];

    	for(var i=0; i < tlmObj.length; ++i) {
    		var opsPath = tlmObj[i].name;
    		tlmOpsPaths.push(opsPath);

        if(this.subscriptions.hasOwnProperty(opsPath)) {
          delete this.subscriptions[opsPath];
        }
        console.log('unsubscribed')
    	}

    	this.socket.emit('unsubscribe', tlmOpsPaths);

    };
};

CommanderClient.prototype.subscribe = function (tlmObj, cb){
    if(this.isSocketConnected){
    	var tlmOpsPaths = [];

    	for(var i=0; i < tlmObj.length; ++i) {
    		var opsPath = tlmObj[i].name;
    		tlmOpsPaths.push(opsPath);

        	if(this.subscriptions.hasOwnProperty(opsPath) == false) {
        		this.subscriptions[opsPath] = {};
        	}

        	this.subscriptions[opsPath][cb] = {cb:cb,opsPath:opsPath};
        	// console.log(this.subscriptions[opsPath][cb]);
    	}

    	this.socket.emit('subscribe', tlmOpsPaths);

    };
};



CommanderClient.prototype.sendCommand = function (cmdObj) {
    if(this.isSocketConnected){
    	this.socket.emit('sendCmd', cmdObj);
    };
};



CommanderClient.prototype.connect = function (){
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

    this.socket.on('telemetry-update', function(items){
    	self.updateTelemetry(items);
	});
};
