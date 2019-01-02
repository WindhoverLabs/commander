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

var ProtobufDecoder = require( './index' );
var TestConfig = require( '../config/test.json' );
var Config = require( './config.js' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'ProtobufDecoder', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.ProtobufDecoder.configFile;
    this.pd = new ProtobufDecoder( workspace, configFile );
    Config.loadFile( configFile );
    this.emitter = new Emitter();
    this.pd.setInstanceEmitter( this.emitter );
  } );

  describe( 'Constructor', () => {

    beforeAll( () => {
      this.workspace = global.CDR_WORKSPACE;
      this.configFile = global.CDR_WORKSPACE + this.testConfig.ProtobufDecoder.configFile;
    } );

    beforeEach( () => {
      spyOn( ProtobufDecoder.prototype, 'parseProtoFile' );
    } );

    it( 'Should call parseProtoFile on all protofiles', () => {
      this.pd1 = new ProtobufDecoder( this.workspace, this.configFile );
      var protoFilesCount = this.pd1.recFindByExt( process.env.AIRLINER_PROTO_PATH, 'proto' ).length;
      expect( ProtobufDecoder.prototype.parseProtoFile ).toHaveBeenCalledTimes( protoFilesCount );
    } );

  } );

  describe( 'setInstanceEmitter', () => {
    it( 'Should react to buffer data on  binaryInputStreamID', () => {
      var spy = spyOn( this.pd.instanceEmitter._events, Config.get( 'binaryInputStreamID' ) );
      var sampleBuff = new Buffer( [ 10, 80, 233, 201, 0, 109, 153, 103, 15, 0, 252, 59, 1, 22, 79, 143, 10, 0, 0, 0, 99,
        230, 77, 143, 10, 0, 0, 0, 52, 116, 228, 29, 233, 178, 71, 64, 54, 1, 133, 196, 87, 23, 33, 64, 159, 64, 244, 67,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 249, 48, 188, 1, 120, 16, 62, 148, 237,
        231, 188, 103, 65, 94, 63, 245, 248, 184, 62, 27, 66, 187, 60, 0, 0, 0, 0, 0, 0, 0, 0, 110, 195, 241, 67, 210, 134, 162, 64, 1, 0, 0, 0
      ] );
      var sampleBuff2 = new Buffer( [ 24, 6, 0, 0, 0, 1, 0, 0 ] );
      this.pd.instanceEmitter.emit( Config.get( 'binaryInputStreamID' ), sampleBuff );
      expect( this.pd.instanceEmitter._events[ Config.get( 'binaryInputStreamID' ) ] ).toHaveBeenCalledTimes( 1 );
      var callbackFunc = this.pd.instanceEmitter._events[ Config.get( 'binaryInputStreamID' ) ];

      spy.and.callThrough();
      spyOn( this.pd, 'logErrorEvent' );
      spyOn( this.pd, 'sendCmd' );
      var cmdDefSpy = spyOn( this.pd, 'requestCmdDefinition' );
      var tlmDefSpy = spyOn( this.pd, 'requestTlmDefinition' );
      /* cmd */
      callbackFunc( sampleBuff2 );
      expect( this.pd.requestCmdDefinition ).toHaveBeenCalledTimes( 1 );
      var cmdCallbackFunc = this.pd.requestCmdDefinition.calls.argsFor( 0 )[ 2 ];
      cmdCallbackFunc( {
        operation: {
          airliner_msg: ''
        }
      } );
      expect( this.pd.sendCmd ).toHaveBeenCalledTimes( 1 );
      expect( this.pd.sendCmd.calls.argsFor( 0 )[ 0 ] ).toEqual( undefined );
      expect( this.pd.sendCmd.calls.argsFor( 0 )[ 1 ] ).toEqual( [] );
      cmdCallbackFunc( {
        operation: {
          airliner_msg: 'CFE_EVS_Noop'
        }
      } );
      expect( this.pd.sendCmd ).toHaveBeenCalledTimes( 1 );
      expect( this.pd.sendCmd.calls.argsFor( 0 )[ 0 ] ).toEqual( undefined );
      expect( this.pd.sendCmd.calls.argsFor( 0 )[ 1 ] ).toEqual( [] );
      /* tlm */
      callbackFunc( sampleBuff );
      expect( this.pd.requestTlmDefinition ).toHaveBeenCalledTimes( 1 );
      var tlmCallbackFunc = this.pd.requestTlmDefinition.calls.argsFor( 0 )[ 1 ];




    } );

  } );

  describe( 'recFindByExt', () => {

    it( 'Should load protobuf definition files from given path', () => {
      expect( this.pd.recFindByExt( global.AIRLINER_PROTO_PATH, 'proto' ).length > 0 ).toBe( true );
    } );

    it( 'Should log error when incompatable parameters are passed', () => {
      spyOn( this.pd, 'logErrorEvent' );
      this.pd.logErrorEvent.calls.reset()
      expect( this.pd.recFindByExt( 'hello', 'lel' ) ).toEqual( [] );
      expect( this.pd.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    } );

  } );


  describe( 'instanceEmit and sendCmd', () => {


    it( 'Should call emit function on passed in stream id and message', () => {
      spyOn( this.pd.instanceEmitter, 'emit' );
      this.pd.instanceEmit( 'test', jasmine.any( Object ) );
      expect( this.pd.instanceEmitter.emit.calls.argsFor( 0 )[ 0 ] ).toBe( 'test' );

    } );

    it( 'Should call emit function on passed in stream id and command message', () => {
      spyOn( this.pd, 'instanceEmit' );
      this.pd.sendCmd( 'test', [] );
      expect( this.pd.instanceEmit.calls.argsFor( 0 )[ 1 ] ).toEqual( {
        ops_path: 'test',
        args: []
      } );

    } );

  } );

  describe( 'requestCmdDefinition', () => {

    it( 'Should receive a valid response on requesting cmdDef with right parameters', () => {

      var callback = function( resp ) {

        expect( resp.msgID ).toBe( 6145 );
        expect( resp.cmdCode ).toBe( 0 );

      }

      this.pd.instanceEmitter.on( Config.get( 'cmdDefReqStreamID' ), ( msg, cb ) => {
        cb( msg );
      } );
      this.pd.requestCmdDefinition( 6145, 0, callback );

    } );

  } );

  describe( 'requestTlmDefinition', () => {

    it( 'Should receive a valid response on requesting tlmDef with right parameters', () => {

      var callback = function( resp ) {

        expect( resp.msgID ).toBe( 2048 );

      }

      this.pd.instanceEmitter.on( Config.get( 'tlmDefReqStreamID' ), ( msg, cb ) => {
        cb( msg );
      } );
      this.pd.requestTlmDefinition( 2048, callback );

    } );

  } );

  describe( 'parseProtoFile', () => {

    beforeAll( () => {

      spyOn( this.pd, 'logErrorEvent' );
    } );

    it( 'Should parse proto file', () => {
      var testcase = [
        '/AMC_CurrentValueTable_t.proto',
        '/AMC_HkTlm_t.proto',
        '/AMC_NoArgCmd_t.proto',
        '/AMC_PwmConfigTbl_t.proto',
        '/BAT_ConfigTbl_t.proto',
      ];
      for ( e in testcase ) {
        this.pd.logErrorEvent.calls.reset();
        this.pd.parseProtoFile( global.AIRLINER_PROTO_PATH + testcase[ e ] );
        expect( this.pd.logErrorEvent ).toHaveBeenCalledTimes( 0 );


      }
    } );

    it( 'Should log error', () => {
      this.pd.logErrorEvent.calls.reset();
      this.pd.parseProtoFile( [] );
      expect( this.pd.logErrorEvent ).toHaveBeenCalledTimes( 1 );

      this.pd.logErrorEvent.calls.reset();
      this.pd.parseProtoFile( global.AIRLINER_PROTO_PATH + 'BAT_CurrentValueTable_t.proto' );
      expect( this.pd.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    } );


  } );

  describe( 'getMsgDefBySymbolName, getCmdByName and getTlmDefByMsgID', () => {

    it( 'Should return appropriate definition for symbol name', () => {
      expect( this.pd.getMsgDefBySymbolName( 'VM_HkTlm_t' ).name ).toBe( 'VM_HkTlm_t' );
      expect( this.pd.getMsgDefBySymbolName( 'test' ) ).toBe( undefined );
    } );

    it( 'Should return appropriate definition for cmd name', () => {
      expect( this.pd.getCmdByName( 'VM_HkTlm_t' ).name ).toBe( 'VM_HkTlm_t' );
      expect( this.pd.getCmdByName( 'test' ) ).toBe( undefined );
    } );

  } );

  describe( 'isCommandMsg', () => {

    beforeEach( () => {
      this.cmdMsgIDs = [ 6145, 6150, 6147, 6148, 7229 ];
      this.tlmMsgIDs = [ 2048, 2060, 3137, 2572, 2647 ];
    } );

    it( 'Should accept valid command msgIDs and return true', () => {
      for ( var i in this.cmdMsgIDs ) {
        expect( this.pd.isCommandMsg( this.cmdMsgIDs[ i ] ) ).toBe( true );
      }
    } );

    it( 'Should accept valid telemetry msgIDs and return false', () => {
      for ( var i in this.tlmMsgIDs ) {
        expect( this.pd.isCommandMsg( this.tlmMsgIDs[ i ] ) ).toBe( false );
      }
    } );

  } );

  describe( 'isTelemetryMsg', () => {

    beforeEach( () => {
      this.cmdMsgIDs = [ 6145, 6150, 6147, 6148, 7229 ];
      this.tlmMsgIDs = [ 2048, 2060, 3137, 2572, 2647 ];
    } );

    it( 'Should accept valid command msgIDs and return false', () => {
      for ( var i in this.cmdMsgIDs ) {
        expect( this.pd.isTelemetryMsg( this.cmdMsgIDs[ i ] ) ).toBe( false );
      }
    } );

    it( 'Should accept valid telemetry msgIDs and return true', () => {
      for ( var i in this.tlmMsgIDs ) {
        expect( this.pd.isTelemetryMsg( this.tlmMsgIDs[ i ] ) ).toBe( true );
      }
    } );

  } );


} );