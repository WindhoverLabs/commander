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

var createError = require( 'http-errors' );
var express = require( 'express' );
var path = require( 'path' );
var cookieParser = require( 'cookie-parser' );
var logger = require( 'morgan' );
var socket_io = require( 'socket.io' );
var fs = require( 'fs' );

var indexRouter = require( './routes/index' );


const util = require( 'util' );

global.CDR_WORKSPACE = process.env.CDR_WORKSPACE || path.join( __dirname, '/workspace' );
global.CDR_INSTALL_DIR = __dirname;

global.NODE_APP = express();

/* View engine setup */
global.NODE_APP.set( 'views', [ path.join( __dirname, 'workspace' ), path.join( __dirname, 'views' ) ] );
global.NODE_APP.set( 'view engine', 'pug' );

global.NODE_APP.use( logger( 'dev' ) );
global.NODE_APP.use( express.json() );
global.NODE_APP.use( express.urlencoded( {
  extended: false
} ) );
global.NODE_APP.use( cookieParser() );
global.NODE_APP.use( express.static( path.join( __dirname, 'public' ) ) );
global.NODE_APP.use( '/scripts', express.static( __dirname + '/node_modules/' ) );
global.NODE_APP.use( '/js', express.static( __dirname + '/public/js/' ) );
global.NODE_APP.use( '/sage', express.static( path.join( __dirname, 'sage' ) ) );
global.NODE_APP.use( '/commander', express.static( path.join( __dirname, 'commander' ) ) );
/* jsdoc */
global.NODE_APP.use( '/client-docs', express.static( __dirname + '/documents/jsdoc/client-docs/' ) );
global.NODE_APP.use( '/server-docs', express.static( __dirname + '/documents/jsdoc/server-docs/' ) );

global.NODE_APP.use( '/', indexRouter );

global.PANELS_TREE = [];
global.LAYOUTS_TREE = [];
global.CONTENT_TREE = {};

var commander = require( CDR_WORKSPACE );

module.exports = global.NODE_APP;