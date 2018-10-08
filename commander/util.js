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

var CommanderUtilities = CommanderUtilities || {};
var CommanderLogger    = CommanderLogger || {};
var CommanderGenerator = CommanderGenerator || {};
var CommanderValidator = CommanderValidator || {};

/* Logger API,
   allows you to set verbosity */
function CommanderLogger() {
  this.INFO  = true;
  this.DEBUG = true;
  this.ERROR = true;

  this.BGCOLOR_INFO  = '#fff';
  this.BGCOLOR_DEBUG = '#fff';
  this.BGCOLOR_ERROR = '#fff';

  this.COLOR_INFO  = 'green';
  this.COLOR_DEBUG = 'blue';
  this.COLOR_ERROR = 'red';
}
CommanderLogger.prototype.getInfo = function() {
  return this.INFO;
}
CommanderLogger.prototype.getDebug = function() {
  return this.DEBUG;
}
CommanderLogger.prototype.getError = function() {
  return this.ERROR;
}
CommanderLogger.prototype.setInfo = function(value) {
  this.INFO = value;
}
CommanderLogger.prototype.setDebug = function(value) {
  this.DEBUG = value;
}
CommanderLogger.prototype.setError = function(value) {
  this.ERROR = value;
}
CommanderLogger.prototype.Info = function(message) {
  this.log('INFO', this.BGCOLOR_INFO, this.COLOR_INFO, message);
}
CommanderLogger.prototype.Debug = function(message) {
  this.log('DEBUG', this.BGCOLOR_DEBUG, this.COLOR_DEBUG, message);
}
CommanderLogger.prototype.Error = function(message) {
  this.log('ERROR', this.BGCOLOR_ERROR, this.COLOR_ERROR, message);
}
CommanderLogger.prototype.log = function(type, bg, fg, message){
  var d = new Date().toString();
  var c = 'background: ' + bg + '; color: '+ fg;
  var t = '%c CDRLOG | '+ d + ' | '+ type +' | ' + message;
  console.log(t,c);
}

/* Generator API,
   Parse strings to JSON and
   makes unique random keys, colors etc. */
function CommanderGenerator() {
  this.unavailableKeys   = [];
  this.unavailableColors = [];
}
CommanderGenerator.prototype.makeKey = function() {
  var k = Math.random().toString(36).slice(2);
  while (k in this.unavailableKeys) {
    k = Math.random().toString(36).slice(2);
  }
  this.unavailableKeys.push(k);
  return k;
}
CommanderGenerator.prototype.disposeKey = function(k) {
  var success = false;
  var index = this.unavailableKeys.indexOf(k);
  if(index != -1){
    this.unavailableKeys.splice(index, 1);
    success = true;
  }
  return success;
}
CommanderGenerator.prototype.makeColor = function() {
  var letters = '0123456789abcdef';
  do {
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
  } while (color in this.unavailableColors);
  this.unavailableColors.push(color);
  return color;
}
CommanderGenerator.prototype.disposeColor = function(c) {
  var success = false;
  var index = this.unavailableColors.indexOf(c);
  if(index != -1){
    this.unavailableColors.splice(index, 1);
    success = true;
  }
  return success;
}
CommanderGenerator.prototype.makeUUID = function() {
  var d = new Date().getTime();
  if(window.performance && typeof window.performance.now === "function"){
      d += performance.now(); // use high-precision timer if available
  }
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
}
CommanderGenerator.prototype.parseJSON = function(str) {
  var JSONObj = undefined;
  if (typeof str === 'string' || str instanceof String) {
      // it's a string
      JSONObj = JSON.parse(str);
  }
  else if (typeof str === 'object' || str instanceof Object) {
      // it's an object
      JSONObj = str;
  }
  return JSONObj;
}

/* Validator API,
   Collector of validation functions */
function CommanderValidator() {
}
CommanderValidator.prototype.isArray = function(obj) {
  /* Backwards compatability */
  if (typeof Array.isArray === 'undefined') {
    Array.isArray = function(obj) {
      return (Object.prototype.toString.call(obj) === '[object Array]');
    }
  }
  return Array.isArray(obj);
}
CommanderValidator.prototype.isDescendant = function(parent, child) {
  var node = child.parentNode;
  while (node != null) {
      if (node == parent) {
          return true;
      }
      node = node.parentNode;
  }
  return false;
}
CommanderValidator.prototype.assert = function(condition) {
  var success = true;
  if (!condition) {
      throw "Assertion failed";
      success = false;
  }
  return success
}


/* CommanderUtilities is a wrapper for above API's
   Increases the ease of use and code understandability */
function CommanderUtilities() {
  this.logger    = new CommanderLogger();
  this.generator = new CommanderGenerator();
  this.validator = new CommanderValidator();

}
CommanderUtilities.prototype.logInfo = function (...message) {
  this.logger.Info(message.join(''));
}
CommanderUtilities.prototype.logDebug = function (...message) {
  this.logger.Debug(message.join(''));
}
CommanderUtilities.prototype.logError = function (...message) {
  this.logger.Error(message.join(''));
}
CommanderUtilities.prototype.setLogFilter = function (info = 1, debug = 0, error = 1) {
  /* Set Info */
  if (info == 1) {
    this.logger.setInfo(true);
  }
  else {
    this.logger.setInfo(false);
  }
  /* Set Debug */
  if (debug == 1) {
    this.logger.setDebug(true);
  }
  else {
    this.logger.setDebug(false);
  }
  /* Set Error */
  if (error == 1) {
    this.logger.setError(true);
  }
  else {
    this.logger.setError(false);
  }
}
CommanderUtilities.prototype.getLogFilter = function () {
  var status = {
    INFO:  this.logger.getInfo(),
    DEBUG: this.logger.getDebug(),
    ERROR: this.logger.getError()
  };
  this.logInfo('Logger Status | ', JSON.stringify(status));
}
CommanderUtilities.prototype.makeKey = function() {
  return this.generator.makeKey();
}
CommanderUtilities.prototype.disposeKey = function(k) {
  if (!this.generator.disposeColor(k)) {
    this.logError(' Unable to dispose key ', k);
  }
}
CommanderUtilities.prototype.makeColor = function() {
  return this.generator.makeColor();
}
CommanderUtilities.prototype.disposeColor = function(c) {
  if (!this.generator.disposeColor(c)) {
    this.logError(' Unable to dispose color ', c);
  }
}
CommanderUtilities.prototype.makeUUID = function() {
  return this.generator.makeUUID();
}
CommanderUtilities.prototype.parseJSON = function(str) {
  var strObj = this.generator.parseJSON(str);
  if (strObj == undefined | strObj == null) {
   this.logError('Parse JSON | ', 'Unable to parse string : ', strObj );
  }
  return strObj;
}
CommanderUtilities.prototype.isArray = function(obj) {
  return this.validator.isArray(obj)
}
CommanderUtilities.prototype.isDescendant = function(parent, child) {
  return this.validator.isDescendant(parent, child)
}
CommanderUtilities.prototype.assert = function(condition, message) {
  if (!this.validator.assert(condition)) {
    this.logError('Assertion Failed | ', message );
  }
}

/* Expose the CommanderUtilities to browser */
var cu = new CommanderUtilities();
