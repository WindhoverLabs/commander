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

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var socket_io = require( "socket.io" );
var fs = require('fs');
var sage = require('./sage');

var vm = require('vm');


var indexRouter = require('./routes/index');
var test1 = require('./routes/testpage1');
var test2 = require('./routes/testpage2');

var TmTcServer = require('./tmtc-server');
const dgram = require('dgram');
const binServer = dgram.createSocket('udp4');
const binSender = dgram.createSocket('udp4');
const pbServer = dgram.createSocket('udp4');
var Parser = require("binary-parser").Parser;
var fs = require('fs');
const util = require('util');

var app = express();

const config = require('./config.js');

//Socket.io
var io = socket_io();
app.io = io;

// Workspace
var workspace_path = path.join(process.env.YAMCS_WORKSPACE, '/web');
var fsw_config_file = path.join(process.env.YAMCS_WORKSPACE, '/etc/fsw-config.json');
var fsw_config = {};
if(fs.existsSync(fsw_config_file)) {
    fs.readFile(fsw_config_file, function (err, data) {
        if(err === null) {
        	fsw_config = JSON.parse(data);
        }
        else
        {
     	    console.log(err);
        }
    });
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(__dirname + '/node_modules/'));
app.use('/js', express.static(__dirname + '/public/js/'));
app.use('/sage', express.static(path.join(__dirname, 'sage')));app.use('/', indexRouter);
app.use('/*config', test2);
app.use('/flow*', test1);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

io.on('connection', function(socket) {
	socket.on('connect_error', function(socket) {
		console.log('Client: connect_error');
	});

	socket.on('connect_timeout', function(socket) {
		console.log('Client: connect_timeout');
	});

	socket.on('reconnect', function(socket) {
		console.log('Client: reconnect');
	});

	socket.on('reconnect_attempt', function(socket) {
		console.log('Client: reconnect_attempt');
	});

	socket.on('reconnecting', function(socket) {
		console.log('Client: reconnecting');
	});

	socket.on('reconnect_error', function(socket) {
		console.log('Client: reconnect_error');
	});

	socket.on('reconnect_failed', function(socket) {
		console.log('Client: reconnect_failed');
	});

	socket.on('disconnect', function(socket) {
		console.log('Client: disconnect');
		//trickComm.disconnect();
	});

  var apiSendToClient = function(bytes) {
    socket.emit('apiProxy', buffer);
  };

  var wsSendToClient = function(bytes) {
    socket.emit('wsProxy', buffer);
  };

	var tlmBypass = function(msg) {
	    socket.volatile.emit('updateTelem', msg);
	};

  var session = new sage({
    tlmBypass: tlmBypass,
    address: 'localhost',
    port: 8090});

  var getDirListing = function(directory, cb) {
    var outFiles = [];
    var fullPath = path.join(workspace_path, directory);
    fs.readdir(fullPath, (err,files) => {
      if(err == null){
        for(var i = 0; i < files.length; i++){
          var currentFile = fullPath + '/' + files[i];
          var stats = fs.statSync(currentFile);
          var transPath  = directory + '/' + files[i];
          var entry = {path: transPath, name: files[i], size: stats.size, mtime: stats.mtime};
          if (stats.isFile()) {
            entry.type = 'file';
          } else if (stats.isDirectory()) {
            entry.type = 'dir';
          } else {
            entry.type = 'unknown';
          }
          outFiles.push(entry);
        }
      }
      cb({err: err, path: directory, files: outFiles});
    });
  };
  socket.on('wsProxy', function(buffer) {
    session.wsProxy(buffer);
  });
  var service = {
    getDirListing: session.getDirListing,
    getDirListing: getDirListing
  }

	var client;
  var wsConnection;
	// exposes all methods
	for (method in service) {
	   // use a closure to avoid scope erasure
	   (function (method) {
	       // method name will be the name of incoming message
	       socket.on(method, function () {
	           /* Method is defined in the service list. */
	           if(typeof service[method] === 'function') {
	               /* The method defined is actually a javascript function that can
	                * be called. */
	               var result = service[method].apply(session, arguments);
	           } else {
	               console.log('Client attempted to call ndefined method \'' + method + '\'.');
	           }
	       });
	   })(method)
	}; 
});


var tmtc = new TmTcServer(config, function (buffer) {
	console.log(buffer);
	binSender.send(buffer, 0, buffer.length, config.binCmdPort, '127.0.0.1');
});


//tmtc.subscribe()


binServer.on('error', (err) => {
  console.log(`binServer error:\n${err.stack}`);
  server.close();
});

binServer.on('message', (msg, rinfo) => {
  //console.log(`binServer got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  tmtc.processBinaryMessage(msg);
});

binServer.on('listening', () => {
  const address = binServer.address();
  console.log(`binServer listening ${address.address}:${address.port}`);
});

console.log('Stating binary UDP listener');
binServer.bind(config.binTlmPort);



//vm.runInThisContext(testString);



//pbServer.on('error', (err) => {
//  console.log(`pbServer error:\n${err.stack}`);
//  server.close();
//});
//
//pbServer.on('message', (msg, rinfo) => {
//  //console.log(`pbServer got: ${msg} from ${rinfo.address}:${rinfo.port}`);
//  tmtc.processPBMessage(msg);
//});
//
//pbServer.on('listening', () => {
//  const address = pbServer.address();
//  console.log(`pbServer listening ${address.address}:${address.port}`);
//});
//
//console.log('Stating pb UDP listener');
//pbServer.bind(config.pbTlmPort);

module.exports = app;










var protobuf = require('protobufjs');

var Root  = protobuf.Root,
    Type  = protobuf.Type,
    Field = protobuf.Field;

var es_hk_pb = new Type("es_hk_pb");
var es_hk_payload_pb = new Type("es_hk_payload_pb");
es_hk_payload_pb.add(new Field("PerfTriggerMask",     1, "uint32"));
es_hk_payload_pb.add(new Field("ResetSubtype",        2, "uint32"));
es_hk_payload_pb.add(new Field("ProcessorResets",     3, "uint32"));
es_hk_payload_pb.add(new Field("PerfMode",            4, "uint32"));
es_hk_payload_pb.add(new Field("CFEMinorVersion",     5, "uint32"));
es_hk_payload_pb.add(new Field("ErrCounter",          6, "uint32"));
es_hk_payload_pb.add(new Field("RegisteredLibs",      7, "uint32"));
es_hk_payload_pb.add(new Field("CFERevision",         8, "uint32"));
es_hk_payload_pb.add(new Field("RegisteredExternalApps", 9, "uint32"));
es_hk_payload_pb.add(new Field("RegisteredCoreApps", 10, "uint32"));
es_hk_payload_pb.add(new Field("HeapBytesFree",      11, "uint32"));
es_hk_payload_pb.add(new Field("SysLogSize",         12, "uint32"));
es_hk_payload_pb.add(new Field("PerfFilterMask",     13, "uint32"));
es_hk_payload_pb.add(new Field("OSALMissionRevision", 14, "uint32"));
es_hk_payload_pb.add(new Field("CFECoreChecksum",    15, "uint32"));
es_hk_payload_pb.add(new Field("PerfDataStart",      16, "uint32"));
es_hk_payload_pb.add(new Field("BootSource",         17, "uint32"));
es_hk_payload_pb.add(new Field("PerfTriggerCount",   18, "uint32"));
es_hk_payload_pb.add(new Field("PerfState",          19, "uint32"));
es_hk_payload_pb.add(new Field("OSALMajorVersion",   20, "uint32"));
es_hk_payload_pb.add(new Field("ERLogEntries",       21, "uint32"));
es_hk_payload_pb.add(new Field("SysLogBytesUsed",    22, "uint32"));
es_hk_payload_pb.add(new Field("CFEMissionRevision", 23, "uint32"));
es_hk_payload_pb.add(new Field("RegisteredTasks",    24, "uint32"));
es_hk_payload_pb.add(new Field("OSALMinorVersion",   25, "uint32"));
es_hk_payload_pb.add(new Field("CmdCounter",         26, "uint32"));
es_hk_payload_pb.add(new Field("HeapMaxBlockSize",   27, "uint32"));
es_hk_payload_pb.add(new Field("PerfDataEnd",        28, "uint32"));
es_hk_payload_pb.add(new Field("ERLogIndex",         29, "uint32"));
es_hk_payload_pb.add(new Field("PerfDataToWrite",    30, "uint32"));
es_hk_payload_pb.add(new Field("CFEMajorVersion",    31, "uint32"));
es_hk_payload_pb.add(new Field("SysLogEntries",      32, "uint32"));
es_hk_payload_pb.add(new Field("OSALRevision",       33, "uint32"));
es_hk_payload_pb.add(new Field("MaxProcessorResets", 34, "uint32"));
es_hk_payload_pb.add(new Field("HeapBlocksFree",     35, "uint32"));
es_hk_payload_pb.add(new Field("SysLogMode",         36, "uint32"));
es_hk_payload_pb.add(new Field("ResetType",          37, "uint32"));
es_hk_payload_pb.add(new Field("PerfDataCount",      38, "uint32"));

var root = new Root().define("es_hk_pb").add(es_hk_pb).define("es_hk_payload_pb").add(es_hk_payload_pb);

//pbServer.bind(config.pbTlmOutPort);

var message = es_hk_payload_pb.create({CmdCounter: 4});
//message.es_hk_payload_pb = {};
//message.CmdCounter = 3;
var buffer  = es_hk_pb.encode(message).finish();
var decoded = es_hk_pb.decode(buffer);
console.log(decoded);

pbServer.send(buffer, 0, buffer.length, config.pbTlmOutPort, '127.0.0.1');





