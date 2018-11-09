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

var VariableServer = require( './index' );
var TestConfig = require( '../config/test.json' );
var Config = require( './config.js' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'VariableServer', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var configFile = global.CDR_WORKSPACE + this.testConfig.VariableServer.configFile;
    this.vs = new VariableServer( configFile );
    Config.loadFile( configFile );
    this.emitter = new Emitter();
    this.vs.setInstanceEmitter( this.emitter );
  } );

  describe( 'isEmpty', () => {

    it( 'Should return true when a empty object or an array is passed', () => {
      expect( this.vs.isEmpty( {} ) ).toEqual( true );
      expect( this.vs.isEmpty( [] ) ).toEqual( true );
    } );

    it( 'Should return false when a populated object or an array is passed', () => {
      expect( this.vs.isEmpty( {
        'a': 'b'
      } ) ).toEqual( false );
      expect( this.vs.isEmpty( [ 1, 2, 4 ] ) ).toEqual( false );
    } );

    it( "should return undefined when incompatable literal are passed", () => {
      expect( this.vs.isEmpty( 3 ) ).toEqual( undefined );
      expect( this.vs.isEmpty( '3' ) ).toEqual( undefined );
    } );

  } );

  describe( 'getAppNameFromPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.vs.getAppNameFromPath( [] ) ).toBe( undefined );
      expect( this.vs.getAppNameFromPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.vs.getAppNameFromPath( 'test' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.vs.getAppNameFromPath( 'test/return' ) ).toBe( 'return' );
    } );

  } );

  describe( 'getOpNameFromPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.vs.getOpNameFromPath( [] ) ).toBe( undefined );
      expect( this.vs.getOpNameFromPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.vs.getOpNameFromPath( 'test' ) ).toBe( undefined );
      expect( this.vs.getOpNameFromPath( 'test/test2' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.vs.getOpNameFromPath( 'test/test2/return/' ) ).toBe( 'return' );
    } );

  } );

  describe( 'getMessageOpsPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.vs.getMessageOpsPath( [] ) ).toBe( undefined );
      expect( this.vs.getMessageOpsPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.vs.getMessageOpsPath( 'test' ) ).toBe( undefined );
      expect( this.vs.getMessageOpsPath( 'test/test2' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.vs.getMessageOpsPath( 'test/test2/return/' ) ).toBe( '/test2/return' );
    } );

  } );

  describe( 'getVariableOpsName', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.vs.getVariableOpsName( [] ) ).toBe( undefined );
      expect( this.vs.getVariableOpsName( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.vs.getVariableOpsName( 'test' ) ).toBe( undefined );
      expect( this.vs.getVariableOpsName( 'test/test2' ) ).toBe( undefined );
      expect( this.vs.getVariableOpsName( 'test/test2/test3' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.vs.getVariableOpsName( 'test/test2/test3/return/' ) ).toBe( 'return' );
    } );

  } );

  describe( 'getVariablesFromMsgOpsName', () => {

    beforeAll( () => {
      this.testcase1 = '/CFE/CFE_EVS_Packet_t';
      this.testcase2 = '/PX4/PX4_VehicleLandDetectedMsg_t';
      this.testcase3 = '/PX4/PX4_VehicleGpsPositionMsg_t';

      this.testcaseEr1 = '/CFE/CFE_EVS_Packet_t00';
      this.testcaseEr2 = {};
      this.testcaseEr3 = [];
      this.testcaseEr4 = 4;

      this.vs.vars[ this.testcase1 ] = [ 'SUCCESS' ];
      this.vs.vars[ this.testcase2 ] = [ 'SUCCESS' ];
      this.vs.vars[ this.testcase3 ] = [ 'SUCCESS' ];
    } );


    it( 'Should retrun empty object when non sting parameter or invalid opsName is passed', () => {
      expect( this.vs.getVariablesFromMsgOpsName( this.testcaseEr1 ) ).toEqual( {} );
      expect( this.vs.getVariablesFromMsgOpsName( this.testcaseEr2 ) ).toEqual( {} );
      expect( this.vs.getVariablesFromMsgOpsName( this.testcaseEr3 ) ).toEqual( {} );
      expect( this.vs.getVariablesFromMsgOpsName( this.testcaseEr4 ) ).toEqual( {} );
    } );

    it( 'Should accept a valid opsName and populate output with operations', () => {
      expect( this.vs.getVariablesFromMsgOpsName( this.testcase1 )[ this.testcase1 ] ).toEqual( [ 'SUCCESS' ] );
      expect( this.vs.getVariablesFromMsgOpsName( this.testcase2 )[ this.testcase2 ] ).toEqual( [ 'SUCCESS' ] );
      expect( this.vs.getVariablesFromMsgOpsName( this.testcase3 )[ this.testcase3 ] ).toEqual( [ 'SUCCESS' ] );
    } );

  } );

  describe( 'setInstanceEmitter', () => {

    beforeAll( () => {
      spyOn( this.vs, 'logErrorEvent' );

      this.testcase1 = {
        content: {
          Payload: {
            UnmarkedMem: 505608,
            NoSubscribersCnt: 124,
            PipeOverflowErrCnt: 0,
            CreatePipeErrCnt: 0,
            MsgReceiveErrCnt: 0,
            CommandCnt: 0,
            SubscribeErrCnt: 0,
            MemPoolHandle: 135040476,
            MsgLimErrCnt: 8884,
            InternalErrCnt: 0,
            Spare: 0,
            MemInUse: 11544,
            MsgSendErrCnt: 0,
            Spare2Align: [ Object ],
            CmdErrCnt: 0,
            DupSubscriptionsCnt: 1
          },
          Hdr: {
            Pri: [ Object ],
            Sec: [ Object ]
          }
        },
        opsPath: '/CFE/CFE_SB_HKMsg_t',
        symbol: 'CFE_SB_HKMsg_t',
        msgID: 'CFE_SB_HKMsg_t',
        msgTime: 0
      };
      this.testcase2 = {
        content: {
          Timestamp: '749386300',
          GroundContact: 0,
          TlmHeader: [ 10, 83, 228, 124, 0, 21, 139, 117, 15, 0, 75, 7 ],
          Landed: 1,
          Freefall: 0,
          AltMax: 10000
        },
        opsPath: '/PX4/PX4_VehicleLandDetectedMsg_t',
        symbol: 'PX4_VehicleLandDetectedMsg_t',
        msgID: 'PX4_VehicleLandDetectedMsg_t',
        msgTime: 0
      };
      this.testcase3 = {
        content: {
          Timestamp: '0',
          Count: 0,
          TlmHeader: [ 12, 65, 239, 66, 0, 85, 139, 117, 15, 0, 160, 5 ],
          Output: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
          usCmdErrCnt: 0,
          usCmdCnt: 0
        },
        opsPath: '/AMC/AMC_HkTlm_t',
        symbol: 'AMC_HkTlm_t',
        msgID: 'AMC_HkTlm_t',
        msgTime: 0
      };

      this.vs.vars[ this.testcase1.opsPath ] = this.testcase1;
      this.vs.vars[ this.testcase2.opsPath ] = this.testcase2;
      this.vs.vars[ this.testcase3.opsPath ] = this.testcase3;
    } );

    it( 'Should react to emit on json-tlm-stream', () => {
      this.vs.instanceEmitter.emit( Config.get( 'jsonInputStreamID' ), this.testcase2 );
      expect( this.vs.logErrorEvent ).toHaveBeenCalledTimes( 1 );
      this.vs.logErrorEvent.calls.reset();
      spyOn( this.vs, 'isEmpty' ).and.returnValues( false, false );
      this.vs.instanceEmitter.emit( Config.get( 'jsonInputStreamID' ), this.testcase2 );
      expect( this.vs.logErrorEvent ).toHaveBeenCalledTimes( 0 );
    } );

    it( 'Should react to emit on var-def-request', () => {
      var someFunc = jasmine.any( Function );
      spyOn( this.vs, 'instanceEmit' );
      this.vs.instanceEmitter.emit( Config.get( 'varDefReqStreamID' ), [ {
        name: '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter'
      } ], someFunc );
      expect( this.vs.instanceEmit ).toHaveBeenCalledTimes( 1 );
      expect( this.vs.instanceEmit.calls.argsFor( 0 )[ 1 ][ 0 ].name ).toBe( '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter' );

    } );

    it( 'Should react to emit on subscribe-request', () => {

      var someFunc = jasmine.any( Function );
      var someObj = jasmine.any( Object );
      spyOn( this.vs, 'SubscribeToVariable' ).and.callFake( () => {} );
      spyOn( this.vs, 'getTlmDefinitions' ).and.callFake( ( someObj, someFunc ) => {} );
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'subscribe',
        opsPath: '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter'
      }, someFunc );
      expect( this.vs.SubscribeToVariable ).toHaveBeenCalledTimes( 1 );
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'subscribe',
        opsPath: [ '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter' ]
      }, someFunc );
      expect( this.vs.getTlmDefinitions ).toHaveBeenCalledTimes( 1 );
      this.vs.logErrorEvent.calls.reset();
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'subscribe',
        opsPath: 9
      }, someFunc );
      expect( this.vs.logErrorEvent ).toHaveBeenCalledTimes( 1 );

    } );

    it( 'Should react to emit on unsubscribe-request', () => {
      var someFunc = jasmine.any( Function );
      var someObj = jasmine.any( Object );
      spyOn( this.vs, 'removeSubscriber' ).and.callFake( () => {} );
      // spyOn( this.vs, 'getTlmDefinitions' ).and.callFake( ( someObj, someFunc ) => {} );
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'unsubscribe',
        opsPath: '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter'
      }, someFunc );
      expect( this.vs.removeSubscriber ).toHaveBeenCalledTimes( 1 );
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'unsubscribe',
        opsPath: [ '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter' ]
      }, someFunc );
      expect( this.vs.removeSubscriber ).toHaveBeenCalledTimes( 2 );
      this.vs.logErrorEvent.calls.reset();
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'unsubscribe',
        opsPath: 9
      }, someFunc );
      expect( this.vs.logErrorEvent ).toHaveBeenCalledTimes( 1 );

    } );

  } );

} );