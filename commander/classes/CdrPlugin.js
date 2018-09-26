"use strict";

var path = require('path');

module.exports = class CdrPlugin {
	constructor(webRoot, urlBase) {
		//if(new.target === CdrPlugin) {
		//	throw new TypeError('Cannot construct CdrPlugin instances directly');
		//}
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
			
			var appViews = global.NODE_APP.get('views');
			appViews.push(webRoot);

			this.processPanelsTree(panels);
		}
	}

	processPanelsTree(panels) {
		if(panels.hasOwnProperty('urlPath')) {
			var self = this;
			console.log('Registering ' + panels.urlPath);
			global.NODE_APP.get(panels.urlPath, function (req, res) {
				res.render(path.join(self.webRoot, panels.filePath));
			});
		}
		
		if(panels.hasOwnProperty('nodes')) {
			for(var nodeID in panels.nodes) {
				this.processPanelsTree(panels.nodes[nodeID]);
			}
		}
	}
}
