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

var ProtobufEncoder = require( './index' );
var TestConfig = require( '../config/test.json' );
var Config = require( './config.js' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'ProtobufEncoder', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.ProtobufEncoder.configFile;
    this.pe = new ProtobufEncoder( workspace, configFile );
    Config.loadFile( configFile );
    this.emitter = new Emitter();
    this.pe.setInstanceEmitter( this.emitter );
  } );

  it( 'Should excercise all cases while parsing ccsds header', () => {
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.ProtobufEncoder.configFile;
    var testcases = [ 'CFE_SB_TIME_32_32_SUBS', 'CFE_SB_TIME_32_32_M_20' ];
    var spy = spyOn( Config, 'get' );
    spy.withArgs( 'msgDefs' ).and.callThrough();
    var protobufEncoder = undefined;
    for ( e in testcases ) {
      spy.withArgs( 'CFE_SB_PACKET_TIME_FORMAT' ).and.returnValue( testcases[ e ] );
      protobufEncoder = new ProtobufEncoder( workspace, configFile );
      expect( protobufEncoder.ccsdsPriHdr ).toBeDefined();
      expect( protobufEncoder.ccsdsCmdSecHdr ).toBeDefined();
      expect( protobufEncoder.ccsdsTlmSecHdr ).toBeDefined();
      expect( protobufEncoder.tlmHeaderLength ).toBeDefined();
      expect( protobufEncoder.ccsds ).toBeDefined();
    }



  } );

  describe( 'Constructor', () => {

    it( 'Should configure Endianess', () => {
      expect( this.pe.ccsdsPriHdr ).toBeDefined();
      expect( this.pe.ccsdsCmdSecHdr ).toBeDefined();
      expect( this.pe.ccsdsTlmSecHdr ).toBeDefined();
      expect( this.pe.tlmHeaderLength ).toBeDefined();
      expect( this.pe.ccsds ).toBeDefined();
    } );

  } );

  describe( 'recFindByExt', () => {

    it( 'Should load protobuf definition files from given path', () => {
      expect( this.pe.recFindByExt( global.AIRLINER_PROTO_PATH, 'proto' ).length > 0 ).toBe( true );
    } );

    it( 'Should log error when incompatable parameters are passed', () => {
      spyOn( this.pe, 'logErrorEvent' );
      this.pe.logErrorEvent.calls.reset()
      expect( this.pe.recFindByExt( 'hello', 'lel' ) ).toEqual( [] );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    } );

  } );

  describe( 'setInstanceEmitter', () => {

    beforeAll( () => {
      this.testcase = {
        content: {
          EpH: 0,
          EpV: 0,
          CVariance: 0,
          SatellitesUsed: 0,
          NoisePerMs: 0,
          Timestamp: '53778024314',
          Alt: 0,
          Vel_d_m_s: 0,
          VDOP: 0,
          COG: 0,
          TimestampTimeRelative: 0,
          FixType: 0,
          AltEllipsoid: 0,
          SVariance: 0,
          JammingIndicator: 0,
          TlmHeader: [ 10, 82, 231, 34, 0, 101, 254, 77, 15, 0, 219, 181 ],
          Vel_e_m_s: 0,
          VelNedValid: 1,
          TimeUtcUsec: '53778024314',
          Vel_n_m_s: 0,
          Lon: 0,
          Vel_m_s: 0,
          HDOP: 0,
          Lat: 0
        },
        opsPath: '/PX4/PX4_VehicleGpsPositionMsg_t',
        symbol: 'PX4_VehicleGpsPositionMsg_t',
        msgID: 'PX4_VehicleGpsPositionMsg_t',
        msgTime: 0
      }
      this.testcaseEr = {
        content: {},
      };
    } );

    beforeEach( () => {
      spyOn( this.pe.instanceEmitter._events, Config.get( 'jsonInputStreamID' ) ).and.callThrough();
      spyOn( this.pe, 'getTlmDefByPath' ).and.callThrough();
      spyOn( this.pe, 'getMsgDefByName' ).and.callThrough();
      spyOn( this.pe, 'instanceEmit' );
      spyOn( this.pe, 'logErrorEvent' );
    } );

    it( 'Should load airliner.json to memory', () => {
      expect( this.pe.defs ).toBeDefined();
      expect( Object.keys( this.pe.defs ).length > 0 ).toBe( true );
    } );

    it( 'Should react to emit on json-tlm-stream', () => {

      this.pe.instanceEmitter.emit( Config.get( 'jsonInputStreamID' ), this.testcase );
      expect( this.pe.instanceEmitter._events[ Config.get( 'jsonInputStreamID' ) ] ).toHaveBeenCalledTimes( 1 );

      expect( this.pe.getTlmDefByPath ).toHaveBeenCalledTimes( 1 );
      expect( this.pe.getMsgDefByName ).toHaveBeenCalledTimes( 1 );
      expect( this.pe.instanceEmit ).toHaveBeenCalledTimes( 1 );

      this.pe.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON()[ 'data' ].forEach( ( item ) => {
        expect( typeof item == 'number' ).toBe( true );
        expect( item >= 0 ).toBe( true );
      } );

    } );

    it( 'Should react to error conditions upon emit', () => {

      this.pe.instanceEmitter.emit( Config.get( 'jsonInputStreamID' ), this.testcaseEr );

      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 2 );
      expect( this.pe.logErrorEvent.calls.argsFor( 1 )[ 1 ].indexOf( 'tlmDef' ) != -1 ).toBe( true );

    } );


  } );

  describe( 'getMsgOpsPathFromFullOpsPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.pe.getMsgOpsPathFromFullOpsPath( [] ) ).toBe( undefined );
      expect( this.pe.getMsgOpsPathFromFullOpsPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.pe.getMsgOpsPathFromFullOpsPath( 'test' ) ).toBe( undefined );
      expect( this.pe.getMsgOpsPathFromFullOpsPath( 'test/test2' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.pe.getMsgOpsPathFromFullOpsPath( 'test/test2/return/' ) ).toBe( '/test2/return' );
    } );

  } );

  describe( 'getSymbolNameFromOpsPath', () => {

    beforeEach( () => {
      spyOn( this.pe, 'logErrorEvent' );
      spyOn( this.pe, 'getTlmDefByPath' ).and.callThrough();
    } );

    it( 'Should log error on passing illegal opsPath', () => {
      expect( this.pe.getSymbolNameFromOpsPath( 'hello' ) ).toBe( undefined );
      expect( this.pe.getSymbolNameFromOpsPath( 'test/test2/return/' ) ).toBe( undefined );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 3 );
      expect( this.pe.logErrorEvent.calls.argsFor( 0 )[ 1 ].indexOf( 'getSymbolNameFromOpsPath:' ) != -1 ).toBe( true );
      expect( this.pe.logErrorEvent.calls.argsFor( 1 )[ 1 ].indexOf( 'getTlmDefByPath:' ) != -1 ).toBe( true );
      expect( this.pe.logErrorEvent.calls.argsFor( 2 )[ 1 ].indexOf( 'getSymbolNameFromOpsPath:' ) != -1 ).toBe( true );
    } );

    it( 'Should return valid airliner message object', () => {
      expect( this.pe.getSymbolNameFromOpsPath( '/PX4/PX4_VehicleGpsPositionMsg_t/Lat' ) ).toBe( 'PX4_VehicleGpsPositionMsg_t' );
    } );

  } );

  describe( 'convertJsonToProtoJson', () => {
    beforeEach( () => {
      this.testcase = {
        '/PX4/PX4_VehicleGpsPositionMsg_t/Lat': {
          value: 1
        },
        '/PX4/test/val': {
          value: 1
        },
        '/PX4/test/val1': {
          value: 2
        }
      }
      this.testcase1 = {
        '/PX4/PX4_VehicleGpsPositionMsg_t/Lat': {
          value: 1
        }
      }
    } );

    it( 'Should return protobuf compatable json', () => {
      expect( this.pe.convertJsonToProtoJson( this.testcase ) ).toEqual( {
        Lat: 1,
        val: 1,
        val1: 2
      } );
      expect( this.pe.convertJsonToProtoJson( this.testcase1 ) ).toEqual( {
        Lat: 1
      } );

    } );

    it( 'Should return empty object on error', () => {
      expect( this.pe.convertJsonToProtoJson( {} ) ).toEqual( {} );
      expect( this.pe.convertJsonToProtoJson( [] ) ).toEqual( {} );
      expect( this.pe.convertJsonToProtoJson( 'test' ) ).toEqual( {} );
      expect( this.pe.convertJsonToProtoJson( 7 ) ).toEqual( {} );

    } );

  } );

  describe( 'getMsgDefByName', () => {

    it( 'Should return proto object', () => {
      expect( typeof this.pe.getMsgDefByName( 'CFE_EVS_Packet_t' ) ).toBe( 'object' );
    } );

    it( 'Should return undefined', () => {
      expect( this.pe.getMsgDefByName( 'test' ) ).toBe( undefined );
      expect( this.pe.getMsgDefByName( '[1,2,3]' ) ).toBe( undefined );
      expect( this.pe.getMsgDefByName( {} ) ).toBe( undefined );
      expect( this.pe.getMsgDefByName( [] ) ).toBe( undefined );
    } );

  } );

  describe( 'parseProtoFile', () => {

    beforeAll( () => {

      spyOn( this.pe, 'logErrorEvent' );
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
        this.pe.logErrorEvent.calls.reset();
        this.pe.parseProtoFile( global.AIRLINER_PROTO_PATH + testcase[ e ] );
        expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 0 );


      }
    } );

    it( 'Should log error', () => {
      this.pe.logErrorEvent.calls.reset();
      this.pe.parseProtoFile( '' );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );

      this.pe.logErrorEvent.calls.reset();
      this.pe.parseProtoFile( global.AIRLINER_PROTO_PATH + 'BAT_CurrentValueTable_t.proto' );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    } );


  } );

  describe( 'getAppNameFromPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.pe.getAppNameFromPath( [] ) ).toBe( undefined );
      expect( this.pe.getAppNameFromPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.pe.getAppNameFromPath( 'test' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.pe.getAppNameFromPath( 'test/return' ) ).toBe( 'return' );
    } );
  } );

  describe( 'getOperationFromPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.pe.getOperationFromPath( [] ) ).toBe( undefined );
      expect( this.pe.getOperationFromPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.pe.getOperationFromPath( 'test' ) ).toBe( undefined );
      expect( this.pe.getOperationFromPath( 'test/test2' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.pe.getOperationFromPath( 'test/test2/return/' ) ).toBe( 'return' );
    } );

  } );

  describe( 'getAppDefinition', () => {

    it( 'Should return undefined on bad parameter', () => {
      expect( this.pe.getAppDefinition( 'bad path' ) ).toBe( undefined );
      expect( this.pe.getAppDefinition( [] ) ).toBe( undefined );
      expect( this.pe.getAppDefinition( {} ) ).toBe( undefined );
    } );

    it( 'Shoud return a fully formed object on passing correct app name', () => {
      expect( typeof this.pe.getAppDefinition( 'AMC' ) ).toBe( 'object' );
    } );

  } );

  describe( 'getMsgDefByPath', () => {

    beforeEach( () => {
      spyOn( this.pe, 'logErrorEvent' );
    } )

    it( 'Should return undefined on bad parameter', () => {
      spyOn( this.pe, 'getTlmDefByPath' ).and.returnValue( undefined );
      expect( this.pe.getMsgDefByPath( jasmine.any( String ) ) ).toBe( undefined );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    } );

    it( 'Shoud return a airliner_msg on passing correct path', () => {
      expect( this.pe.getMsgDefByPath( '/PX4/PX4_VehicleGpsPositionMsg_t/Lat' ) ).toBe( 'PX4_VehicleGpsPositionMsg_t' );
    } );

  } );


  describe( 'getTlmDefByPath', () => {

    beforeEach( () => {
      spyOn( this.pe, 'logErrorEvent' );
      spyOn( this.pe, 'getAppNameFromPath' ).and.callThrough();
      spyOn( this.pe, 'getOperationFromPath' ).and.callThrough();
      spyOn( this.pe, 'getAppDefinition' ).and.callThrough();
    } )

    it( 'Should return undefined on bad parameter', () => {
      expect( this.pe.getTlmDefByPath( '' ) ).toBe( undefined );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );
      expect( this.pe.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 5 );

      this.pe.logErrorEvent.calls.reset();
      expect( this.pe.getTlmDefByPath( '/PX4' ) ).toBe( undefined );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );
      expect( this.pe.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 2 );

      this.pe.logErrorEvent.calls.reset();
      expect( this.pe.getTlmDefByPath( '/test/test' ) ).toBe( undefined );
      expect( this.pe.logErrorEvent ).toHaveBeenCalledTimes( 1 );
      expect( this.pe.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 5 );

    } );

    it( 'Shoud return a fully formed object on passing correct path', () => {
      expect( typeof this.pe.getTlmDefByPath( '/PX4/PX4_VehicleGpsPositionMsg_t' ) ).toBe( 'object' );
    } );

  } );



} );