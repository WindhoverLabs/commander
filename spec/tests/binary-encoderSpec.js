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

var BinaryEncoder = require( '../../binary-encoder/index' );
var TestConfig = require( '../../config/test.json' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'BinaryEncoder Constructor', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  it( 'Should load airliner.json to memory', () => {
    expect( this.be.defs ).toBeDefined();
  } );

  it( 'Should Configure Endianess', () => {
    expect( this.be.ccsdsPriHdr ).toBeDefined();
    expect( this.be.ccsdsCmdSecHdr ).toBeDefined();
    expect( this.be.ccsdsTlmSecHdr ).toBeDefined();
    expect( this.be.tlmHeaderLength ).toBeDefined();
    expect( this.be.ccsds ).toBeDefined();
  } );


} );

describe( 'BinaryEncoder setInstanceEmitter', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {
    this.spy = spyOn( this.be, 'logErrorEvent' );
    // spyOn(this.be.instanceEmitter._events,'cmd-def-request')
    this.cmdReqA = {
      opsPath: '/CFE/CFE_ES_NoopCmd'
    };
    this.cmdReqB = {
      opsPath: '/CFE/CFE_ES_ResetCmd'
    };
    this.cmdReqC = [ {
        opsPath: '/CFE/CFE_ES_NoopCmd'
      },
      {
        opsPath: '/CFE/CFE_ES_ResetCmd'
      }
    ];

    this.cmdReqEr = {
      opsPath: '/CFE/CFE_ES_ResetCmd000'
    };
    this.cmdReqEr1 = [ {
        opsPath: '/CFE/CFE_ES_NoopCmd000'
      },
      {
        opsPath: '/CFE/CFE_ES_ResetCmd000'
      }
    ];

    this.sndCmdA = {
      ops_path: '/CFE/CFE_ES_NoopCmd',
      args: {}
    }
    this.sndCmdEr = {
      opsPath: '/CFE/CFE_ES_NoopCmd',
      args: {}
    }
  } );

  it( 'Should react to emit on cmd-def-request stream', () => {
    var self = this;
    var sampleFuncA = function( out ) {
      expect( out.opsPath ).toBe( self.cmdReqA.opsPath )
    }
    var sampleFuncB = function( out ) {
      expect( out.opsPath ).toBe( self.cmdReqB.opsPath )
    }
    var sampleFuncC = function( out ) {
      expect( out.length ).toBe( self.cmdReqC.length )
    }

    this.be.instanceEmitter.emit( 'cmd-def-request', this.cmdReqA, sampleFuncA )
    this.be.instanceEmitter.emit( 'cmd-def-request', this.cmdReqB, sampleFuncB )
    this.be.instanceEmitter.emit( 'cmd-def-request', this.cmdReqC, sampleFuncC )
  } );

  it( 'Should log error when incompatable object is emitted over cmd-def-request stream', () => {
    var sampleFunc = function( out ) {
      expect( out ).toBe( undefined );
    }
    var sampleFunc2 = function( out ) {
      expect( out ).toEqual( [] );
    }
    this.spy.calls.reset();
    this.be.instanceEmitter.emit( 'cmd-def-request', this.cmdReqEr, sampleFunc );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.be.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 12 );
    spyOn( this.be, 'getCmdDefByMsgIDandCC' ).and.returnValue( undefined )
    this.be.instanceEmitter.emit( 'cmd-def-request', this.cmdReqEr1, sampleFunc2 );
    /* for both array elements*/
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 3 );
    expect( this.be.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 12 );

  } );

  it( 'Should call sendCommand with definition and arguments', () => {
    var sendCmdSpy = spyOn( this.be, 'sendCommand' );
    this.be.instanceEmitter.emit( 'cmd-send', this.sndCmdA );
    expect( this.be.sendCommand ).toHaveBeenCalledTimes( 1 );
    expect( this.be.sendCommand.calls.argsFor( 0 )[ 1 ] ).toEqual( {} );
    this.spy.calls.reset();
    this.be.instanceEmitter.emit( 'cmd-send', this.sndCmdEr );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.be.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 4 );

  } );

} );

describe( 'BinaryEncoder getCmdDefByName', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {

    this.nameA = '/CFE/CFE_ES_NoopCmd';
    this.nameB = '/CFE/CFE_ES_ResetCmd';
    this.nameErA = '/CFE/CFE_ES_NoopCmd0';
    this.nameErB = '/CFE/CFE_ES_ResetCmd0';

  } );

  it( 'Should accept name and return command definition if any', () => {
    expect( this.be.getCmdDefByName( this.nameA ).opsPath ).toEqual( this.nameA );
    expect( this.be.getCmdDefByName( this.nameB ).opsPath ).toEqual( this.nameB );
  } );

  it( 'Should reject the name and return undefined', () => {
    expect( this.be.getCmdDefByName( this.nameErA ) ).toEqual( undefined );
    expect( this.be.getCmdDefByName( this.nameErB ) ).toEqual( undefined );
  } );

} );

describe( 'BinaryEncoder getCmdOpNamesStripHeader', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {
    this.spy = spyOn( this.be, 'logErrorEvent' );
  } );

  it( 'Should expect empty object ({}) when passed incompatable msgDef', () => {
    expect( this.be.getCmdOpNamesStripHeader( [] ) ).toEqual( {} );
    expect( this.be.getCmdOpNamesStripHeader( {} ) ).toEqual( {} );
    expect( this.be.getCmdOpNamesStripHeader( '' ) ).toEqual( {} );
    this.spy.calls.reset();
    expect( this.be.getCmdOpNamesStripHeader( {
      operational_names: [ {
        'test': 5
      } ]
    } ) ).toEqual( {} );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.be.logErrorEvent.calls.argsFor( 0 )[ 0 ] ).toBe( 7 );

  } );

  it( 'Should return empty object for NOOP command', () => {

    var opDef = this.be.getOperationByPath( '/CFE/CFE_ES_NoopCmd' );
    var msgDef = this.be.getMsgDefByName( opDef.operation.airliner_msg );
    /* no arguments */
    expect( this.be.getCmdOpNamesStripHeader( msgDef ) ).toEqual( {} );
  } );

  it( 'Should return a populated object for the command CFE_ES_OverWriteSysLogCmd_t', () => {

    var opDef = this.be.getOperationByPath( '/CFE/CFE_ES_OverWriteSysLogCmd_t' );
    var msgDef = this.be.getMsgDefByName( opDef.operation.airliner_msg );
    /* has aargument */
    expect( this.be.getCmdOpNamesStripHeader( msgDef ).hasOwnProperty( 'Payload.Mode' ) ).toEqual( true );

  } );

} );

describe( 'BinaryEncoder getIntrinsicType', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );

  } );

  beforeEach( () => {
    this.fieldDefA = {
      bit_offset: 0,
      bit_size: 512,
      airliner_name: 'SysLogFileName',
      airliner_type: 'char',
      pb_type: 'string',
      array_length: 64,
      pb_field_rule: 'required'
    };
    this.fieldDefB = {
      bit_offset: 64,
      bit_size: 32,
      airliner_name: 'Payload',
      pb_type: 'uint32',
      array_length: 0,
      pb_field_rule: 'required'
    }
    this.fieldDefC = {
      bit_offset: 0,
      bit_size: 512,
      airliner_name: 'ERLogFileName',
      airliner_type: 'char',
      pb_type: 'string',
      array_length: 64,
      pb_field_rule: 'required'
    }
    this.fieldDefErA = {};
    this.fieldDefErB = [];
    this.fieldDefErC = '';
    this.fieldDefErD = 10;

    this.spy = spyOn( this.be, 'logErrorEvent' );
  } );

  it( 'Should return airliner field type', () => {
    expect( this.be.getIntrinsicType( this.fieldDefA ) ).toEqual( this.fieldDefA.airliner_type );
    expect( this.be.getIntrinsicType( this.fieldDefC ) ).toEqual( this.fieldDefC.airliner_type );
  } );

  it( 'Should return protobuf field type', () => {
    expect( this.be.getIntrinsicType( this.fieldDefB ) ).toEqual( this.fieldDefB.pb_type );
  } );

  it( 'Should return undefined when encountered with incompatable object', () => {
    this.spy.calls.reset();
    expect( this.be.getIntrinsicType( this.fieldDefErA ) ).toEqual( undefined );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 1 );
    expect( this.be.getIntrinsicType( this.fieldDefErB ) ).toEqual( undefined );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 2 );
    expect( this.be.getIntrinsicType( this.fieldDefErC ) ).toEqual( undefined );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 3 );
    expect( this.be.getIntrinsicType( this.fieldDefErD ) ).toEqual( undefined );
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 4 );
  } );
} );

describe( 'BinaryEncoder getAppNameFromPath', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );

  } );

  it( 'Should not accept a not sting parameter', () => {
    expect( this.be.getAppNameFromPath( [] ) ).toBe( undefined );
    expect( this.be.getAppNameFromPath( {} ) ).toBe( undefined );
  } );

  it( 'Should accept a invalid string and try process it', () => {
    expect( this.be.getAppNameFromPath( 'test' ) ).toBe( undefined );
  } );

  it( 'Should accept a valid path string and process it', () => {
    expect( this.be.getAppNameFromPath( 'test/return' ) ).toBe( 'return' );
  } );

} );

describe( 'BinaryEncoder getOperationFromPath', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  it( 'Should not accept a not sting parameter', () => {
    expect( this.be.getOperationFromPath( [] ) ).toBe( undefined );
    expect( this.be.getOperationFromPath( {} ) ).toBe( undefined );
  } );

  it( 'Should accept a invalid string and try process it', () => {
    expect( this.be.getOperationFromPath( 'test' ) ).toBe( undefined );
    expect( this.be.getOperationFromPath( 'test/test2' ) ).toBe( undefined );
  } );

  it( 'Should accept a valid path string and process it', () => {
    expect( this.be.getOperationFromPath( 'test/test2/return/' ) ).toBe( 'return' );
  } );

} );

describe( 'BinaryEncoder getOperationByPath', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  beforeEach( () => {
    this.spy = spyOn( this.be, 'logErrorEvent' );
    this.inOpsPathA = '/CFE/CFE_ES_ClearSysLog';
    this.inOpsPathB = '/CFE/CFE_ES_WriteSyslogCmd_t';
    this.inOpsPathC = '/CFE/CFE_ES_OverWriteSysLogCmd_t';

    this.inOpsPathErA = '/CFE/CFE_ES_WriteSyslogCmd_t0';
    this.inOpsPathErB = 'test';
    this.inOpsPathErC = {};
    this.inOpsPathErD = [];
  } );

  it( 'Should accept valid operational path and retrun operation object', () => {
    expect( this.be.getOperationByPath( this.inOpsPathA ).ops_path ).toEqual( this.inOpsPathA );
    expect( this.be.getOperationByPath( this.inOpsPathB ).ops_path ).toEqual( this.inOpsPathB );
    expect( this.be.getOperationByPath( this.inOpsPathC ).ops_path ).toEqual( this.inOpsPathC );
  } );

  it( 'Should reject invalid operational path and retrun undefined', () => {
    expect( this.be.getOperationByPath( this.inOpsPathErA ) ).toEqual( undefined );
    expect( this.be.getOperationByPath( this.inOpsPathErB ) ).toEqual( undefined );
    expect( this.be.getOperationByPath( this.inOpsPathErC ) ).toEqual( undefined );
    expect( this.be.getOperationByPath( this.inOpsPathErD ) ).toEqual( undefined );
  } );

} );

describe( 'BinaryEncoder getOperationByMsgIDandCC', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  beforeEach( () => {
    this.spy = spyOn( this.be, 'logErrorEvent' );
    this.inOpsA = [ 7229, 0 ]; /* AMC Noop */
    this.inOpsB = [ 7229, 1 ]; /* AMC Reset */
    this.inOpsC = [ 6150, 0 ]; /* CFE ES Noop */

    this.inOpsErA = [ 7229, -1 ];
    this.inOpsErB = [ -1, 0 ];
    this.inOpsErC = [ {}, 0 ];
    this.inOpsErD = [ 7229, [] ];
  } );

  it( 'Should accept valid msgID and cmdCode combination and retrun operation object', () => {
    expect( this.be.getOperationByMsgIDandCC( this.inOpsA[ 0 ], this.inOpsA[ 1 ] ).operation.airliner_cc ).toEqual( this.inOpsA[ 1 ] );
    expect( this.be.getOperationByMsgIDandCC( this.inOpsB[ 0 ], this.inOpsB[ 1 ] ).operation.airliner_cc ).toEqual( this.inOpsB[ 1 ] );
    expect( this.be.getOperationByMsgIDandCC( this.inOpsC[ 0 ], this.inOpsC[ 1 ] ).operation.airliner_cc ).toEqual( this.inOpsC[ 1 ] );
  } );

  it( 'Should reject invalid msgID and cmdCode combination and retrun undefined', () => {
    expect( this.be.getOperationByMsgIDandCC( this.inOpsErA[ 0 ], this.inOpsErA[ 1 ] ) ).toEqual( undefined );
    expect( this.be.getOperationByMsgIDandCC( this.inOpsErB[ 0 ], this.inOpsErB[ 1 ] ) ).toEqual( undefined );
    expect( this.be.getOperationByMsgIDandCC( this.inOpsErC[ 0 ], this.inOpsErC[ 1 ] ) ).toEqual( undefined );
    expect( this.be.getOperationByMsgIDandCC( this.inOpsErD[ 0 ], this.inOpsErD[ 1 ] ) ).toEqual( undefined );
  } );

} );

describe( 'BinaryEncoder getMsgDefByName', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  it( 'Should accept valid message name and return proto object', () => {
    expect( typeof this.be.getMsgDefByName( 'CFE_EVS_Packet_t' ) ).toBe( 'object' );
  } );

  it( 'Should reject invalid message name and return undefined', () => {
    expect( this.be.getMsgDefByName( 'test' ) ).toBe( undefined );
    expect( this.be.getMsgDefByName( '[1,2,3]' ) ).toBe( undefined );
    expect( this.be.getMsgDefByName( {} ) ).toBe( undefined );
    expect( this.be.getMsgDefByName( [] ) ).toBe( undefined );
  } );

} );

describe( 'BinaryEncoder getCmdByteLength', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  beforeEach( () => {
    this.cmdA = {
      airliner_cc: 0,
      macro: 'CFE_ES_CMD_MID',
      airliner_msg: 'CFE_SB_CmdHdr_t',
      airliner_mid: '0x1806'
    };
    this.cmdB = {
      airliner_cc: 1,
      macro: 'CFE_ES_CMD_MID',
      airliner_msg: 'CFE_SB_CmdHdr_t',
      airliner_mid: '0x1806'
    };

  } );

  it( 'Should accept valid cmd object and return msg length', () => {
    expect( this.be.getCmdByteLength( this.cmdA ) > 0 ).toBe( true );
    expect( this.be.getCmdByteLength( this.cmdB ) > 0 ).toBe( true );
  } );

  it( 'Should reject invalid cmd object and return 0', () => {
    expect( this.be.getCmdByteLength( 'test' ) ).toBe( 0 );
    expect( this.be.getCmdByteLength( '[1,2,3]' ) ).toBe( 0 );
    expect( this.be.getCmdByteLength( {} ) ).toBe( 0 );
    expect( this.be.getCmdByteLength( [] ) ).toBe( 0 );
  } );

} );

describe( 'BinaryEncoder setField', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {
    this.sampleBuffBase = new Buffer( [ 24, 6, 0, 0, 0, 5, 0, 18, 0, 0, 0, 0 ] );
    this.sampleBuff = new Buffer( [ 24, 6, 0, 0, 0, 5, 0, 18, 0, 0, 0, 0 ] ); /* copy */
    this.fieldDef1 = {
      bit_offset: 64,
      bit_size: 32,
      airliner_name: 'Payload',
      airliner_type: 'uint32',
      pb_type: 'uint32',
      array_length: 0,
      pb_field_rule: 'required'
    };
    this.bitOffset1 = 64;
    this.spy = spyOn( this.be, 'logErrorEvent' );
  } );

  it( 'Should accept valid parameters and adds new value to buffer', () => {
    this.be.setField( this.sampleBuff, this.fieldDef1, this.bitOffset1, '1' );
    expect( this.sampleBuff.toJSON().data[ 8 ] ).toEqual( 1 );
    this.be.setField( this.sampleBuff, this.fieldDef1, this.bitOffset1, '2' );
    expect( this.sampleBuff.toJSON().data[ 8 ] ).toEqual( 2 );
    this.be.setField( this.sampleBuff, this.fieldDef1, this.bitOffset1, '3' );
    expect( this.sampleBuff.toJSON().data[ 8 ] ).toEqual( 3 );
  } );

  it( 'Should error out on invalid parameters and keep the buffer unmodified', () => {
    this.spy.calls.reset();
    this.be.setField( this.sampleBuff, {}, 0, '1' );
    expect( this.sampleBuff ).toEqual( this.sampleBuffBase );
    expect( this.be.logErrorEvent.calls.count() > 0 ).toBe( true );
  } );

} );

describe( 'BinaryEncoder sendCommand', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {

    this.spy = spyOn( this.be, 'instanceEmit' )
    this.spy2 = spyOn( this.be, 'logErrorEvent' )
  } );

  it( 'Should emit binary data over binaryOutputStream', () => {

    this.spy.calls.reset();
    this.be.sendCommand( {
      opsPath: '/CFE/CFE_ES_NoopCmd',
      args: []
    }, {} );
    expect( this.be.instanceEmit ).toHaveBeenCalledTimes( 1 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 0 ] ).toEqual( 24 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 1 ] ).toEqual( 6 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 2 ] ).toEqual( 0 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 4 ] ).toEqual( 0 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 5 ] ).toEqual( 1 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 6 ] ).toEqual( 0 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 7 ] ).toEqual( 0 );

    this.spy.calls.reset();
    this.be.sendCommand( {
      opsPath: '/CFE/CFE_ES_OverWriteSysLogCmd_t',
      args: [ {
        name: 'Payload.Mode',
        type: 'uint32',
        bitSize: 32
      } ]
    }, {
      'Payload.Mode': '2'
    } );
    expect( this.be.instanceEmit ).toHaveBeenCalledTimes( 1 );
    expect( this.be.instanceEmit.calls.argsFor( 0 )[ 1 ].toJSON().data[ 8 ] ).toEqual( 2 );

  } );

  it( 'Should error out on bad input to binaryOutputStream', () => {
    this.be.logErrorEvent.calls.reset();
    this.be.sendCommand( {}, {} );
    expect( this.be.logErrorEvent.calls.count() > 0 ).toBe( true );

    this.be.logErrorEvent.calls.reset();
    this.be.sendCommand( [], {} );
    expect( this.be.logErrorEvent.calls.count() > 0 ).toBe( true );

    this.be.logErrorEvent.calls.reset();
    this.be.sendCommand( '[]', '{}' );
    expect( this.be.logErrorEvent.calls.count() > 0 ).toBe( true );

  } );

} );

describe( 'BinaryEncoder getFieldObjFromPbMsg', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {

  } );

  it( 'Parameter fieldPathArray should return undefined when incompatable objects or numbers are passed', () => {

    expect( this.be.getFieldObjFromPbMsg( {}, {}, 0 ) ).toEqual( undefined );
    expect( this.be.getFieldObjFromPbMsg( {}, 1, 0 ) ).toEqual( undefined );
    expect( this.be.getFieldObjFromPbMsg( {}, {
      length: 3
    }, 0 ) ).toEqual( undefined );

  } );

  it( 'Parameter fieldPathArray should return valid field object', () => {

    expect( this.be.getFieldObjFromPbMsg( {
        'fields': {
          'Command': {
            bit_offset: 16
          }
        }
      },
      [ 'Command' ],
      48 ) ).toEqual( {
      fieldDef: {
        bit_offset: 16
      },
      bitOffset: 64
    } );
  } );

} );

describe( 'BinaryEncoder getFieldFromOperationalName', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
    this.emitter = new Emitter();
    this.be.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {

  } );

  it( 'Should log error when an incompatable operation name is given', () => {
    expect( this.be.getFieldFromOperationalName( {}, 'test', 0 ) ).toEqual( undefined )
    expect( this.be.getFieldFromOperationalName( {}, {}, 0 ) ).toEqual( undefined )
  } );



  it( 'Should return field when operational name is passed', () => {
    spyOn( this.be, 'getFieldObjFromPbMsg' ).and.returnValue( [ 'success' ] );
    spyOn( this.be, 'logErrorEvent' );
    expect( this.be.getFieldFromOperationalName( {
      operational_names: {
        'Pri.Length': {
          field_path: 'Pri.Length'
        },
        'Pri.Sequence': {
          field_path: 'Pri.Sequence'
        },
        'Pri.StreamId': {
          field_path: 'Pri.StreamId'
        },
        'Sec.Command': {
          field_path: 'Sec.Command'
        }
      }
    }, 'Sec.Command', 0 ) ).toEqual( [ 'success' ] )
    expect( this.be.logErrorEvent ).toHaveBeenCalledTimes( 0 );
  } );

} );

describe( 'BinaryEncoder isCommandMsg', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  beforeEach( () => {
    this.cmdMsgIDs = [ 6145, 6150, 6147, 6148, 7229 ];
    this.tlmMsgIDs = [ 2048, 2060, 3137, 2572, 2647 ];
  } );

  it( 'Should accept valid command msgIDs and return true', () => {
    for ( var i in this.cmdMsgIDs ) {
      expect( this.be.isCommandMsg( this.cmdMsgIDs[ i ] ) ).toBe( true );
    }
  } );

  it( 'Should accept valid telemetry msgIDs and return false', () => {
    for ( var i in this.tlmMsgIDs ) {
      expect( this.be.isCommandMsg( this.tlmMsgIDs[ i ] ) ).toBe( false );
    }
  } );

} );

describe( 'BinaryEncoder isTelemetryMsg', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.BinaryEncoder.configFile;
    this.be = new BinaryEncoder( workspace, configFile );
  } );

  beforeEach( () => {
    this.cmdMsgIDs = [ 6145, 6150, 6147, 6148, 7229 ];
    this.tlmMsgIDs = [ 2048, 2060, 3137, 2572, 2647 ];
  } );

  it( 'Should accept valid command msgIDs and return false', () => {
    for ( var i in this.cmdMsgIDs ) {
      expect( this.be.isTelemetryMsg( this.cmdMsgIDs[ i ] ) ).toBe( false );
    }
  } );

  it( 'Should accept valid telemetry msgIDs and return true', () => {
    for ( var i in this.tlmMsgIDs ) {
      expect( this.be.isTelemetryMsg( this.tlmMsgIDs[ i ] ) ).toBe( true );
    }
  } );

} );