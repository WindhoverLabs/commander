"use strict";

var path = require('path');

module.exports = class CdrPlugin {
	constructor(webRoot) {
		if(new.target === CdrPlugin) {
			throw new TypeError('Cannot construct CdrPlugin instances directly');
		}
		if (this.getPanels === undefined) {
		    // or maybe test typeof this.method === "function"
		    throw new TypeError('Must override getPanels');
		}
		if (typeof webRoot === 'undefined') {
		    throw new TypeError('Must supply web root in constructor');
		}
		
		this.webRoot = webRoot;
		
		var panels = this.getPanels();
		if(typeof panels !== 'undefined') {
			global.PANELS_TREE.push(panels);
			
			global.NODE_APP.set('views', '/home/users/mbenson/git/airliner/build/typhoon_h480/sitl/target/commander/commander_workspace/plugins/cfe/web');

			this.processPanelsTree(panels);
		}
	}

	processPanelsTree(panels) {
		if(panels.hasOwnProperty('path')) {
			var self = this;
			var basePath =  panels.path;
			console.log('Registering ' + basePath);
			global.NODE_APP.get(basePath, function (req, res) {
				res.render(path.join(self.webRoot, basePath));
			});
		}
		
		if(panels.hasOwnProperty('nodes')) {
			for(var nodeID in panels.nodes) {
				this.processPanelsTree(panels.nodes[nodeID]);
			}
		}
	}
}
