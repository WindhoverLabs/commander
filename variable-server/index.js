/****************************************************************************
*
*   Copyright (c) 2018 Windhover Labs, L.L.C. All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
*
* 1. Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in
*    the documentation and/or other materials provided with the
*    distribution.
* 3. Neither the name Windhover Labs nor the names of its
*    contributors may be used to endorse or promote products derived
*    from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
* "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
* LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
* FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
* COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
* INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
* BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
* OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
* AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
* LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
* ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
* POSSIBILITY OF SUCH DAMAGE.
*
*****************************************************************************/

'use strict';
const Emitter = require('events');
const util = require('util');
var convict = require('convict');
var config = require('./config.js');
const Sparkles = require('sparkles');

/* Event IDs */
var EventEnum = Object.freeze(
		{'INITIALIZED':                  1},
		{'INVALID_SUBSCRIPTION_REQUEST': 2},
		{'CONFIG_ERROR':                 3}
	);

var emit = Emitter.prototype.emit;

exports = module.exports = VariableServer;

exports.events = [
];

var listenerCount = Emitter.listenerCount ||
function (emitter, type) { return emitter.listeners(type).length }

function VariableServer(configFile) {
    this.vars = {};
    var self = this;
    this.instanceEmitter;
    this.subscribers = {};

    /* Load environment dependent configuration */
    config.loadFile(configFile);

    /* Perform validation */
    config.validate({allowed: 'strict'});
};



VariableServer.prototype.setInstanceEmitter = function (newInstanceEmitter) {
	var self = this;
	this.instanceEmitter = newInstanceEmitter;

	this.instanceEmitter.on(config.get('jsonInputStreamID'), function(message) {
	    var currentDateAndTime = new Date();
		var subscribersToUpdate = {};
		
    	for(var itemID in message.fields) {
    		var item = message.fields[itemID];

    		if(self.vars.hasOwnProperty(itemID) == false) {
    			/* This is the first time we've seen this variable and it does
    			 * not already have a definition.  Create a new record. */
        		var variable = {opsPath: itemID};
                variable.sample = [];
    			self.vars[itemID] = variable;

    		} else {
    			/* We've already received this or have a predefinition. */
    			var variable = self.vars[itemID];
    			if(typeof variable.sample === 'undefined') {
    			    variable.sample = [];
    			}
    		}
            
            /* Update the current value. */
            variable.sample.push({value: item.value, msgTime:item.msgTime, gndTime:currentDateAndTime});

    		/* Get the persistence value and set the array of retained values accordingly. */
    		var persistenceCount = self.getVariablePersistence(itemID);
    		if(variable.sample.length > persistenceCount) {
    		    /* The array is too big.  We need to take the oldest sample out. */
    		    variable.sample.shift();
    		}          
    		
    		/* Now loop through all the subscribers, if any. */
    		for(var subscriber in variable.subscribers) {
    			/* First make sure this subscriber callback still exists. */
    			if(typeof variable.subscribers[subscriber] !== 'function') {
    				/* It doesn't exist.  It must have been destroyed.  Delete
    				 * the reference to this callback.
    				 */
    				delete variable.subscribers[subscriber];
    			} else {
	    			if(subscribersToUpdate.hasOwnProperty(subscriber) == false) {
	    				/* This is the first time in this function call that we've
	    				 * processed a variable for this particular subscriber.
	    				 * Create a new subscriber record in this temporary 
	    				 * object.
	    				 */
	    				subscribersToUpdate[subscriber] = {cb:variable.subscribers[subscriber], variables: {}};
	    			}
	    			
	    			subscribersToUpdate[subscriber].variables[itemID] = {};
    			
	    			var updatedVariable = subscribersToUpdate[subscriber].variables[itemID];
    			
    				updatedVariable['sample'] = [variable.sample[variable.sample.length - 1]];
    			}
    		}
    		
    		/* Now check to see if this item is an array. */
			if(Array.isArray(item.value) == true) {
				/* This is an array.  See if we have a subscriber for the individual array indices by looping through 
				 * the array indices that are subscribed to. */
				for(var arrayIndexID in variable.arrayIndices) {
					/* This array index has at least one subscriber.  Loop through the subscribers. */
		    		for(var subscriber in variable.arrayIndices[arrayIndexID]) {
		    			var subscription = variable.arrayIndices[arrayIndexID][subscriber];
		    			
		    			/* First make sure this subscriber callback still exists. */
		    			if(typeof subscription !== 'function') {
		    				/* It doesn't exist.  It must have been destroyed.  Delete
		    				 * the reference to this callback.
		    				 */
		    				delete  variable.arrayIndices[arrayIndexID][subscriber];
		    			} else {
		    				/* It does still exist.  Start processing this subscription. */
		    				if(subscribersToUpdate.hasOwnProperty(subscriber) == false) {
		    					/* This is the first time in this function call that we've
		    					 * processed a variable for this particular subscriber.
		    					 * Create a new subscriber record in this temporary 
		    					 * object.
		    					 */
		    					subscribersToUpdate[subscriber] = {cb:variable.subscribers[subscriber], variables: {}};
		    				}
					
							/* Build an opsName that includes the array index */
		    				var newOpsName = itemID + '[' + arrayIndexID + ']';
		    				subscribersToUpdate[subscriber].variables[newOpsName] = {};
					
			    			var updatedVariable = subscribersToUpdate[subscriber].variables[newOpsName];
			    			
			    			var outSample = self.getSampleByArrayIndex(variable, variable.sample.length - 1, arrayIndexID);
			    			
			    			updatedVariable['sample'] = [outSample];
		    			}
		    		}
				}
			}
    	}
    	
    	/* Lastly, loop through all the subscriptions to update, and send them
    	 * an array of updates.
    	 */
		for(var subscriber in subscribersToUpdate) {
			var callback = subscribersToUpdate[subscriber].cb;
			
			/* Make sure this callback still exists. */
			if(typeof callback === 'function') {
				callback(subscribersToUpdate[subscriber].variables);
			}
		}
    	
    	self.instanceEmit(config.get('outputEventsStreamID'), 'message-received');
	});
	
    this.instanceEmitter.on(config.get('varDefReqStreamID'), function(req, cb) {
        self.getTlmDefinitions(req, cb);
    });

	this.instanceEmitter.on(config.get('reqSubscribeStreamID'), function(req, cb) {
		if(req.cmd === 'subscribe') {
			if(typeof req.opsPath === 'string' || req.opsPath instanceof String) {	
				self.SubscribeToVariable(req.opsPath, cb);
			} else if(Array.isArray(req.opsPath)) {
				for(var i=0; i < req.opsPath.length; ++i) {		
					self.getTlmDefinitions({name: req.opsPath[i]}, function(tlmDef) {
						self.SubscribeToVariable(req.opsPath[i], cb);
					});
				}
			} else {
				this.logErrorEvent(EventEnum.INVALID_SUBSCRIPTION_REQUEST, 'Subscription request invalid. \'' + req + '\'');
			}
		} else if(req.cmd === 'unsubscribe') {
			if(typeof req.opsPath === 'string' || req.opsPath instanceof String) {			
				self.removeSubscriber(req, cb);
			} else if(Array.isArray(req.opsPath)) {
				for(var i=0; i < req.opsPath.length; ++i) {	
					self.removeSubscriber(req.opsPath[i], cb);
				}
			} else {
				this.logErrorEvent(EventEnum.INVALID_SUBSCRIPTION_REQUEST, 'Subscription request invalid. \'' + req + '\'');
			}
		}
	});
    
    var variables = config.get('variables');
    if(typeof variables !== 'undefined') {
        for(var i = 0; i < variables.length; ++i) {
            if(typeof variables[i].persistence !== 'undefined') {
                this.setVariablePersistence(variables[i].name, variables[i].persistence.count);
            }
        }
    }

    this.logInfoEvent(EventEnum.INITIALIZED, 'Initialized');
}



VariableServer.prototype.getSampleByArrayIndex = function (variable, sampleID, arrayIndex) {
	var newValue = variable.sample[variable.sample.length - 1].value[arrayIndex];
	
	var outSample = {};
	for(var sampleItemID in variable.sample[sampleID]) {
		if(sampleItemID === 'value') {
			outSample.value = variable.sample[sampleID].value[arrayIndex];
		} else {
			outSample[sampleItemID] = variable.sample[sampleID][sampleItemID];
		}
	}
	
	return outSample;
}



VariableServer.prototype.SubscribeToVariable = function (opsPath, cb) {
	var subscription = {};
    var self = this;
	
	if(self.isVarNameAnArray(opsPath) == true) {
		self.getTlmDefinitions({name: opsPath}, function(tlmDef) {
			if(typeof tlmDef !== 'undefined') {
				if(tlmDef.hasOwnProperty('arrayLength')) {
					var arrayIndex = self.getArrayIndex(opsPath);
					if(arrayIndex < tlmDef.arrayLength) {
						var strippedOpsPath = self.stripArrayIdentifier(opsPath);
						self.addSubscriber(strippedOpsPath, cb, arrayIndex);
					}
				}
			}
		});
	} else {
		self.addSubscriber(opsPath, cb, -1);
	}
}



VariableServer.prototype.isVarNameAnArray = function(varName) {
	var start = varName.indexOf('[');
	
	if(start > 0) {
		var end = varName.indexOf(']');
		
		if(end > start) {
			return true;
		}
	}
	
	return false;
} 



VariableServer.prototype.stripArrayIdentifier = function(varName) {
	if(this.isVarNameAnArray(varName) == true) {
		var start = 0;
		var end = varName.indexOf('[');
		
		if(end > 0) {
			var outString = varName.substring(start, end);
			
			return outString;
		}
	}
	return varName;
} 



VariableServer.prototype.getArrayIndex = function(varName) {
	if(this.isVarNameAnArray(varName) == true) {
		var start = varName.indexOf('[') + 1;
		var end = varName.indexOf(']');
		
		if(end > start) {
			var value = parseInt(varName.substring(start, end));
			
			return value;
		}
	}
	return -1;
} 



VariableServer.prototype.getTlmDefinitions = function (req, cb) {
	var self = this;
	
	this.instanceEmit(config.get('tlmDefReqStreamID'), req, function(tlmDefs) {
            if(typeof tlmDefs === 'undefined') {
                cb(undefined);
            } else {
	        if(typeof tlmDefs.length === 'number') {    
	            /* This must be an array. */
	            var outTlmDefs = [];
	            for(var i = 0; i < tlmDefs.length; ++i) {
	            var outTlmDef = tlmDefs[i];
	                outTlmDef.persistence = {};
	                outTlmDef.persistence.count = self.getVariablePersistence(tlmDefs[i].opsPath);
	                outTlmDef.timeout = self.getVariableTimeout(tlmDefs[i].opsPath);
	                outTlmDefs.push(outTlmDef);
	            }
	            cb(outTlmDefs);
	        } else {
	            /* This is a single request. */
	            var outTlmDef = tlmDefs;
	            outTlmDef.persistence = {};
	            outTlmDef.persistence.count = self.getVariablePersistence(tlmDefs.opsPath);
	            outTlmDef.timeout = self.getVariableTimeout(tlmDefs.opsPath);
	            cb(outTlmDef);
	        }
            }
	});
};



VariableServer.prototype.addSubscriber = function (opsPath, cb, arrayIndex) {
	if(this.vars.hasOwnProperty(opsPath) == false) {
		/* We have not received this variable yet and it does
		 * not already have a predefinition.  Create a new record. */
		var variable = {opsPath: opsPath, arrayIndices: {}};
		this.vars[opsPath] = variable;
	} else {
		/* We've already received this or have a predefinition. */
		var variable = this.vars[opsPath];
		
		/* Send however many values are currently persisted. */
		var outVar = {};
		outVar[opsPath] = {};
		
		/* Check to see if the requested item is for a specific array index. */
		if(this.isVarNameAnArray(opsPath) == true) {
			/* It is for a specific array index.  We need to build up an object containing
			 * the persisted values of the specific index of the array.  First lets
			 * get the requested array index.
			 */
			var arrayIndex = this.getArrayIndex(opsPath);
			
			/* Now lets loop through the samples */
			outVar[opsPath].sample = [];
			for(var i = 0; i < variable.sample.length; ++i) {
				outVar[opsPath].sample.push(this.getSampleByArrayIndex(variable, i, arrayIndex));
			}
			
		} else {
			/* It is not for a specific array index.  Send all the persisted values
			 * of the value or the entire array.
			 */
			outVar[opsPath].sample = variable.sample; 
		}
		cb(outVar);
	}
	
	if(variable.hasOwnProperty('subscribers') == false) {
		variable['subscribers'] = {};
	} 
	
	/* Check to see if the subscriber specified an array index. */
	if(arrayIndex == -1) {
		/* No array index specified.  Put the subscription on the value, or entire array. */
		variable.subscribers[cb] = cb;
	} else {
		/* An array index was specified.  Put the subscription on the specified array index. */
		if(variable.hasOwnProperty('arrayIndices') == false) {
			variable.arrayIndices = {};
		}
		
		if(variable.arrayIndices.hasOwnProperty(arrayIndex) == false) {
			/* Nobody has subscribed to this particular array index yet.  Create a new record. */
			variable.arrayIndices[arrayIndex] = {};
		}
		variable.arrayIndices[arrayIndex][cb] = cb;
	}
}



VariableServer.prototype.setVariablePersistence = function (opsPath, count) {
    if(this.vars.hasOwnProperty(opsPath) == false) {
        /* We have not received this variable yet and it does
         * not already have a predefinition.  Create a new record. */
        var variable = {opsPath: opsPath};
        this.vars[opsPath] = variable;
    } else {
        /* We've already received this or have a predefinition. */
        var variable = this.vars[opsPath];
    }
    
    if(variable.hasOwnProperty('persistence') == false) {
        /* We have not the persistence for this variable yet. */
        variable.persistence = {};
    } 
    
    variable.persistence = {count: count};
}



VariableServer.prototype.getVariablePersistence = function (opsPath) {
    if(this.vars.hasOwnProperty(opsPath) == false) {
        /* We have not received this variable yet and it does
         * not already have a predefinition.  Return the default of 1. */
        return 1;
    } else {
        /* We've already received this or have a predefinition. */
        if(typeof this.vars[opsPath].persistence === 'undefined') {
            /* Persistence is not set.  Return the default of 1. */
            return 1;
        } else {
            return this.vars[opsPath].persistence.count;
        }
    }
}



VariableServer.prototype.setVariableTimeout = function (opsPath, timeout) {
    if(this.vars.hasOwnProperty(opsPath) == false) {
        /* We have not received this variable yet and it does
         * not already have a predefinition.  Create a new record. */
        var variable = {opsPath: opsPath};
        this.vars[opsPath] = variable;
    } else {
        /* We've already received this or have a predefinition. */
        var variable = this.vars[opsPath];
    }
    
    if(variable.hasOwnProperty('timeout') == false) {
        /* We have not the timeout for this variable yet. */
        variable.timeout = {};
    } 
    
    variable.timeout = timeout;
}



VariableServer.prototype.getVariableTimeout = function (opsPath) {
    if(this.vars.hasOwnProperty(opsPath) == false) {
        /* We have not received this variable yet and it does
         * not already have a predefinition.  Return the default of 0. */
        return 0;
    } else {
        /* We've already received this or have a predefinition. */
        if(typeof this.vars[opsPath].timeout === 'undefined') {
            /* Timeout is not set.  Return the default of 0. */
            return 0;
        } else {
            return this.vars[opsPath].timeout;
        }
    }
}



VariableServer.prototype.removeSubscriber = function (opsPath, cb) {
	if(this.vars.hasOwnProperty(opsPath) == true) {
		/* We've already received this or have a predefinition. */
		var variable = this.vars[opsPath];
		
		if(variable.hasOwnProperty('subscribers') == true) {
			variable.subscribers[cb] = {};
		} 
	}
}



VariableServer.prototype.instanceEmit = function (streamID, msg, cb)
{
	this.instanceEmitter.emit(streamID, msg, cb);
}



VariableServer.prototype.logDebugEvent = function (eventID, text) {
	this.instanceEmit('events-debug', {sender: this, component:'VariableServer', eventID:eventID, text:text});
}



VariableServer.prototype.logInfoEvent = function (eventID, text) {
	this.instanceEmit('events-info', {sender: this, component:'VariableServer', eventID:eventID, text:text});
}



VariableServer.prototype.logErrorEvent = function (eventID, text) {
	this.instanceEmit('events-error', {sender: this, component:'VariableServer', eventID:eventID, text:text});
}



VariableServer.prototype.logCriticalEvent = function (eventID, text) {
	this.instanceEmit('events-critical', {sender: this, component:'VariableServer', eventID:eventID, text:text});
}




/**
 * Inherits from `EventEmitter`.
 */
VariableServer.prototype.__proto__ = Emitter.prototype;
