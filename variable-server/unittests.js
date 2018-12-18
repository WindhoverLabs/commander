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
      this.vs.logErrorEvent.calls.reset();
      this.vs.instanceEmitter.emit( Config.get( 'jsonInputStreamID' ), this.testcase2 );
      expect( this.vs.logErrorEvent ).toHaveBeenCalledTimes( 1 );
      this.vs.logErrorEvent.calls.reset();
      spyOn( this.vs, 'isEmpty' ).and.returnValues( false, false );
      spyOn( this.vs, 'getVariablePersistence' ).and.returnValues( 0 );
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

    it( 'Should react to emit on reqSubscribeStreamID', () => {

      /* spies */
      spyOn( this.vs, 'addSubscription' );
      spyOn( this.vs, 'removeSubscription' );
      spyOn( this.vs, 'getTlmDefinitions' );


      /* add subscriber */
      var someFunc = function() {};
      var self = this;
      var thisSessionID = undefined;
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'addSubscriber',
        cb: someFunc
      }, function( id ) {
        thisSessionID = id;
        expect( self.vs.subscribers[ id ] == someFunc ).toBe( true );
      } );

      /* add subscription */
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'addSubscription',
        opsPath: 'test'
      }, jasmine.any( Function ) );

      expect( this.vs.addSubscription ).toHaveBeenCalledTimes( 1 );

      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'addSubscription',
        opsPath: [ 'test' ]
      }, jasmine.any( Function ) );

      expect( this.vs.getTlmDefinitions ).toHaveBeenCalledTimes( 1 );

      /* remove subscription */
      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'removeSubscription',
        opsPath: 'test'
      }, jasmine.any( Function ) );

      expect( this.vs.removeSubscription ).toHaveBeenCalledTimes( 1 );

      this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
        cmd: 'removeSubscription',
        opsPath: [ 'test' ]
      }, jasmine.any( Function ) );

      expect( this.vs.removeSubscription ).toHaveBeenCalledTimes( 2 );


      if ( thisSessionID != undefined ) {
        /* remove subscriber */
        var someFunc = function() {};
        var self = this;
        this.vs.instanceEmitter.emit( Config.get( 'reqSubscribeStreamID' ), {
          cmd: 'removeSubscriber',
          subscriberID: thisSessionID
        } );
        expect( Object.keys( this.vs.subscribers ).indexOf( thisSessionID ) == -1 ).toBe( true );

      }


    } );


  } );

  describe( 'isVarNameAnArray', () => {

    it( 'Should return true if a array string is passed', () => {
      expect( this.vs.isVarNameAnArray( 'test[]' ) ).toBe( true );
      expect( this.vs.isVarNameAnArray( 'test[1,2,3]' ) ).toBe( true );
      expect( this.vs.isVarNameAnArray( 'test[asdas asdasd]' ) ).toBe( true );
    } );

    it( 'Should return false if any other object or string is passed', () => {
      expect( this.vs.isVarNameAnArray( 'test' ) ).toBe( false );
      expect( this.vs.isVarNameAnArray( '[1,2,3]' ) ).toBe( false );
      expect( this.vs.isVarNameAnArray( {} ) ).toBe( false );
      expect( this.vs.isVarNameAnArray( [] ) ).toBe( false );
    } );

  } );

  describe( 'getTlmDefinitions', () => {

    beforeAll( () => {
      spyOn( this.vs, 'instanceEmit' );
      spyOn( this.vs, 'logErrorEvent' );
    } );

    it( 'Should call instance emit function on tlm-def-request', () => {
      this.vs.instanceEmit.calls.reset();
      this.vs.getTlmDefinitions( [ 'requestObj' ], jasmine.any( Function ) );
      expect( this.vs.instanceEmit ).toHaveBeenCalledTimes( 1 );
      expect( this.vs.instanceEmit.calls.argsFor( 0 )[ 1 ] ).toEqual( [ 'requestObj' ] );
    } );

    it( 'Should execute callback', () => {
      var cb_undefined = function( val ) {
        expect( val ).toEqual( undefined )
      }
      var cb_array = function( val ) {
        expect( typeof val.length ).toEqual( 'number' )
        for ( var i = 0; i < val.length; ++i ) {
          var valObj = val[ i ];
          expect( typeof valObj ).toEqual( 'object' )
          expect( valObj.hasOwnProperty( 'opsPath' ) ).toBe( true );
          expect( valObj.hasOwnProperty( 'dataType' ) ).toBe( true );
          expect( valObj.hasOwnProperty( 'persistence' ) ).toBe( true );
          expect( valObj.hasOwnProperty( 'timeout' ) ).toBe( true );
        }
      }
      var cb_single = function( val ) {
        expect( typeof val ).toEqual( 'object' )
        expect( val.hasOwnProperty( 'opsPath' ) ).toBe( true );
        expect( val.hasOwnProperty( 'dataType' ) ).toBe( true );
        expect( val.hasOwnProperty( 'persistence' ) ).toBe( true );
        expect( val.hasOwnProperty( 'timeout' ) ).toBe( true );
      }
      this.vs.instanceEmit.calls.reset();
      this.vs.logErrorEvent.calls.reset();
      this.vs.getTlmDefinitions( [ 'requestObj' ], cb_undefined );
      /* the callback function passed into instanceEmit */
      var callback = this.vs.instanceEmit.calls.argsFor( 0 )[ 2 ];
      callback( undefined );
      this.vs.instanceEmit.calls.reset();
      this.vs.getTlmDefinitions( {
        name: '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter'
      }, cb_single );
      /* the callback function passed into instanceEmit */
      var callback2 = this.vs.instanceEmit.calls.argsFor( 0 )[ 2 ];
      callback2( {
        opsPath: '/CFE/CFE_ES_HkPacket_t/Payload.CmdCounter',
        dataType: 'uint8'
      } );
      this.vs.instanceEmit.calls.reset();
      this.vs.getTlmDefinitions( [ {
        name: '/CFE/CFE_ES_HkPacket_t/Payload.ErrCounter'
      } ], cb_array );
      /* the callback function passed into instanceEmit */
      var callback3 = this.vs.instanceEmit.calls.argsFor( 0 )[ 2 ];
      callback3( [ {
        opsPath: '/CFE/CFE_ES_HkPacket_t/Payload.ErrCounter',
        dataType: 'uint8'
      } ] );

    } );

  } );

  describe( 'addSubscription', () => {

    beforeAll( () => {
      delete this.vs.vars[ 'test' ];
    } );

    it( 'Should add subscribers to this.vars when a new subscribe request is received', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.addSubscription( 'uniqueid', 'test' );
      expect( this.vs.vars[ 'test' ] ).not.toEqual( undefined );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'opsPath' ) ).toBe( true );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'arrayIndices' ) ).toBe( true );
    } );

    it( 'Should call a callback function when subscriber has already been defined', () => {
      var cb = function( outVar ) {
        expect( outVar[ 'test' ].hasOwnProperty( 'sample' ) ).toBe( true );
      }
      delete this.vs.vars[ 'test' ];
      this.vs.addSubscription( 'uniqueid', 'test' );
      this.vs.subscribers[ 'uniqueid' ] = cb
      this.vs.addSubscription( 'uniqueid', 'test' );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'subscribers' ) ).toBe( true );
      expect( this.vs.vars[ 'test' ][ 'subscribers' ].indexOf( 'uniqueid' ) != -1 ).toBe( true );
    } );

  } );

  describe( 'setVariablePersistence', () => {

    it( 'Should add subscribers to this.vars when a new setVariablePersistence request is received', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.setVariablePersistence( 'test', jasmine.any( Number ) );
      expect( this.vs.vars[ 'test' ] ).not.toEqual( undefined );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'opsPath' ) ).toBe( true );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'persistence' ) ).toBe( true );
    } );

    it( 'Should add persistence to existing variable', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.setVariablePersistence( 'test', jasmine.any( Number ) );
      this.vs.setVariablePersistence( 'test', 3 );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'persistence' ) ).toBe( true );
      expect( this.vs.vars[ 'test' ][ 'persistence' ][ 'count' ] ).toEqual( 3 );
    } );

  } );

  describe( 'getVariablePersistence', () => {

    it( 'Should return 1 when the variable name is not pre-defined', () => {
      delete this.vs.vars[ 'test' ];
      expect( this.vs.getVariablePersistence( 'test' ) ).toBe( 1 );
      this.vs.addSubscription( 'uniqueid', 'test' );
      expect( this.vs.getVariablePersistence( 'test' ) ).toBe( 1 );
    } );

    it( 'Should return persistence count when the variable name is pre-defined', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.setVariablePersistence( 'test', 3 );
      expect( this.vs.getVariablePersistence( 'test' ) ).toBe( 3 );
    } );

  } );

  describe( 'setVariableTimeout', () => {

    it( 'Should add subscribers to this.vars when a new setVariableTimeout request is received', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.setVariableTimeout( 'test', jasmine.any( Number ) );
      expect( this.vs.vars[ 'test' ] ).not.toEqual( undefined );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'opsPath' ) ).toBe( true );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'timeout' ) ).toBe( true );
    } );

    it( 'Should add timeout to existing variable', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.setVariableTimeout( 'test', jasmine.any( Number ) );
      this.vs.setVariableTimeout( 'test', 3 );
      expect( this.vs.vars[ 'test' ].hasOwnProperty( 'timeout' ) ).toBe( true );
      expect( this.vs.vars[ 'test' ][ 'timeout' ] ).toEqual( 3 );
    } );

  } );

  describe( 'getVariableTimeout', () => {

    it( 'Should return 0 when the variable name is not pre-defined', () => {
      delete this.vs.vars[ 'test' ];
      expect( this.vs.getVariableTimeout( 'test' ) ).toBe( 0 );
      this.vs.addSubscription( 'uniqueid', 'test' );
      expect( this.vs.getVariableTimeout( 'test' ) ).toBe( 0 );
    } );

    it( 'Should return persistence count when the variable name is pre-defined', () => {
      delete this.vs.vars[ 'test' ];
      this.vs.setVariableTimeout( 'test', 3 );
      expect( this.vs.getVariableTimeout( 'test' ) ).toBe( 3 );
    } );

  } );

  describe( 'removeSubscriber', () => {

    it( 'Should empty vars', () => {
      var cb = function( outVar ) {
        expect( outVar[ 'test' ].hasOwnProperty( 'sample' ) ).toBe( true );
      }
      this.vs.addSubscription( 'uniqueid', 'test' );
      this.vs.setVariableTimeout( 'test', 1 );
      this.vs.setVariableTimeout( 'test', 2 );
      this.vs.removeSubscription( 'test', cb );
      expect( this.vs.vars[ 'test' ][ 'subscribers' ] ).toEqual( [] );

    } );

  } );

} );