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

var indexRouter = require('./routes/index');
var workspaceRouter = require('./routes/workspace');
var test1 = require('./routes/testpage1');
var test2 = require('./routes/testpage2');


const util = require('util');
var Commander = require('./commander');
var BinaryEncoder = require('./binary-encoder');
var BinaryDecoder = require('./binary-decoder');
var UdpStdProvider = require('./udp-std-provider');
var VariableServer = require('./variable-server');
var ClientConnector = require('./client-connector');
var ProtobufEncoder = require('./protobuf-encoder');
var ProtobufDecoder = require('./protobuf-decoder');

var workspace = path.join(__dirname, '/workspace');

var app = express();

////Socket.io
//var io = socket_io();
//app.io = io;

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
console.log(workspace);
app.set('views', [path.join(__dirname, 'workspace'),path.join(__dirname, 'views')]);
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(__dirname + '/node_modules/'));
app.use('/js', express.static(__dirname + '/public/js/'));
app.use('/sage', express.static(path.join(__dirname, 'sage')));
app.use('/commander', express.static(path.join(__dirname, 'commander')));
app.use('/', indexRouter);
app.use('/ws', workspaceRouter);
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


var commander = new Commander(workspace, './config/development.json');
var binaryEncoder = new BinaryEncoder('./binary-encoder-config.json');
var binaryDecoder = new BinaryDecoder('./binary-decoder-config.json');
var variableServer = new VariableServer('./variable-server-config.json');
var fswConnector = new UdpStdProvider('./udpstdprovider-config.json');
var pylinerConnector = new UdpStdProvider('./pyliner-connector-config.json');
var clientConnector = new ClientConnector(workspace, './client-connector-config.json', app);
var protobufEncoder = new ProtobufEncoder('./protobuf-encoder-config.json');
var protobufDecoder = new ProtobufDecoder('./protobuf-decoder-config.json');

var airliner = commander.addInstance('airliner', function(instance) {
	instance.addApp('binary-encoder',    binaryEncoder);
	instance.addApp('binary-decoder',    binaryDecoder);
	instance.addApp('fsw-connector',     fswConnector);
	instance.addApp('pyliner-connector', pylinerConnector);
	instance.addApp('variable-server',   variableServer);
	instance.addApp('client-connector',  clientConnector);
	instance.addApp('protobuf-encoder',  protobufEncoder);
	instance.addApp('protobuf-decoder',  protobufDecoder);
});


//instance.addApp('binary-encoder',    binaryEncoder);
//instance.addApp('binary-decoder',    binaryDecoder);
//instance.addApp('fsw-connector',     fswConnector);
//instance.addApp('pyliner-connector', pylinerConnector);
//instance.addApp('variable-server',   variableServer);
//instance.addApp('client-connector',  clientConnector);
//instance.addApp('protobuf-encoder',  protobufEncoder);


module.exports = app;




