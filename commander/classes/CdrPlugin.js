"use strict";

var path = require('path');
var fs = require('fs');

/* Content Types */
const ContentTypeEnum = Object.freeze(
		{'PANEL':    1,
		 'LAYOUT':   2});

//module.exports = { ContentTypeEnum }


class CdrPlugin {
	constructor(name, webRoot, urlBase) {
		//if(new.target === CdrPlugin) {
		//	throw new TypeError('Cannot construct CdrPlugin instances directly');
		//}
		if (this.getContent === undefined) {
		    // or maybe test typeof this.method === "function"
		    throw new TypeError('Must override getContent');
		}
		if (typeof webRoot === 'undefined') {
		    throw new TypeError('Must supply web root in constructor');
		}
		
		this.webRoot = webRoot;
		
		var content = this.getContent();
		if(typeof content !== 'undefined') {
			global.CONTENT_TREE[name] = content;

			var appViews = global.NODE_APP.get('views');
			appViews.push(webRoot);

			this.processContentTree(content, '/' + name);
		}
		
//		var panels = this.getPanels();
//		if(typeof panels !== 'undefined') {
//			global.PANELS_TREE.push(panels);
//			
//			var appViews = global.NODE_APP.get('views');
//			appViews.push(webRoot);
//
//			this.processPanelsTree(panels);
//		}
//        
//        var layouts = this.getLayouts();
//        if(typeof layouts !== 'undefined') {
//            global.LAYOUTS_TREE.push(layouts);
//            
//            var appViews = global.NODE_APP.get('views');
//            appViews.push(webRoot);
//
//            this.processLayoutsTree(layouts);
//        }
	}
	

	static get ContentType() {
		return ContentTypeEnum;
	}
	
	processContentTree(content, inPath) {
		var self = this;
		
		var filePath = content.filePath;
		if(typeof filePath !== 'undefined') {
			global.NODE_APP.get(inPath, function (req, res) {				
				var fullFilePath = path.join(self.webRoot, filePath);
				if(path.extname(fullFilePath) === '.pug') {
					res.render(fullFilePath);
				} else {
					readJSONFile(fullFilePath, function (err, json) {
                        res.send(json);
                    });
				}
			});
		}
			
		var nodes = content.nodes;
		if(typeof nodes !== 'undefined') {
			for(var nodeID in nodes) {
				self.processContentTree(nodes[nodeID], inPath + '/' + nodeID);	
			}
		}
	}

	processPanelsTree(panels) {
		if(panels.hasOwnProperty('urlPath')) {
			var self = this;
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


module.exports = {
		CdrPlugin : CdrPlugin,
		ContentTypeEnum: ContentTypeEnum
}