

var Emitter = require('events');








function CommanderApp(instance, name, options) {
	this.instance = instance;
	this.name = name;
	this.options = options;
	
	return this;
}


/**
 * Inherits from `EventEmitter`.
 */
CommanderApp.prototype.__proto__ = Emitter.prototype;



CommanderApp.prototype.logEvent = function (component, eventID, criticality, text) {
	this.instance.logEvent(this.name, component, eventID, criticality, text);
}






exports = module.exports = CommanderApp;