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

var Commander = require( './index' );
var CommanderApp = require( './commander_app' );
var CommanderInstance = require( './commander_instance' );
var CommanderPlugin = require( './classes/CdrPlugin' ).CdrPlugin;
var TestConfig = require( '../config/test.json' );
var Config = require( './config.js' );
var Emitter = require( 'events' );




describe( 'Commander', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.CommanderConfig.configFile;
    global.NODE_APP = {};
    this.cdr = new Commander( workspace, configFile );
    Config.loadFile( configFile );
    this.emitter = new Emitter();
    this.emitter.emitter = {};
    this.emitter.emitter.on = function() {};
    this.cdr.setDefaultInstance( this.emitter );


  } );

  it( 'Should define sockets', () => {

    spyOn( this.cdr, 'logInfoEvent' );
    spyOn( this.cdr, 'logErrorEvent' );
    spyOn( this.cdr, 'logDebugEvent' );
    spyOn( this.cdr, 'addSubscription' );
    spyOn( this.cdr, 'sendCmd' );

    var self = this;
    var sock = function() {
      this.handshake = {}
      this.handshake.address = 'localhost';
    };
    sock.prototype.__proto__ = Emitter.prototype;
    sock.prototype.disconnect = function() {};
    sock.prototype.on = function( str, cb ) {

      self.cdr.logInfoEvent.calls.reset();
      self.cdr.logErrorEvent.calls.reset();
      self.cdr.logDebugEvent.calls.reset();
      self.cdr.addSubscription.calls.reset();
      self.cdr.sendCmd.calls.reset();

      switch ( str ) {
        case 'connect_error':
          cb( 'test' );
          expect( self.cdr.logErrorEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'connect_timeout':
          cb();
          expect( self.cdr.logErrorEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'reconnect':
          cb( 10 );
          expect( self.cdr.logInfoEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'reconnect_attempt':
          cb();
          expect( self.cdr.logInfoEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'reconnecting':
          cb( 10 );
          expect( self.cdr.logInfoEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'reconnect_error':
          cb( 'test' );
          expect( self.cdr.logErrorEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'reconnect_failed':
          cb();
          expect( self.cdr.logErrorEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'disconnect':
          cb();
          expect( self.cdr.logInfoEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'ping':
          cb();
          expect( self.cdr.logDebugEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'pong':
          cb( 10 );
          expect( self.cdr.logDebugEvent ).toHaveBeenCalledTimes( 1 );
          break;
        case 'subscribe':
          cb( [] );
          expect( self.cdr.addSubscription ).toHaveBeenCalledTimes( 1 );
          break;
        case 'sendCmd':
          cb( {} );
          expect( self.cdr.sendCmd ).toHaveBeenCalledTimes( 1 );
          break;
        case 'pluginFunction':
          cb();
          break;
      }

    }

    global.NODE_APP.io.emit( 'connection', new sock() );

  } );

  describe( 'Constructor', () => {

    it( 'Should define instance variables', () => {
      expect( this.cdr.instances ).not.toEqual( {} );
      expect( global.NODE_APP.io ).toBeDefined();

    } );


  } );

  describe( 'getPanelsByPath and getLayoutsByPath and getWidgetsByPath', () => {

    it( 'Should return default panel objects on empty request', () => {

      expect( this.cdr.getPanelsByPath( [ '' ], {} ) ).toEqual( {} );
      expect( this.cdr.getPanelsByPath( [ 'cfe' ], {
        'cfe': [ 'success' ]
      } ) ).toEqual( {} );
      expect( this.cdr.getPanelsByPath( [ 'cfe' ], {
        'cfe': {
          'nodes': {
            'main': {
              'type': 1
            }
          }
        }
      } ) ).toEqual( {
        'main': {
          'type': 1
        }
      } );
      expect( this.cdr.getPanelsByPath( [ 'cfe' ], {
        'cfe': {
          'nodes': {
            'main': {}
          }
        }
      } ) ).toEqual( {
        'main': {}
      } );
      expect( this.cdr.getPanelsByPath( [], {} ) ).toEqual( undefined );



    } );
    it( 'Should return default layout objects on empty request', () => {

      expect( this.cdr.getLayoutsByPath( [ '' ], {} ) ).toEqual( {} );
      expect( this.cdr.getLayoutsByPath( [ 'cfe' ], {
        'cfe': [ 'success' ]
      } ) ).toEqual( {} );
      expect( this.cdr.getLayoutsByPath( [ 'cfe' ], {
        'cfe': {
          'nodes': {
            'main': {
              'type': 2
            }
          }
        }
      } ) ).toEqual( {
        'main': {
          'type': 2
        }
      } );
      expect( this.cdr.getLayoutsByPath( [ 'cfe' ], {
        'cfe': {
          'nodes': {
            'main': {}
          }
        }
      } ) ).toEqual( {
        'main': {}
      } );
      expect( this.cdr.getLayoutsByPath( [], {} ) ).toEqual( undefined );



    } );
    it( 'Should return default widget objects on empty request', () => {

      expect( this.cdr.getWidgetsByPath( [ '' ], {} ) ).toEqual( {} );
      expect( this.cdr.getWidgetsByPath( [ 'cfe' ], {
        'cfe': [ 'success' ]
      } ) ).toEqual( {} );
      expect( this.cdr.getWidgetsByPath( [ 'cfe' ], {
        'cfe': {
          'nodes': {
            'main': {
              'type': 3
            }
          }
        }
      } ) ).toEqual( {
        'main': {
          'type': 3
        }
      } );
      expect( this.cdr.getWidgetsByPath( [ 'cfe' ], {
        'cfe': {
          'nodes': {
            'main': {}
          }
        }
      } ) ).toEqual( {
        'main': {}
      } );
      expect( this.cdr.getWidgetsByPath( [], {} ) ).toEqual( undefined );



    } );

  } );

  it( 'Should verify a plugin is registered', () => {
    var someFunc = {
      name: 'someFunc',
      cb: jasmine.any( Function )
    }
    var regPluginCt_before = this.cdr.registeredFunctions.length;
    this.cdr.registerFunction( 'pluginName', someFunc );
    expect( this.cdr.registeredFunctions.length ).toBe( regPluginCt_before + 1 )

  } );

  it( 'Should get panels, layouts or widget content object', () => {
    var someFunc = function( content ) {
      expect( content.hasOwnProperty( 'cfe_p' ) ).toBe( true );
      expect( content.hasOwnProperty( 'cfe_l' ) ).toBe( true );
      expect( content.hasOwnProperty( 'cfe_w' ) ).toBe( true );
    }
    global.CONTENT_TREE = {};
    global.CONTENT_TREE[ 'cfe_p' ] = {
      'nodes': {
        'main': {
          'type': 1
        }
      }
    }
    global.CONTENT_TREE[ 'cfe_l' ] = {
      'nodes': {
        'main': {
          'type': 2
        }
      }
    }
    global.CONTENT_TREE[ 'cfe_w' ] = {
      'nodes': {
        'main': {
          'type': 3
        }
      }
    }
    this.cdr.getPanels( '/', someFunc );
    this.cdr.getLayouts( '/', someFunc );
    this.cdr.getWidgets( '/', someFunc );
  } );

  describe( 'queryConfigDB', () => {

    beforeAll( () => {

      this.valid_testcase = '$.Airliner.apps.CFE.events';
      this.valid_testcase1 = '$.Airliner.apps.AMC.events';
      this.valid_testcase2 = '$.Airliner.apps.AMC.scheduler';

      this.invalid_testcases1 = {};
      this.invalid_testcases2 = [];

    } );

    it( 'Should accept valid paths and call callback on response', () => {
      this.cdr.defaultInstance.on( Config.get( 'queryConfigStreamID' ), function( inpath, cb ) {} );
      spyOn( this.cdr.defaultInstance._events, [ Config.get( 'queryConfigStreamID' ) ] );

      this.cdr.queryConfigDB( this.valid_testcase, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance._events[ Config.get( 'queryConfigStreamID' ) ] ).toHaveBeenCalledTimes( 1 );
      expect( this.cdr.defaultInstance._events[ Config.get( 'queryConfigStreamID' ) ].calls.argsFor( 0 )[ 0 ] ).toBe( this.valid_testcase );

      this.cdr.queryConfigDB( this.valid_testcase1, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance._events[ Config.get( 'queryConfigStreamID' ) ] ).toHaveBeenCalledTimes( 2 );
      expect( this.cdr.defaultInstance._events[ Config.get( 'queryConfigStreamID' ) ].calls.argsFor( 1 )[ 0 ] ).toBe( this.valid_testcase1 );

      this.cdr.queryConfigDB( this.valid_testcase2, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance._events[ Config.get( 'queryConfigStreamID' ) ] ).toHaveBeenCalledTimes( 3 );
      expect( this.cdr.defaultInstance._events[ Config.get( 'queryConfigStreamID' ) ].calls.argsFor( 2 )[ 0 ] ).toBe( this.valid_testcase2 );
    } );

    it( 'Should not accept invalid paths', () => {
      spyOn( this.cdr.defaultInstance, 'emit' );
      this.cdr.defaultInstance.emit.calls.reset();

      this.cdr.queryConfigDB( this.invalid_testcases1, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
      this.cdr.queryConfigDB( this.invalid_testcases2, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

    } );

  } );

  describe( 'getDirectoryListing', () => {

  } );

  describe( 'getCmdDef', () => {

    beforeAll( () => {

      this.valid_testcase = {
        name: '/AMC/Noop'
      };
      this.invalid_testcase = {};
      this.invalid_testcase1 = [];
      this.invalid_testcase3 = {
        name1: '/AMC/Noop'
      };

    } );

    it( 'should accept valid command object call callback on the definition', () => {
      var self = this;
      var someFunc = function( resp ) {
        expect( resp.opsPath ).toEqual( self.valid_testcase.name );
      }
      this.cdr.defaultInstance.on( Config.get( 'cmdDefReqStreamID' ), ( reqObj, cb ) => {
        cb( reqObj );
      } );
      this.cdr.getCmdDef( this.valid_testcase, someFunc );
    } );

    it( 'Should not accept invalid command objects to pass through emit', () => {

      spyOn( this.cdr.defaultInstance, 'emit' );
      this.cdr.getCmdDef( this.invalid_testcase, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

      this.cdr.getCmdDef( this.invalid_testcase1, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

      this.cdr.getCmdDef( this.invalid_testcase2, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

    } );

  } );

  describe( 'getTlmDefs', () => {

    beforeAll( () => {

      this.valid_testcase = [ {
        name: '/AMC/AMC_HkTlm_t/usCmdCnt'
      } ];
      this.valid_testcase1 = [ {
        name: '/AMC/AMC_HkTlm_t/usCmdCnt'
      }, {
        name: '/AMC/AMC_HkTlm_t/usCmdErrCnt'
      } ]

      this.valid_name_list = [ '/AMC/AMC_HkTlm_t/usCmdCnt', '/AMC/AMC_HkTlm_t/usCmdErrCnt' ];

      this.invalid_testcase = '';
      this.invalid_testcase1 = 9;

    } );

    it( 'Should accept valid request obejct and call callback on telemetry definition object', () => {
      var self = this;
      var someFunc = function( response ) {
        for ( var e in response ) {
          expect( self.valid_name_list.indexOf( response[ e ].name ) ).not.toEqual( -1 );
        }
      };

      this.cdr.defaultInstance.on( Config.get( 'varDefReqStreamID' ), ( reqObj, cb ) => {
        cb( reqObj );
      } );
      this.cdr.getTlmDefs( this.valid_testcase, someFunc );
      this.cdr.getTlmDefs( this.valid_testcase1, someFunc );

    } );

    it( "Should not accept invalid request object and let them not pass to emit", () => {
      spyOn( this.cdr.defaultInstance, 'emit' );
      this.cdr.getTlmDefs( this.invalid_testcase, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
      this.cdr.getTlmDefs( this.invalid_testcase1, jasmine.any( Function ) );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

    } );

  } );

  it( 'Should simply apply callback on send command call', () => {
    var someFunc = function( str ) {
      expect( str ).toBe( 'sendCommand' );
    }
    this.cdr.sendCommand( someFunc );
  } );

  describe( 'sendCmd', () => {

    beforeAll( () => {
      this.valid_testcase = {
        ops_path: '/VM/Noop',
        args: []
      };

      this.invalid_testcase = {
        ops_path: '/VM/Noop'
      };
      this.invalid_testcase1 = {
        args: {}
      };
      this.invalid_testcase2 = {};
      this.invalid_testcase3 = 9;
      this.invalid_testcase4 = '';
      this.spy = spyOn( this.cdr.defaultInstance, 'emit' );
    } );

    it( 'Should accept valid command message and emit on command send stream', () => {
      this.cdr.defaultInstance.emit.calls.reset();
      this.cdr.sendCmd( this.valid_testcase, [] );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 1 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 0 )[ 1 ].ops_path ).toEqual( this.valid_testcase.ops_path );

    } );

    it( 'Should not accept invalid command message', () => {
      this.cdr.defaultInstance.emit.calls.reset();
      this.cdr.sendCmd( this.invalid_testcase, [] );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
      this.cdr.sendCmd( this.invalid_testcase1, [] );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
      this.cdr.sendCmd( this.invalid_testcase2, [] );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
      this.cdr.sendCmd( this.invalid_testcase3, [] );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
      this.cdr.sendCmd( this.invalid_testcase4, [] );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );
    } );

  } );

  describe( 'addSubscription', () => {

    beforeAll( () => {

      this.valid_testcase = [];
      this.valid_testcase1 = [ '/CFE/CFE_EVS_TlmPkt_t/Payload.CommandCounter' ];
      this.valid_testcase2 = [ '/CFE/CFE_EVS_TlmPkt_t/Payload.CommandCounter', '/CFE/CFE_EVS_TlmPkt_t/Payload.CommandErrCounter' ];

      this.invalid_testcase = 'test';
      this.invalid_testcase1 = 9;
      this.spy = spyOn( this.cdr.defaultInstance, 'emit' );
    } );

    it( 'Should allow valid telemetry subscription request and pass on to emit', () => {
      this.cdr.defaultInstance.emit.calls.reset();
      this.cdr.addSubscription( 'test123', this.valid_testcase );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 1 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 0 )[ 1 ].opsPath ).toEqual( this.valid_testcase );

      this.cdr.addSubscription( 'test123', this.valid_testcase1 );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 2 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 1 )[ 1 ].opsPath ).toEqual( this.valid_testcase1 );

      this.cdr.addSubscription( 'test123', this.valid_testcase2 );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 3 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 2 )[ 1 ].opsPath ).toEqual( this.valid_testcase2 );
    } );

    it( 'Should allow invalid telemetry subscription requests', () => {
      this.cdr.defaultInstance.emit.calls.reset();
      this.cdr.addSubscription( 'test123', this.invalid_testcase );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

      this.cdr.addSubscription( 'test123', this.invalid_testcase1 );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

    } );




  } );

  describe( 'removeSubscription', () => {

    beforeAll( () => {

      this.valid_testcase = [];
      this.valid_testcase1 = [ '/CFE/CFE_EVS_TlmPkt_t/Payload.CommandCounter' ];
      this.valid_testcase2 = [ '/CFE/CFE_EVS_TlmPkt_t/Payload.CommandCounter', '/CFE/CFE_EVS_TlmPkt_t/Payload.CommandErrCounter' ];

      this.invalid_testcase = 'test';
      this.invalid_testcase1 = 9;
      this.spy = spyOn( this.cdr.defaultInstance, 'emit' );
    } );

    it( 'Should allow valid telemetry unsubscribe request and pass on to emit', () => {
      this.cdr.defaultInstance.emit.calls.reset();
      this.cdr.removeSubscription( 'test123', this.valid_testcase );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 1 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 0 )[ 1 ].opsPath ).toEqual( this.valid_testcase );

      this.cdr.removeSubscription( 'test123', this.valid_testcase1 );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 2 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 1 )[ 1 ].opsPath ).toEqual( this.valid_testcase1 );

      this.cdr.removeSubscription( 'test123', this.valid_testcase2 );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 3 );
      expect( this.cdr.defaultInstance.emit.calls.argsFor( 2 )[ 1 ].opsPath ).toEqual( this.valid_testcase2 );
    } );

    it( 'Should allow invalid telemetry unsubscribe requests', () => {
      this.cdr.defaultInstance.emit.calls.reset();
      this.cdr.removeSubscription( 'test123', this.invalid_testcase );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

      this.cdr.removeSubscription( 'test123', this.invalid_testcase1 );
      expect( this.cdr.defaultInstance.emit ).toHaveBeenCalledTimes( 0 );

    } );




  } );

  describe( 'addInstance', () => {

    it( 'Should create new commander instance and pass it into callback for access', () => {
      var someFunc = function( instance ) {

        expect( instance ).toBeDefined();
        expect( typeof instance ).toBe( 'object' );
        expect( instance.name ).toEqual( 'someName' );

      }
      this.cdr.addInstance( 'someName', someFunc );

    } );

  } );

  it( 'logDebugEvent', () => {
    spyOn( console, 'log' );
    spyOn( this.cdr, 'logEvent' ).and.callThrough();
    this.cdr.logDebugEvent( 1, 'DEBUG' );
    expect( this.cdr.logEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.cdr.logEvent.calls.argsFor( 0 )[ 4 ] ).toBe( 'DEBUG' );
  } );

  it( 'logInfoEvent', () => {
    spyOn( console, 'log' );
    spyOn( this.cdr, 'logEvent' ).and.callThrough();
    this.cdr.logInfoEvent( 1, 'INFO' );
    expect( this.cdr.logEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.cdr.logEvent.calls.argsFor( 0 )[ 4 ] ).toBe( 'INFO' );
  } );

  it( 'logErrorEvent', () => {
    spyOn( console, 'log' );
    spyOn( this.cdr, 'logEvent' ).and.callThrough();
    this.cdr.logErrorEvent( 1, 'ERROR' );
    expect( this.cdr.logEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.cdr.logEvent.calls.argsFor( 0 )[ 4 ] ).toBe( 'ERROR' );
  } );

  it( 'logCriticalEvent & default', () => {
    spyOn( console, 'log' );
    spyOn( this.cdr, 'logEvent' ).and.callThrough();
    this.cdr.logCriticalEvent( 1, 'CRIT' );
    expect( this.cdr.logEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.cdr.logEvent.calls.argsFor( 0 )[ 4 ] ).toBe( 'CRIT' );
  } );

} );

describe( 'Commander App', () => {

  beforeAll( () => {
    var Instance = function() {}
    Instance.prototype.logEvent = function( name, cmp, id, criticality, text ) {
      return [ 'success' ]
    }
    var inst = new Instance();
    this.ca = new CommanderApp( inst, 'test_instance', {} )
  } )

  it( 'Should define commander app instance variables', () => {

    expect( this.ca.instance ).toBeDefined();
    expect( this.ca.name ).toBeDefined();
    expect( this.ca.options ).toBeDefined();


  } );

  it( 'Should be able to excercise logging on istance', () => {
    spyOn( this.ca.instance, 'logEvent' );
    this.ca.logEvent( 'test_cmp', 1, 'INFO', 'sample_text' );
    expect( this.ca.instance.logEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.ca.instance.logEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 'test_instance' );

  } );

} );

describe( 'Commander Instance', () => {

  beforeAll( () => {
    var Server = function() {}
    Server.prototype.logEvent = function( name, cmp, id, criticality, text ) {
      return [ 'success' ]
    }
    var server = new Server();
    this.ci = new CommanderInstance( 'test_instance', server );
  } )

  it( 'Should define commander instance variables', () => {
    expect( this.ci.name ).toBeDefined();
    expect( this.ci.server ).toBeDefined();
    expect( this.ci.emitter ).toBeDefined();
  } );

  it( 'Should call emitter events when proper event is emitted', () => {

    spyOn( this.ci, 'logEvent' );

    this.ci.logEvent.calls.reset();
    this.ci.emitter.emit( 'events-info', {} );
    expect( this.ci.logEvent ).toHaveBeenCalledTimes( 1 );
    this.ci.emitter.emit( 'events-info', {
      component: 'test',
      eventID: 1,
      text: 'test'
    } );
    expect( this.ci.logEvent ).toHaveBeenCalledTimes( 2 );

    this.ci.logEvent.calls.reset();
    this.ci.emitter.emit( 'events-error', {} );
    expect( this.ci.logEvent ).toHaveBeenCalledTimes( 1 );
    this.ci.emitter.emit( 'events-error', {
      component: 'test',
      eventID: 1,
      text: 'test'
    } );
    expect( this.ci.logEvent ).toHaveBeenCalledTimes( 2 );

    this.ci.logEvent.calls.reset();
    this.ci.emitter.emit( 'events-critical', {} );
    expect( this.ci.logEvent ).toHaveBeenCalledTimes( 1 );
    this.ci.emitter.emit( 'events-critical', {
      component: 'test',
      eventID: 1,
      text: 'test'
    } );
    expect( this.ci.logEvent ).toHaveBeenCalledTimes( 2 );



  } );

  it( 'Should be able to excercise logging on istance', () => {
    spyOn( this.ci.server, 'logEvent' );
    this.ci.logEvent( 'test_cmp', 1, 'INFO', 'sample_text' );
    expect( this.ci.server.logEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.ci.server.logEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 'test_instance' );

  } );

  it( 'Should be able to excercise addApp functionality', () => {
    var fakeObj = jasmine.createSpyObj( 'FakeApp', [ 'setInstanceEmitter' ] )
    this.ci.addApp( 'fake_app', fakeObj );
    expect( fakeObj.setInstanceEmitter ).toHaveBeenCalledTimes( 1 );
  } );

  it( 'Should be able to excercise emit functionality', () => {
    spyOn( this.ci.emitter, 'emit' );
    this.ci.emit( 'streamID', {}, jasmine.any( Function ) );
    expect( this.ci.emitter.emit ).toHaveBeenCalledTimes( 1 );

  } );

} );

describe( 'Commander Plugin', () => {

  beforeAll( () => {
    this.pluginName = 'amc';
    this.webRoot = global.CDR_WORKSPACE + '/plugins/apps/' + this.pluginName + '/pi/web/'
    global.NODE_APP = {};
    global.CONTENT_TREE = {};
    global.NODE_APP.get = function( str ) {
      return [];
    }
    global.NODE_APP.use = function( str ) {

    }
    CommanderPlugin.prototype.getContent = function() {
      return {
        shortDescription: 'Actuator and Motor Control',
        longDescription: 'Actuator and Motor Control.',
        nodes: {
          main: {
            type: 2,
            shortDescription: 'Main',
            longDescription: 'Main AMC.',
            filePath: '/main_layout.lyt'
          },
          cdh: {
            type: 1,
            shortDescription: 'Command and Data Handling',
            longDescription: 'Command counters.',
            filePath: '/cdh.pug'
          },
          ao: {
            type: 1,
            shortDescription: 'Actuator Outputs',
            longDescription: 'Actuator Outputs',
            filePath: '/ao.pug'
          }
        }
      };
    }
    this.cdr_plugin = new CommanderPlugin( this.pluginName, this.webRoot, undefined );
  } )

  it( 'Should define instance variables', () => {
    var self = this;
    var spy = spyOn( CommanderPlugin.prototype, 'processContentTree' );

    CommanderPlugin.prototype.getContent = function() {
      return undefined;
    }
    this.cdr_plugin = new CommanderPlugin( self.pluginName, self.webRoot, undefined );
    expect( this.cdr_plugin.webRoot ).toBeDefined();
    expect( this.cdr_plugin.name ).toBeDefined();
    expect( this.cdr_plugin.processContentTree ).toHaveBeenCalledTimes( 0 );

    CommanderPlugin.prototype.getContent = function() {
      return {
        shortDescription: 'Actuator and Motor Control',
        longDescription: 'Actuator and Motor Control.',
        nodes: {
          main: {
            type: 2,
            shortDescription: 'Main',
            longDescription: 'Main AMC.',
            filePath: '/main_layout.lyt'
          },
          cdh: {
            type: 1,
            shortDescription: 'Command and Data Handling',
            longDescription: 'Command counters.',
            filePath: '/cdh.pug'
          },
          ao: {
            type: 1,
            shortDescription: 'Actuator Outputs',
            longDescription: 'Actuator Outputs',
            filePath: '/ao.pug'
          }
        }
      };
    }
    this.cdr_plugin = new CommanderPlugin( self.pluginName, self.webRoot, undefined );
    expect( this.cdr_plugin.processContentTree ).toHaveBeenCalledTimes( 1 );



  } );

  it( 'Should initialize with commander ', () => {
    var someFunc = function() {

    }
    CommanderPlugin.prototype.getFunctions = function() {
      return {
        someFunc: someFunc
      };
    }
    var commander = jasmine.createSpyObj( 'Commander', [ 'workspace', 'instances', 'registerFunction', 'defaultInstance' ] );
    this.cdr_plugin.initialize( commander );
    expect( commander.registerFunction ).toHaveBeenCalledTimes( 1 );
  } );

  it( 'Should excercise panels, layouts', () => {
    spyOn( global.NODE_APP, 'get' ).and.callThrough();
    var panels = jasmine.createSpyObj( 'Panels', [ 'urlPath', 'nodes' ] );
    var layouts = jasmine.createSpyObj( 'Layouts', [ 'urlPath', 'nodes' ] );
    this.cdr_plugin.processPanelsTree( panels );
    this.cdr_plugin.processLayoutsTree( layouts );
    expect( global.NODE_APP.get ).toHaveBeenCalledTimes( 2 );
  } );

  it( 'Should excercise JSON file reader', ( done ) => {
    var someFuncEr = function( res ) {
      expect( res.path ).toBe( '' )
    }
    this.cdr_plugin.readJSONFile( '', someFuncEr );

    var someFunc = function( res, data ) {
      expect( typeof data ).toBe( 'object' );
      done();
    }
    this.cdr_plugin.readJSONFile( global.COMMANDER_PATH + '/config/test.json', someFunc );
  } );

} );