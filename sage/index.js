'use strict';

var http = require('http');
var events = require('events');
var Emitter = require('events').EventEmitter;
var WebSocketClient = require('websocket').client;
var ProtoBuf = require('protobufjs');
var builder = ProtoBuf.loadProtoFile('./message.proto');
// var JS = builder.build('js');
// var IssueCommandRequest = builder.build("IssueCommandRequest");
var path = require('path');
var fs = require('fs');

var emit = Emitter.prototype.emit;

exports = module.exports = Sage;

exports.events = [
  'error',
  'connect',
  'connectFailed'
];

var listenerCount = Emitter.listenerCount ||
  function (emitter, type) { return emitter.listeners(type).length }


function Sage(sessionParams) {
  this.activeInstances = [];
  this.socket;
  this.subscribers = [];
  //this.connection;
  this.port = 0;
  this.address = '';
  this.defaultInstance = null;
  this.cmdSeqNum = 0;
  this.tlmSeqNum = 0;
  this.ClientProxy = null;

  this.tlmBypass = null;
  var self = this;

  if(typeof sessionParams === 'undefined') {
    throw "No parameters supplied.  Must provide at least address and port number of the TMTC server.";
  }

  if(sessionParams.hasOwnProperty('address')){
    this.address = sessionParams.address;
  } else {
    throw "No address given.";
  }

  if(sessionParams.hasOwnProperty('port')){
    this.port = sessionParams.port;
  } else {
    throw "No port specified.";
  }

  if(sessionParams.hasOwnProperty('tlmBypass')){
    this.tlmBypass = sessionParams.tlmBypass;
  }

  if(sessionParams.hasOwnProperty('defaultInstance')){
    process.nextTick(function(){
      self.setDefaultInstance(sessionParams.defaultInstance);
    });
  }
};


/**
 * Inherits from `EventEmitter`.
 */
Sage.prototype.__proto__ = Emitter.prototype;

Sage.prototype.subscribeToEvents = function (args){
  var msg = {'events':'subscribe'};
  if(args !== undefined && args.hasOwnProperty('instance')){
    /* The caller specified an instance.  Get the specific instance. */
    var instance = this.getActiveInstanceByName(args.instance);
    if(instance == null){
      /* We haven't bound this instance yet.  Bind it and defer the
       * subscription to after the bind is complete.
       */
      this.bindToInstance(args.instance, function (err, newInstance){
        self.tlmSeqNum++;
        var msgOut = '[1,1,' + self.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
        newInstance.connection.sendUTF(msgOut);
      });
    } else {
      /* We have already bound this instance.  Just go ahead and subscribe. */
      this.tlmSeqNum++;
      var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
      instance.connection.sendUTF(msgOut);
    }
  } else {
    /* The caller did not specify an instance.  Go ahead and just use the
     * default instance, if defined.
     */
    this.tlmSeqNum++;
    var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
    this.defaultInstance.connection.sendUTF(msgOut);
  }
};


Sage.prototype.subscribeToAlarms = function (args){
  var msg = {'alarms':'subscribe'};
  if(args !== undefined && args.hasOwnProperty('instance')){
    /* The caller specified an instance.  Get the specific instance. */
    var instance = this.getActiveInstanceByName(args.instance);
    if(instance == null){
      /* We haven't bound this instance yet.  Bind it and defer the
       * subscription to after the bind is complete.
       */
      this.bindToInstance(args.instance, function (err, newInstance){
        self.tlmSeqNum++;
        var msgOut = '[1,1,' + self.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
        newInstance.connection.sendUTF(msgOut);
      });
    } else {
      /* We have already bound this instance.  Just go ahead and subscribe. */
      this.tlmSeqNum++;
      var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
      instance.connection.sendUTF(msgOut);
    }
  } else {
    /* The caller did not specify an instance.  Go ahead and just use the
     * default instance, if defined.
     */
    this.tlmSeqNum++;
    var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
    this.defaultInstance.connection.sendUTF(msgOut);
  }
};


Sage.prototype.subscribe = function (args, updateFunc){
  this.subscribers.push({'params':args, 'updateFunc':updateFunc});

  var msg = {'parameter':'subscribe', 'data':{'list':args.tlm}};
  console.log("-*->",msg)
  var self = this;

  if(args.hasOwnProperty('instance')){
    /* The caller specified an instance.  Get the specific instance. */
    var instance = this.getActiveInstanceByName(args.instance);
    if(instance == null){
      /* We haven't bound this instance yet.  Bind it and defer the
       * subscription to after the bind is complete.
       */
      this.bindToInstance(args.instance, function (err, newInstance){
        self.tlmSeqNum++;
        var msgOut = '[1,1,' + self.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
        newInstance.connection.sendUTF(msgOut);
      });
    } else {
      /* We have already bound this instance.  Just go ahead and subscribe. */
      this.tlmSeqNum++;
      var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
      instance.connection.sendUTF(msgOut);
    }
  } else {
    /* The caller did not specify an instance.  Go ahead and just use the
     * default instance, if defined.
     */
    this.tlmSeqNum++;
    var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
    this.defaultInstance.connection.sendUTF(msgOut);
  }
};

Sage.prototype.unsubscribe = function (args){
  console.log('unsubscribe: ' + JSON.stringify(args));

  var msg = {'parameter':'unsubscribe', 'data':{'list':args.tlm}};

  var self = this;

  if(args.hasOwnProperty('instance')){
    /* The caller specified an instance.  Get the specific instance. */
    var instance = this.getActiveInstanceByName(args.instance);
    if(instance == null){
      /* We haven't bound this instance yet.  Bind it and defer the
       * subscription to after the bind is complete.
       */
      this.bindToInstance(args.instance, function (err, newInstance){
        self.tlmSeqNum++;
        var msgOut = '[1,1,' + self.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
        newInstance.connection.sendUTF(msgOut);
      });
    } else {
      /* We have already bound this instance.  Just go ahead and subscribe. */
      this.tlmSeqNum++;
      var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
      instance.connection.sendUTF(msgOut);
    }
  } else {
    /* The caller did not specify an instance.  Go ahead and just use the
     * default instance, if defined.
     */
    this.tlmSeqNum++;
    var msgOut = '[1,1,' + this.tlmSeqNum + ',' + JSON.stringify(msg) + ']';
    this.defaultInstance.connection.sendUTF(msgOut);
  }
};

Sage.prototype.getTlmInfo = function(tlm, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/'+this.defaultInstance.name+'/parameters'+ tlm['tlm'][0]['name'], function(response) {
    var outData = "";
    response.on('data', function(data) {
      outData += data;
    });
    response.on('end', function() {
      var jsonObj = JSON.parse(outData);
      cb(jsonObj);
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.ServerPost = function (path, data, cb){
  var post_options = {
    host: this.address,
    port: this.port,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/protobuf',
      'Accept': 'application/protobuf'
    }
  };

  var post_data = data.encode().toBuffer();

  var post_req = http.request(post_options);

  post_req.write(post_data);
  post_req.end();
}

Sage.prototype.sendCommand = function(args, cb)
{
  var cmdMsg = new IssueCommandRequest({
    'assignment': args.args,
    'origin': 'user@host',
    'sequenceNumber': this.cmdSeqNum,
    'dryRun': false
  });

  if(this.defaultInstance !== null) {
	var path = '/api/processors/' + this.defaultInstance.name + '/realtime/commands/' + args.name + '?nolink';
	this.ServerPost(path, cmdMsg, cb);
  }
};

Sage.prototype.getAllInstances = function(cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/instances', function(response) {
    var outData = "";
    response.on('data', function(data) {
      outData += data;
    });
    response.on('end', function() {
      var jsonObj = JSON.parse(outData);
      cb(jsonObj);
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getCommandInfo = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + this.defaultInstance.name + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getInstance = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getAllLinks = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getInstanceLinks = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getADSBJson = function (cb) {
  var apiUrl = 'http://' + this.address + ':8080/dump1090/data.json';
  http.get(apiUrl, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getInstanceLink = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.disableInstanceLink = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.disableInstanceLink = function (cmd, cb) {
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getEventsList = function (cmd, cb) {
  //var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  //http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
  //  var outData = '';
  //  response.on('data', function (data) {
  //    outData += data;
  //  });
  //  response.on('end', function (cb) {
  //    cb(JSON.parse(outData));
  //  });
  //  // consume response body
  //  response.resume();
  //}).on('error', (e) => {
  //  console.log('Got error: ' + e.message);
  //});
};

Sage.prototype.getStreamsList = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getStreamInfo = function (cmd, cb) {
  var apiUrl = 'http://' + this.address + ':' + this.port + '/api';
  http.get(apiUrl + '/mdb/' + cmd.instance + '/commands/' + cmd.name, function (response) {
    var outData = '';
    response.on('data', function (data) {
      outData += data;
    });
    response.on('end', function () {
      cb(JSON.parse(outData));
    });
    // consume response body
    response.resume();
  }).on('error', (e) => {
    console.log('Got error: ' + e.message);
  });
};

Sage.prototype.getActiveInstanceByName = function(name) {
  for(var i = 0; i < this.activeInstances.length; ++i)
  {
     if(this.activeInstances.name == name){
        return this.activeInstances[i];
     }
  }

  return null;
};



Sage.prototype.bindToInstance = function(name, cb){
  var instance = this.getActiveInstanceByName(name);
  var self = this;

  if(instance != null) {
    /* Instance is already bound.  Call the callback with the already bound
     * instance object. */
    cb(null, instance);
  } else {
    instance = {name:name, client: new WebSocketClient()};
    this.activeInstances.push(instance);

    instance.client.connect('ws://' + this.address + ':' + this.port + '/' + name + '/_websocket', null, null, null, null);

    instance.client.on('connectFailed', function(error) {
      /* Connection failed.  Emit a failure event back to the owner of the
       * Sage object, and return an error code back to the caller.
       */
      self.emit('connectFailed', error);
      cb(error, null);
    });

    instance.client.on('connect', function(connection) {
      self.tlmSeqNum = 0;
      self.cmdSeqNum = 0;
      instance.connection = connection;

      cb(null, instance);

      self.subscribeToEvents();
      self.subscribeToAlarms();

      instance.connection.on('message', function(msg) {
        var obj = JSON.parse(msg.utf8Data);
        //console.log(obj);
        if(typeof self.tlmBypass === 'function') {
          self.tlmBypass({instance:name, data:obj});
        }
        else
        {
          switch(obj[1]){
            case 1:
              /* Request   */
              //console.log("Request:  " + JSON.stringify(obj));
              break;

            case 2:
              /* Reply     */
              //console.log("Reply:  " + JSON.stringify(obj));
              break;

            case 3:
              /* Exception */
              //console.log("Exception:  " + JSON.stringify(obj));
              break;

            case 4:
              /* Data      */
              for(var i=0; i < obj[3].data.parameter.length; ++i){
                for(var j=0; j < self.subscribers.length; ++j) {
                  var param = obj[3].data.parameter[i];
                  var subscriber = self.subscribers[j];

                  for (var k = 0; k < subscriber.params.tlm.length; ++k) {
                    if (subscriber.params.tlm[k].name == param.id.name) {
                      if (subscriber.params.hasOwnProperty('homogeneity')) {
                        /* First store the parameter so we can compare homogeneity. */
                        subscriber.params.tlm[k].sample = param;

                        /* Get the optional parameters. */
                        var homogenousBy = 'acquisitionTime';
                        var tolerance = 0;
                        if (subscriber.params.homogeneity.hasOwnProperty('by')) {
                          homogenousBy = subscriber.params.homogeneity.by;
                        };
                        if (subscriber.params.homogeneity.hasOwnProperty('tolerance')) {
                          tolerance = subscriber.params.homogeneity.tolerance;
                        };

                        /* Now determine if the samples are homogenous.  First,
                         * Get the timestamp of the current sample.
                         */
                        var timeStamp = new Date(param[homogenousBy]);

                        /* Now iterate through the remaining samples.  If any
                         * of them fall outside the defined tolerance, flag
                         * this not homogenous.
                         */
                        var isHomogenous = true;
                        for (var iSample = 0; iSample < subscriber.params.tlm.length; ++iSample) {
                          if(subscriber.params.tlm[iSample].hasOwnProperty('sample') == false){
                            isHomogenous = false;
                            break;
                          } else {
                            var sampleTimeStamp = new Date(subscriber.params.tlm[iSample].sample[homogenousBy]);
                            var diff = timeStamp.getTime() - sampleTimeStamp.getTime();
                            if (Math.abs(diff) > tolerance) {
                              isHomogenous = false;
                              break;
                            }
                          }
                        }
                        if(isHomogenous)
                        {
                          /* The sample group is homogenous.  Send the subscriber
                           * an array containing the entire group.
                           */
                          var params = [];
                          for (var iSample = 0; iSample < subscriber.params.tlm.length; ++iSample) {
                            params.push(subscriber.params.tlm[iSample].sample);
                          }
                          if(typeof subscriber.updateFunc === 'function'){
                            subscriber.updateFunc(params);
                          }
                        }
                      } else {
                        /* Homogeneity is not defined.  Just give it to the subscriber
                         * as its received. */
                        if(typeof subscriber.updateFunc === 'function'){
                          subscriber.updateFunc(param);
                        }
                      }
                    }
                  }
                }
              };
              break;
          };
        };
      });
    });
  }
}


Sage.prototype.setDefaultInstance = function(name, cb) {
  var instance = this.getActiveInstanceByName(name);
  var self = this;

  if(instance == null){
    /* Instance hasn't been bound yet.  Bind it. */
    this.bindToInstance(name, function(err, instance){
      /* Instance is bound now.  Set the default to the new instance. */
      self.defaultInstance = instance;
      if(typeof cb === 'function'){
        cb(err);
      }
      if(err != null) {
        if (listenerCount(self, 'connectFailed') !== 0) {
          self.emit('connectFailed', name, err);
        }
      } else {
        if (listenerCount(self, 'connect') !== 0) {
          self.emit('connect', name);
        }
      }
    });
  } else {
    /* Instance is already bound.  Just set the default to the new instance. */
    this.defaultInstance = instance;
    if(typeof cb === 'function'){
      cb(null);

      self.emit('connect', name);
    }
  }
};
