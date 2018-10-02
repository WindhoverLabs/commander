"use strict";

var path = require('path');
var fs = require('fs');

module.exports = class CdrPlugin {
	constructor(webRoot, urlBase) {
		//if(new.target === CdrPlugin) {
		//	throw new TypeError('Cannot construct CdrPlugin instances directly');
		//}
		if (this.getPanels === undefined) {
		    // or maybe test typeof this.method === "function"
		    throw new TypeError('Must override getPanels');
		}
        if (this.getLayouts === undefined) {
            // or maybe test typeof this.method === "function"
            throw new TypeError('Must override getLayouts');
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
        
        var layouts = this.getLayouts();
        if(typeof layouts !== 'undefined') {
            global.LAYOUTS_TREE.push(layouts);
            
            var appViews = global.NODE_APP.get('views');
            appViews.push(webRoot);

            this.processLayoutsTree(layouts);
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

    processLayoutsTree(layouts) {
        if(layouts.hasOwnProperty('urlPath')) {
            var self = this;
            console.log('Registering ' + layouts.urlPath);
            global.NODE_APP.get(layouts.urlPath, function (req, res) {
                readJSONFile(path.join(self.webRoot, layouts.filePath), function (err, json) {
                    res.send(json);
                });
                
            });
        }
        
        if(layouts.hasOwnProperty('nodes')) {
            for(var nodeID in layouts.nodes) {
                this.processLayoutsTree(layouts.nodes[nodeID]);
            }
        }
    }
}


function readJSONFile(filename, callback) {
    fs.readFile(filename, function (err, data) {
      if(err) {
        callback(err);
        return;
      }
      try {
        callback(null, data);
      } catch(exception) {
        callback(exception);
      }
    });
  }