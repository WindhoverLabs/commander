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

var BinaryDecoder = require( '../../binary-decoder/index' );
var TestConfig = require( '../../config/test.json' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'BinaryDecoder Constructor', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = this.testConfig.AirlinerBasePath + this.testConfig.BinaryDecoder.workspace;
    var configFile = this.testConfig.AirlinerBasePath + this.testConfig.BinaryDecoder.configFile;
    process.env.AIRLINER_MSG_DEF_PATH = this.testConfig.AirlinerBasePath + this.testConfig.AirlinerMsgDefPath;
    this.bd = new BinaryDecoder( workspace, configFile );
  } );

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

describe( 'BinaryDecoder setInstanceEmitter', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = this.testConfig.AirlinerBasePath + this.testConfig.BinaryDecoder.workspace;
    var configFile = this.testConfig.AirlinerBasePath + this.testConfig.BinaryDecoder.configFile;
    process.env.AIRLINER_MSG_DEF_PATH = this.testConfig.AirlinerBasePath + this.testConfig.AirlinerMsgDefPath;
    this.bd = new BinaryDecoder( workspace, configFile );
    this.emitter = new Emitter();
    this.bd.setInstanceEmitter( this.emitter );
  } );

  beforeEach( () => {
    spyOn( this.bd.instanceEmitter._events, 'bin-tlm-stream' )
    this.payload = [ 'arr', 'Obj' ];
  } );

  it( 'Should react to emit on bin-tlm-stream', () => {
    this.bd.instanceEmitter.emit( 'bin-tlm-stream', this.payload );
    expect( this.bd.instanceEmitter._events[ 'bin-tlm-stream' ] ).toHaveBeenCalledTimes( 1 );
  } );

} );