
var Emitter = require('events');



function CommanderInstance(name, server) {
	this.name = name;
	this.server = server;
	this.apps = {};
	this.emitter = new Emitter();
	
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
	this.apps[name] = {name: name, appObj: newAppObj};

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
