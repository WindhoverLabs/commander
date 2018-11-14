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

var BinaryDecoder = require( './index' );
var TestConfig = require( '../config/test.json' );
var Emitter = require( 'events' );
var Config = require( './config.js' );
var fs = require( 'fs' );

describe( 'BinaryDecoder', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryDecoder.configFile;
    this.bd = new BinaryDecoder( workspace, configFile );
    Config.loadFile( configFile );
    this.emitter = new Emitter();
    this.bd.setInstanceEmitter( this.emitter );
  } );

  it( 'Should excercise code with endianess value being big', () => {
    spyOn( JSON, 'parse' ).and.returnValue( {
      Airliner: {
        little_endian: false,
        apps: {}
      },
      autogen_version: ''
    } );
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryDecoder.configFile;
    var bd1 = new BinaryDecoder( workspace, configFile );
    expect( bd1.ccsdsPriHdr ).toBeDefined();
    expect( bd1.ccsdsCmdSecHdr ).toBeDefined();
    expect( bd1.ccsdsTlmSecHdr ).toBeDefined();
    expect( bd1.tlmHeaderLength ).toBeDefined();
    expect( bd1.ccsds ).toBeDefined();
  } );

  it( 'Should excercise all cases while parsing ccsds header', () => {
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryDecoder.configFile;
    var testcases = [ 'CFE_SB_TIME_32_32_SUBS', 'CFE_SB_TIME_32_32_M_20' ];
    var spy = spyOn( Config, 'get' );
    spy.withArgs( 'msgDefs' ).and.callThrough();
    var binaryDecoder = undefined;
    for ( e in testcases ) {
      spy.withArgs( 'CFE_SB_PACKET_TIME_FORMAT' ).and.returnValue( testcases[ e ] );
      binaryDecoder = new BinaryDecoder( workspace, configFile );
      expect( binaryDecoder.ccsdsPriHdr ).toBeDefined();
      expect( binaryDecoder.ccsdsCmdSecHdr ).toBeDefined();
      expect( binaryDecoder.ccsdsTlmSecHdr ).toBeDefined();
      expect( binaryDecoder.tlmHeaderLength ).toBeDefined();
      expect( binaryDecoder.ccsds ).toBeDefined();
    }
  } );

  describe( 'Constructor', () => {

    it( 'Should load airliner.json to memory', () => {
      expect( this.bd.defs ).toBeDefined();
    } );

    it( 'Should configure Endianess', () => {
      expect( this.bd.ccsdsPriHdr ).toBeDefined();
      expect( this.bd.ccsdsCmdSecHdr ).toBeDefined();
      expect( this.bd.ccsdsTlmSecHdr ).toBeDefined();
      expect( this.bd.tlmHeaderLength ).toBeDefined();
      expect( this.bd.ccsds ).toBeDefined();
    } );

  } );

  describe( 'setInstanceEmitter', () => {

    beforeEach( () => {
      spyOn( this.bd, 'logErrorEvent' );
      spyOn( this.bd.instanceEmitter._events, Config.get( 'binaryInputStreamID' ) )
      this.smallPayload = {
        name: '/CFE/CFE_ES_HkPacket_t/Payload.SysLogEntries'
      };
      this.bigPayload = [ {
          name: '/CFE/CFE_ES_HkPacket_t/Payload.ERLogEntries'
        },
        {
          name: '/CFE/CFE_ES_HkPacket_t/Payload.HeapBytesFree'
        },
        {
          name: '/CFE/CFE_ES_HkPacket_t/Payload.HeapBlocksFree'
        },
        {
          name: '/CFE/CFE_ES_PoolStatsTlm_t/Payload.PoolHandle',
          format: '0x%08x'
        },
        {
          name: '/CFE/CFE_ES_PoolStatsTlm_t/Payload.PoolStats.PoolSize'
        }
      ];
    } );

    it( 'Should react to emit on bin-tlm-stream', () => {
      this.bd.instanceEmitter.emit( Config.get( 'binaryInputStreamID' ), this.payload );
      expect( this.bd.instanceEmitter._events[ Config.get( 'binaryInputStreamID' ) ] ).toHaveBeenCalledTimes( 1 );
      expect( this.bd.instanceEmitter._events[ Config.get( 'binaryInputStreamID' ) ] ).toHaveBeenCalledWith( this.payload );
    } );

    it( 'Should react to emit on tlm-def-request', () => {
      var someFunc = jasmine.any( Function );
      spyOn( this.bd.instanceEmitter._events, Config.get( 'tlmDefReqStreamID' ) )
      this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), this.payload, someFunc );
      expect( this.bd.instanceEmitter._events[ Config.get( 'tlmDefReqStreamID' ) ] ).toHaveBeenCalledTimes( 1 );
      expect( this.bd.instanceEmitter._events[ Config.get( 'tlmDefReqStreamID' ) ] ).toHaveBeenCalledWith( this.payload, someFunc );
    } );

    it( 'Should log error when {}/[] is sent on tlm-def-request', () => {

      spyOn( this.bd, 'stripArrayIdentifiers' ).and.returnValue( undefined );
      spyOn( this.bd, 'getTlmDefByName' ).and.returnValue( undefined );
      this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), {}, ( param ) => {
        expect( param ).toEqual( undefined );
      } );
      expect( this.bd.logErrorEvent ).toHaveBeenCalledTimes( 1 );
      expect( this.bd.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 8 );

      this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), [], ( param ) => {
        expect( param ).toEqual( [] );
      } );

    } );

    it( 'Should call callback with defintions is sent on tlm-def-request', () => {

      this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), this.smallPayload, ( param ) => {
        expect( param.opsPath ).toBe( this.smallPayload.name );
        expect( param.dataType ).toBeDefined();
      } );

      this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), this.bigPayload, ( param ) => {
        expect( typeof param.length ).toBe( 'number' );
        expect( param.length ).toBe( this.bigPayload.length );
        for ( var i = 0; i < param.length; ++i ) {
          var cp = param[ i ].opsPath;
          for ( var j = 0; j < this.bigPayload.length; ++j ) {
            if ( cp.opsPath == this.bigPayload[ j ].name ) {
              expect( cp.dataType ).toBeDefined();
            }
          }
        }
      } );

    } );

    it( 'Shoud throw error on receiving an object it does not expect on tlm-def-request', () => {

      expect( () => {
        this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), [ 'a', 'b' ], ( param ) => {} );
      } ).not.toThrow();

      expect( () => {
        this.bd.instanceEmitter.emit( Config.get( 'tlmDefReqStreamID' ), {
          'a': 'b'
        }, ( param ) => {} );
      } ).not.toThrow();
    } );
  } );

  describe( 'getTlmDefByName', () => {


    it( 'Should return undefined on erroneous input', () => {

      var spy = spyOn( this.bd, 'getTlmDefByPath' ).and.returnValue( undefined );
      expect( this.bd.getTlmDefByName( '' ) ).toBe( undefined );

      spy.and.returnValue( 'test' );

      expect( this.bd.getTlmDefByName( '' ) ).toEqual( {
        opsPath: '',
        arrayLength: undefined,
        dataType: undefined
      } );

      expect( this.bd.getTlmDefByName( [] ) ).toEqual( {
        opsPath: [],
        arrayLength: undefined,
        dataType: undefined
      } );

      expect( this.bd.getTlmDefByName( {} ) ).toEqual( {
        opsPath: {},
        arrayLength: undefined,
        dataType: undefined
      } );

      spy.and.returnValue( {
        airliner_type: 'char'
      } );
      expect( this.bd.getTlmDefByName( '' ).dataType ).toEqual( 'char' );

      spy.and.returnValue( {
        pb_type: 'char'
      } );
      expect( this.bd.getTlmDefByName( '' ).dataType ).toEqual( 'char' );



    } );

    it( 'Should accept valid tlm paths and return fully formed defs', () => {
      var opsName = '/CFE/CFE_ES_HkPacket_t/Payload.SysLogEntries'
      expect( this.bd.getTlmDefByName( opsName ).opsPath ).toBe( opsName );
      expect( this.bd.getTlmDefByName( opsName ).dataType ).toBe( 'uint32' );

    } );


  } );

  describe( 'getAppNameFromPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.bd.getAppNameFromPath( [] ) ).toBe( undefined );
      expect( this.bd.getAppNameFromPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.bd.getAppNameFromPath( 'test' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.bd.getAppNameFromPath( 'test/return' ) ).toBe( 'return' );
    } );
  } );

  describe( 'getOperationFromPath', () => {

    it( 'Should not accept a not sting parameter', () => {
      expect( this.bd.getOperationFromPath( [] ) ).toBe( undefined );
      expect( this.bd.getOperationFromPath( {} ) ).toBe( undefined );
    } );

    it( 'Should accept a invalid string and try process it', () => {
      expect( this.bd.getOperationFromPath( 'test' ) ).toBe( undefined );
      expect( this.bd.getOperationFromPath( 'test/test2' ) ).toBe( undefined );
    } );

    it( 'Should accept a valid path string and process it', () => {
      expect( this.bd.getOperationFromPath( 'test/test2/return/' ) ).toBe( 'return' );
    } );

  } );

  describe( 'getAppDefinition', () => {

    it( 'Should return undefined on bad parameter', () => {
      expect( this.bd.getAppDefinition( 'bad path' ) ).toBe( undefined );
      expect( this.bd.getAppDefinition( [] ) ).toBe( undefined );
      expect( this.bd.getAppDefinition( {} ) ).toBe( undefined );
    } );

    it( 'Shoud return a fully formed object on passing correct app name', () => {
      expect( typeof this.bd.getAppDefinition( 'AMC' ) ).toBe( 'object' );
    } );

  } );

  describe( 'getTlmDefByPath', () => {

    beforeEach( () => {
      spyOn( this.bd, 'logErrorEvent' )
    } )
    it( 'Should return undefined on bad path', () => {

      expect( this.bd.getTlmDefByPath( 'bad path' ) ).toBe( undefined );
      expect( this.bd.getTlmDefByPath( [] ) ).toBe( undefined );
      expect( this.bd.getTlmDefByPath( {} ) ).toBe( undefined );
      expect( this.bd.getTlmDefByPath( '{}/[]/&&' ) ).toBe( undefined );

    } );

    it( 'Should log OPS_PATH_NOT_FOUND error', () => {
      expect( this.bd.getTlmDefByPath( '{}/[]' ) ).toBe( undefined );
      expect( this.bd.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 2 );
    } );

    it( 'Should log APP_NOT_FOUND error', () => {
      expect( this.bd.getTlmDefByPath( 'CFE/[]/&&' ) ).toBe( undefined );
      expect( this.bd.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 5 );
      expect( this.bd.getTlmDefByPath( 'CFE/CFE_ES_HkPacket_t/&&' ) ).toBe( undefined );
      expect( this.bd.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 5 );
    } );

    it( 'Shoud return a fully formed object on passing correct path', () => {
      expect( typeof this.bd.getTlmDefByPath( '/CFE/CFE_ES_HkPacket_t/Payload.SysLogEntries' ) ).toBe( 'object' );
    } );

  } );

  describe( 'isOpNameAnArray', () => {

    it( 'Should return true if a array string is passed', () => {
      expect( this.bd.isOpNameAnArray( 'test[]' ) ).toBe( true );
      expect( this.bd.isOpNameAnArray( 'test[1,2,3]' ) ).toBe( true );
      expect( this.bd.isOpNameAnArray( 'test[asdas asdasd]' ) ).toBe( true );
    } );

    it( 'Should return false if any other object or string is passed', () => {
      expect( this.bd.isOpNameAnArray( 'test' ) ).toBe( false );
      expect( this.bd.isOpNameAnArray( '[1,2,3]' ) ).toBe( false );
      expect( this.bd.isOpNameAnArray( {} ) ).toBe( false );
      expect( this.bd.isOpNameAnArray( [] ) ).toBe( false );
    } );

  } );

  describe( 'stripArrayIdentifier', () => {

    it( 'Should return identifier name if a array string with identifier is passed', () => {
      expect( this.bd.stripArrayIdentifier( 'test[]' ) ).toBe( 'test' );
      expect( this.bd.stripArrayIdentifier( 'test[1,2,3]' ) ).toBe( 'test' );
      expect( this.bd.stripArrayIdentifier( 'test[asdas asdasd]' ) ).toBe( 'test' );
    } );

    it( 'Should return passed object if it does not match criteria', () => {
      expect( this.bd.stripArrayIdentifier( 'test' ) ).toBe( 'test' );
      expect( this.bd.stripArrayIdentifier( '[1,2,3]' ) ).toBe( '[1,2,3]' );
      expect( this.bd.stripArrayIdentifier( {} ) ).toEqual( {} );
      expect( this.bd.stripArrayIdentifier( [] ) ).toEqual( [] );
    } );

  } );

  describe( 'stripArrayIdentifier', () => {

    it( 'Should return identifier names if a composite array string with identifiers is passed', () => {
      expect( this.bd.stripArrayIdentifiers( 'test[].test2[]' ) ).toBe( 'test.test2' );
      expect( this.bd.stripArrayIdentifiers( 'test[1,2,3].test2["a","b"]' ) ).toBe( 'test.test2' );
      expect( this.bd.stripArrayIdentifiers( 'test[asdas asdasd].test2[sad asd]' ) ).toBe( 'test.test2' );
    } );

    it( 'Should return passed object or undefined if it does not match criteria', () => {
      expect( this.bd.stripArrayIdentifiers( 'test' ) ).toBe( 'test' );
      expect( this.bd.stripArrayIdentifiers( '[1,2,3]' ) ).toBe( '[1,2,3]' );
      expect( this.bd.stripArrayIdentifiers( {} ) ).toBe( undefined );
      expect( this.bd.stripArrayIdentifiers( [] ) ).toBe( undefined );
    } );

  } );

  describe( 'getMsgDefByName', () => {

    it( 'Should return proto object', () => {
      expect( typeof this.bd.getMsgDefByName( 'CFE_EVS_Packet_t' ) ).toBe( 'object' );
    } );

    it( 'Should return undefined', () => {
      expect( this.bd.getMsgDefByName( 'test' ) ).toBe( undefined );
      expect( this.bd.getMsgDefByName( '[1,2,3]' ) ).toBe( undefined );
      expect( this.bd.getMsgDefByName( {} ) ).toBe( undefined );
      expect( this.bd.getMsgDefByName( [] ) ).toBe( undefined );
    } );

  } );

  describe( 'getMsgDefByMsgID', () => {

    it( 'Should return an object', () => {
      expect( typeof this.bd.getMsgDefByMsgID( 3181 ) ).toBe( 'object' );
      expect( typeof this.bd.getMsgDefByMsgID( 2643 ) ).toBe( 'object' );
      expect( typeof this.bd.getMsgDefByMsgID( 2536 ) ).toBe( 'object' );
    } );

    it( 'Should return undefined', () => {
      expect( this.bd.getMsgDefByMsgID( 'test' ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( '[1,2,3]' ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( {} ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( [] ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( 2 ) ).toBe( undefined );
    } );

  } );

  describe( 'getFieldObjFromPbMsg', () => {

    it( 'Parameter fieldPathArray should return undefined when incompatable objects or numbers are passed', () => {

      expect( this.bd.getFieldObjFromPbMsg( {}, {}, 0 ) ).toEqual( undefined );
      expect( this.bd.getFieldObjFromPbMsg( {}, 1, 0 ) ).toEqual( undefined );
      expect( this.bd.getFieldObjFromPbMsg( {}, {
        length: 3
      }, 0 ) ).toEqual( undefined );

    } );

    it( 'Parameter fieldPathArray should return valid field object', () => {

      expect( this.bd.getFieldObjFromPbMsg( {
          'fields': {
            'CmdCounter': {
              bit_offset: 4
            }
          }
        },
        [ 'CmdCounter' ],
        96 ) ).toEqual( {
        fieldDef: {
          bit_offset: 4
        },
        bitOffset: 100
      } );
    } );

  } );

  describe( 'getFieldFromOperationalName', () => {

    it( 'Should log error when an incompatable operation name is given', () => {
      expect( this.bd.getFieldFromOperationalName( {}, 'test', 0 ) ).toEqual( undefined )
      expect( this.bd.getFieldFromOperationalName( {}, {}, 0 ) ).toEqual( undefined )
    } );



    it( 'Should return field when operational name is passed', () => {
      spyOn( this.bd, 'getFieldObjFromPbMsg' ).and.returnValue( [ 'success' ] );
      spyOn( this.bd, 'logErrorEvent' );
      expect( this.bd.getFieldFromOperationalName( {
        'operational_names': {
          'Payload': {}
        }
      }, 'Payload.CmdCounter', 0 ) ).toEqual( [ 'success' ] )
      expect( this.bd.logErrorEvent ).toHaveBeenCalledTimes( 0 );
    } );


  } );

  describe( 'processBinaryMessage', () => {

    beforeEach( () => {
      this.sampleBuff1 = new Buffer( [ 10, 83, 211, 150, 0, 21, 248, 149, 15, 0, 125, 110, 142, 87, 209, 95, 0, 0, 0, 0, 0, 64, 28, 70, 1, 0, 0, 0 ] );
      this.spy = spyOn( this.bd, 'instanceEmit' )
    } );
    it( 'Should populate tlm object ready to be sent', () => {

      this.bd.processBinaryMessage( this.sampleBuff1 )
      expect( this.bd.instanceEmit ).toHaveBeenCalledTimes( 1 );
      expect( this.bd.instanceEmit.calls.argsFor( 0 )[ 0 ] ).toBe( Config.get( 'jsonOutputStreamID' ) );
      expect( this.bd.instanceEmit.calls.argsFor( 0 )[ 1 ].opsPath ).toBe( '/PX4/PX4_VehicleLandDetectedMsg_t' );
    } );

    it( 'Shoud not emit when erroneous value is passed in as buffer', () => {
      this.spy.calls.reset();
      this.bd.processBinaryMessage( [] )
      expect( this.bd.instanceEmit ).not.toHaveBeenCalledTimes( 0 );
      expect( this.bd.instanceEmit.calls.argsFor( 0 )[ 0 ] ).not.toBe( Config.get( 'jsonOutputStreamID' ) );
    } );


  } );

  describe( 'getFieldValueAsPbType', () => {

    beforeEach( () => {
      this.spy = spyOn( this.bd, 'logErrorEvent' )
    } );

    it( 'Should complete when compatable parameters are passed', () => {
      this.spy.calls.reset();
      expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0 ] ), {
        array_length: 2
      }, 0, {} ) ).toEqual( [] )
      expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0 ] ), {
        airliner_type: 'CFE_SB_PipeId_t'
      }, 0, {} ) ).toEqual( 0 );

    } );

    it( 'Should excercise code when fieldDef.array_length less than or equal to  1', () => {

      var pbtype_testcases = [ 'char', 'int8', 'uint16', 'CFE_SB_MsgId_t', 'int16', 'uint32', 'int32', 'float', 'double', 'boolean', 'uint64', 'int64' ];
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( '0' );
        } else {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( 0 );
        }
      }
      /* big endianess */
      this.bd.endian = 'big';
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( '0' );
        } else {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( 0 );
        }
      }
      this.bd.endian = 'little';

    } );

    it( 'Should excercise code when fieldDef.array_length greater than to  1', () => {

      var pbtype_testcases = [ 'char', 'uint8', 'int8', 'string', 'CFE_SB_MsgId_t', 'int16', 'uint16', 'uint32', 'int32', 'float', 'double', 'boolean', 'uint64', 'int64' ];
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else if ( pbtype_testcases[ e ] == 'char' | pbtype_testcases[ e ] == 'string' ) {
          // expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
          //   pb_type: pbtype_testcases[ e ],
          //   array_length: 2
          // }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ 0, 0 ] );
        }
      }
      /* big endianess */
      this.bd.endian = 'big';
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else if ( pbtype_testcases[ e ] == 'char' | pbtype_testcases[ e ] == 'string' ) {
          // expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
          //   pb_type: pbtype_testcases[ e ],
          //   array_length: 2
          // }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else {
          expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            pb_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ 0, 0 ] );
        }
      }
      this.bd.endian = 'little';

    } );


  } );

  describe( 'getFieldValue', () => {

    beforeEach( () => {
      this.spy = spyOn( this.bd, 'logErrorEvent' )
    } );
    it( 'Should complete when compatable parameters are passed', () => {
      this.spy.calls.reset();
      expect( this.bd.getFieldValueAsPbType( new Buffer( [ 0, 0, 0, 0 ] ), {
        array_length: 2
      }, 0, {} ) ).toEqual( [] );
    } );

    it( 'Should excercise code when fieldDef.array_length less than or equal to  1', () => {

      var pbtype_testcases = [ 'char', 'int8', 'uint16', 'CFE_SB_MsgId_t', 'int16', 'uint32', 'int32', 'float', 'double', 'boolean', 'uint64', 'int64' ];
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( '0' );
        } else {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( 0 );
        }
      }
      /* big endianess */
      this.bd.endian = 'big';
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( '0' );
        } else {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 0
          }, 0, {} ) ).toEqual( 0 );
        }
      }
      this.bd.endian = 'little';

    } );

    it( 'Should excercise code when fieldDef.array_length greater than to  1', () => {

      var pbtype_testcases = [ 'char', 'uint8', 'int8', 'string', 'CFE_SB_MsgId_t', 'int16', 'uint16', 'uint32', 'int32', 'float', 'double', 'boolean', 'uint64', 'int64' ];
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else if ( pbtype_testcases[ e ] == 'char' | pbtype_testcases[ e ] == 'string' ) {
          // expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
          //   airliner_type: pbtype_testcases[ e ],
          //   array_length: 2
          // }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ 0, 0 ] );
        }
      }
      /* big endianess */
      this.bd.endian = 'big';
      for ( var e in pbtype_testcases ) {
        if ( pbtype_testcases[ e ] == 'uint64' | pbtype_testcases[ e ] == 'int64' ) {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else if ( pbtype_testcases[ e ] == 'char' | pbtype_testcases[ e ] == 'string' ) {
          // expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
          //   airliner_type: pbtype_testcases[ e ],
          //   array_length: 2
          // }, 0, {} ) ).toEqual( [ '0', '0' ] );
        } else {
          expect( this.bd.getFieldValue( new Buffer( [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ), {
            airliner_type: pbtype_testcases[ e ],
            array_length: 2
          }, 0, {} ) ).toEqual( [ 0, 0 ] );
        }
      }
      this.bd.endian = 'little';

    } );

  } );

  describe( 'getTlmDefByMsgID', () => {

    it( 'Should return an object', () => {
      expect( typeof this.bd.getMsgDefByMsgID( 3181 ) ).toBe( 'object' );
      expect( typeof this.bd.getMsgDefByMsgID( 2643 ) ).toBe( 'object' );
      expect( typeof this.bd.getMsgDefByMsgID( 2536 ) ).toBe( 'object' );
    } );

    it( 'Should return undefined', () => {
      expect( this.bd.getMsgDefByMsgID( 'test' ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( '[1,2,3]' ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( {} ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( [] ) ).toBe( undefined );
      expect( this.bd.getMsgDefByMsgID( 2 ) ).toBe( undefined );
    } );
  } );

  describe( 'cfeTimeToJsTime', () => {

    it( 'Should return javascript time', () => {
      expect( this.bd.cfeTimeToJsTime( 1012525, undefined ) ).toEqual( new Date( 'Fri Dec 12 1980 17:15:25 GMT-0600 (CST)' ) )
      expect( this.bd.cfeTimeToJsTime( 1012526, undefined ) ).toEqual( new Date( 'Fri Dec 12 1980 17:15:26 GMT-0600 (CST)' ) )
      expect( this.bd.cfeTimeToJsTime( 1012527, undefined ) ).toEqual( new Date( 'Fri Dec 12 1980 17:15:27 GMT-0600 (CST)' ) )
    } );

  } );

} );