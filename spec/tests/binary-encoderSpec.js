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
    var workspace = global.AIRLINER_BASEPATH + this.testConfig.BinaryEncoder.workspace;
    var configFile = global.AIRLINER_BASEPATH + this.testConfig.BinaryEncoder.configFile;
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
    var workspace = global.AIRLINER_BASEPATH + this.testConfig.BinaryEncoder.workspace;
    var configFile = global.AIRLINER_BASEPATH + this.testConfig.BinaryEncoder.configFile;
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

} );