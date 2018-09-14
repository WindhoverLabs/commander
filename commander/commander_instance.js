
var Emitter = require('events');



function CommanderInstance(name, server) {
	this.name = name;
	this.server = server;
	this.apps = {};
	this.emitter = new Emitter();
	var self = this;

	/* TODO:  Add event filtering. */
	
	this.emitter.on('events-debug', function(eventObj) {
//		var component = '---';
//		var eventID = '---';
//		var text = '---';
//		var pluginName = '---';
//		
//		for(var appID in self.apps) {
//			if(eventObj.sender == self.apps[appID].appObj) {
//				pluginName = self.apps[appID].name;
//			}
//		}
//			
//		if(eventObj.hasOwnProperty('component')) {
//			component = eventObj.component;
//		}
//			
//		if(eventObj.hasOwnProperty('eventID')) {
//			eventID = eventObj.eventID;
//		}
//		
//		if(eventObj.hasOwnProperty('text')) {
//			text = eventObj.text;
//		}
//		
//		self.logEvent(component, pluginName, eventID, 'DEBUG', text);
	});

	this.emitter.on('events-info', function(eventObj) {
		var component = '---';
		var eventID = '---';
		var text = '---';
		var pluginName = '---';
		
		for(var appID in self.apps) {
			if(eventObj.sender == self.apps[appID].appObj) {
				pluginName = self.apps[appID].name;
			}
		}
			
		if(eventObj.hasOwnProperty('component')) {
			component = eventObj.component;
		}
			
		if(eventObj.hasOwnProperty('eventID')) {
			eventID = eventObj.eventID;
		}
		
		if(eventObj.hasOwnProperty('text')) {
			text = eventObj.text;
		}
		
		self.logEvent(component, pluginName, eventID, 'INFO', text);
	});

	this.emitter.on('events-error', function(eventObj) {
		var component = '---';
		var eventID = '---';
		var text = '---';
		var pluginName = '---';
		
		for(var appID in self.apps) {
			if(eventObj.sender == self.apps[appID].appObj) {
				pluginName = self.apps[appID].name;
			}
		}
			
		if(eventObj.hasOwnProperty('component')) {
			component = eventObj.component;
		}
			
		if(eventObj.hasOwnProperty('eventID')) {
			eventID = eventObj.eventID;
		}
		
		if(eventObj.hasOwnProperty('text')) {
			text = eventObj.text;
		}
		
		self.logEvent(component, pluginName, eventID, 'ERROR', text);
	});

	this.emitter.on('events-critical', function(eventObj) {
		var component = '---';
		var eventID = '---';
		var text = '---';
		var pluginName = '---';
		
		for(var appID in self.apps) {
			if(eventObj.sender == self.apps[appID].appObj) {
				pluginName = self.apps[appID].name;
			}
		}
			
		if(eventObj.hasOwnProperty('component')) {
			component = eventObj.component;
		}
			
		if(eventObj.hasOwnProperty('eventID')) {
			eventID = eventObj.eventID;
		}
		
		if(eventObj.hasOwnProperty('text')) {
			text = eventObj.text;
		}
		
		self.logEvent(component, pluginName, eventID, 'CRIT', text);
	});
	
	return this;
}


/**
 * Inherits from `EventEmitter`.
 */
CommanderInstance.prototype.__proto__ = Emitter.prototype;



CommanderInstance.prototype.logEvent = function (plugin, component, eventID, criticality, text) {
	this.server.logEvent(this.name, plugin, component, eventID, criticality, text);
}



CommanderInstance.prototype.addApp = function (name, newAppObj) {
	var self = this;
	this.apps[name] = {name:name, appObj:newAppObj};

	newAppObj.setInstanceEmitter(this.emitter);
	
    // use a closure to avoid scope erasure
    //(function (streamID) {
	//    appObj.on(streamID, function () {
    //        console.log(streamID + ': ' + arguments);
    //    });
    //});
	//appObj.on('bin-tlm-stream', function() {
	//	console.log('bin-tlm-stream: ' + arguments[0]);
	//});
}




exports = module.exports = CommanderInstance;
