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

var ConfigDatabase = require( './index' );
var TestConfig = require( '../config/test.json' );
var Config = require( './config.js' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'ConfigDatabase', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.ConfigDatabase.configFile;
    this.cd = new ConfigDatabase( workspace, configFile );
    this.emitter = new Emitter();
    this.cd.setInstanceEmitter( this.emitter );
    Config.loadFile( configFile );
  } );

  describe( 'Constructor', () => {

    it( 'Should load airliner.json to memory', () => {
      expect( this.cd.defs ).toBeDefined();
    } );

  } );

  describe( 'setInstanceEmitter', () => {

    beforeEach( () => {
      spyOn( this.cd, 'logErrorEvent' );
      this.spy = spyOn( this.cd.instanceEmitter._events, Config.get( 'queryConfigStreamID' ) );
    } );

    it( 'Should react to emit on config-db-query', () => {

      var someFunc = jasmine.any( Function );
      this.cd.instanceEmitter.emit( Config.get( 'queryConfigStreamID' ), '$.Airliner.apps.CFE.scheduler', someFunc );
      expect( this.cd.instanceEmitter._events[ Config.get( 'queryConfigStreamID' ) ].calls.argsFor( 0 )[ 0 ] ).toBe( '$.Airliner.apps.CFE.scheduler' );
      this.cd.instanceEmitter.emit( Config.get( 'queryConfigStreamID' ), '$.Airliner.apps.SCH.config', someFunc );
      expect( this.cd.instanceEmitter._events[ Config.get( 'queryConfigStreamID' ) ].calls.argsFor( 1 )[ 0 ] ).toBe( '$.Airliner.apps.SCH.config' );
      this.cd.instanceEmitter.emit( Config.get( 'queryConfigStreamID' ), '$.Airliner.apps.CFE.events', someFunc );
      expect( this.cd.instanceEmitter._events[ Config.get( 'queryConfigStreamID' ) ].calls.argsFor( 2 )[ 0 ] ).toBe( '$.Airliner.apps.CFE.events' );
      expect( this.cd.instanceEmitter._events[ Config.get( 'queryConfigStreamID' ) ] ).toHaveBeenCalledTimes( 3 );

    } );

    it( 'Should excercise emit on queryConfigStreamID', () => {
      var someFunc = function( res ) {
        expect( res ).toEqual( [] );
      }
      this.spy.and.callThrough();
      this.cd.instanceEmitter.emit( Config.get( 'queryConfigStreamID' ), 'test', someFunc );


    } );


  } );

  it( 'Should emit debug events', () => {
    spyOn( this.cd, 'instanceEmit' );
    this.cd.logDebugEvent( 1, 'DEBUG' );
    expect( this.cd.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

  it( 'Should emit info events', () => {
    spyOn( this.cd, 'instanceEmit' );
    this.cd.logInfoEvent( 1, 'INFO' );
    expect( this.cd.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

  it( 'Should emit error events', () => {
    spyOn( this.cd, 'instanceEmit' );
    this.cd.logErrorEvent( 1, 'ERROR' );
    expect( this.cd.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

  it( 'Should emit critical events', () => {
    spyOn( this.cd, 'instanceEmit' );
    this.cd.logCriticalEvent( 1, 'CRITICAL' );
    expect( this.cd.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

} );