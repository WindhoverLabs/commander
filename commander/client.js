'use strict';

var CommanderClient = CommanderClient || {};

CommanderClient.prototype.__proto__ = EventEmitter.prototype;

function CommanderClient() {
    this.isSocketConnected = false;
	this.socket;
	
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



CommanderClient.prototype.getPanels = function (path, cb){
	this.getDirectoryListing(path, 'pug', cb);
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



CommanderClient.prototype.getCmdDefs = function (cb){
    if(this.isSocketConnected){
    	this.socket.emit('getCmdDefs', function(cmdDefs){
            cb(cmdDefs);
        });
    };
};



CommanderClient.prototype.getTlmDefs = function (cb){
    if(!this.isSocketConnected){
    	this.socket.emit('getTlmDefs', function(tlmDefs){
            cb(tlmDefs);
        });
    };
};



CommanderClient.prototype.subscribe = function (cb){
    if(!this.isSocketConnected){
    	this.socket.emit('subscribe', function(params){
            cb(params);
        });
    };
};



CommanderClient.prototype.sendCommand = function (cb){
    if(!this.isSocketConnected){
    	this.socket.emit('sendCommand', function(cmd){
            cb(cmd);
        });
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
};