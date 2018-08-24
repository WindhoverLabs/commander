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
const binTlmInServer = dgram.createSocket('udp4');
const binCmdOutSender = dgram.createSocket('udp4');
const pbTlmOutSender = dgram.createSocket('udp4');
const pbCmdInServer = dgram.createSocket('udp4');
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


var tmtc = new TmTcServer(config, 
   function (buffer) {
	console.log('BIN: ' + buffer);
	binCmdOutSender.send(buffer, 0, buffer.length, config.binCmdOutPort, '127.0.0.1');
}, function (buffer) {
	console.log('PB: ' + buffer);
	pbTlmOutSender.send(buffer, 0, buffer.length, config.pbTlmOutPort, '127.0.0.1');
});


//tmtc.subscribe()


binTlmInServer.on('error', (err) => {
  console.log(`binTlmInServer error:\n${err.stack}`);
  server.close();
});

binTlmInServer.on('message', (msg, rinfo) => {
  //console.log(`binTlmInServer got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  tmtc.processBinaryMessage(msg);
});

binTlmInServer.on('listening', () => {
  const address = binTlmInServer.address();
  console.log(`binTlmInServer listening ${address.address}:${address.port}`);
});

console.log('Starting binary UDP listener');
binTlmInServer.bind(config.binTlmInPort);


pbCmdInServer.on('error', (err) => {
  console.log(`pbCmdInServer error:\n${err.stack}`);
  server.close();
});

pbCmdInServer.on('message', (msg, rinfo) => {
  console.log(`pbCmdInServer got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  tmtc.processPBMessage(msg);
});

pbCmdInServer.on('listening', () => {
  const address = pbCmdInServer.address();
  console.log(`pbCmdInServer listening ${address.address}:${address.port}`);
});

console.log('Starting Protobuf UDP listener');
pbCmdInServer.bind(config.pbCmdInPort);



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



//setInterval(function() { 
//	tlmDef = tmtc.getTlmDef('/CFE_ES/HK/CFE_ES_HkPacket_t');
//    console.log(tlmDef);	
//	var esHkMsg = tlmDef.proto.lookupType('CFE_ES_HkPacket_t');
//	
//	var msg = esHkMsg.create({'Payload': {'CmdCounter': 7}});
//	
//	var pbBuffer = esHkMsg.encode(msg).finish();
//
//	var hdrBuffer = Buffer.alloc(12)
//	hdrBuffer.writeUInt16BE(tlmDef.msgID, 0);
//	hdrBuffer.writeUInt16BE(1, 2);
//	hdrBuffer.writeUInt16BE(pbBuffer.length - 1, 4);
//	hdrBuffer.writeUInt16BE(0, 6);
//	hdrBuffer.writeUInt16BE(0, 8);
//	hdrBuffer.writeUInt16BE(0, 10);
//	
//	var msgBuffer = Buffer.concat([hdrBuffer, pbBuffer]);
//	
//	pbSender.send(msgBuffer, 0, msgBuffer.length, config.pbTlmOutPort, '127.0.0.1');
//	
//	console.log(msgBuffer);
//}, 1000);


//pbServer.send(buffer, 0, buffer.length, config.pbTlmOutPort, '127.0.0.1');





