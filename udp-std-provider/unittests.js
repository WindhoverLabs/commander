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

var UdpStdProvider = require( './index' );
var TestConfig = require( '../config/test.json' );
var Emitter = require( 'events' );
var fs = require( 'fs' );


describe( 'UdpStdProvider', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    this.usp = new UdpStdProvider( global.CDR_WORKSPACE + this.testConfig.UdpStdProvider.configFile );
    this.emitter = new Emitter();
    this.usp.setInstanceEmitter( this.emitter );
    this.callEmitNTimes = 10;
  } );

  describe( 'Constructor', () => {

    beforeEach( () => {
      spyOn( this.usp.listener._events, 'error' );
      spyOn( this.usp.listener._events, 'listening' );
    } );

    it( 'Emit is called on error n times', () => {
      for ( var i = 0; i < this.callEmitNTimes; ++i ) {
        this.usp.listener.emit( 'error' );
      }
      expect( this.usp.listener._events.error ).toHaveBeenCalledTimes( this.callEmitNTimes );
    } );

    it( 'Emit is called on listening n times', () => {
      for ( var i = 0; i < this.callEmitNTimes; ++i ) {
        this.usp.listener.emit( 'listening' );
      }
      expect( this.usp.listener._events.listening ).toHaveBeenCalledTimes( this.callEmitNTimes );
    } );

    it( 'Emit is called on error once', () => {
      this.usp.listener.emit( 'error' );
      expect( this.usp.listener._events.error ).toHaveBeenCalledTimes( 1 );
    } );

    it( 'Emit is called on listening once', () => {
      this.usp.listener.emit( 'listening' );
      expect( this.usp.listener._events.listening ).toHaveBeenCalledTimes( 1 );
    } );

    it( 'Emit is never called on error', () => {
      expect( this.usp.listener._events.error ).toHaveBeenCalledTimes( 0 );
    } );

    it( 'Emit is never called on listening', () => {
      expect( this.usp.listener._events.listening ).toHaveBeenCalledTimes( 0 );
    } );

  } );

  describe( 'setInstanceEmitter', () => {

    beforeEach( () => {
      spyOn( this.usp.sender, 'send' );
      spyOn( this.usp.listener._events, 'message' );
      this.payload = [ 'arr', 'Obj' ];
    } );

    it( 'Should never run since there is no server to receive messages', () => {
      expect( this.usp.listener._events.message ).toHaveBeenCalledTimes( 0 );
    } );

    it( 'Should emit onto inputStreamID (CMD out stream)', () => {
      this.usp.instanceEmitter.emit( this.usp.config.get( 'inputStreamID' ), this.payload );
      expect( this.usp.sender.send ).toHaveBeenCalledTimes( 1 );
      expect( this.usp.sender.send ).toHaveBeenCalledWith( this.payload, 0, this.payload.length, this.usp.config.get( 'outPort' ), this.usp.config.get( 'outAddress' ) );

    } );


  } );


  it( 'Should emit debug events', () => {
    spyOn( this.usp, 'instanceEmit' );
    this.usp.logDebugEvent( 1, 'DEBUG' );
    expect( this.usp.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

  it( 'Should emit info events', () => {
    spyOn( this.usp, 'instanceEmit' );
    this.usp.logInfoEvent( 1, 'INFO' );
    expect( this.usp.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

  it( 'Should emit error events', () => {
    spyOn( this.usp, 'instanceEmit' );
    this.usp.logErrorEvent( 1, 'ERROR' );
    expect( this.usp.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );

  it( 'Should emit critical events', () => {
    spyOn( this.usp, 'instanceEmit' );
    this.usp.logCriticalEvent( 1, 'CRITICAL' );
    expect( this.usp.instanceEmit.calls.argsFor( 0 )[ 1 ].eventID ).toBe( 1 );
  } );


} );