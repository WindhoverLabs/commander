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

var CFDP = require( './index' );
var TestConfig = require( '../config/test.json' );
var Config = require( './config.js' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'CFDP Ground', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_WORKSPACE;
    var configFile = global.CDR_WORKSPACE + this.testConfig.CFDP.configFile;
    this.cfdp = new CFDP( workspace, configFile );
    Config.loadFile( configFile );
    this.emitter = new Emitter();
    this.cfdp.setInstanceEmitter( this.emitter );
    this.airlinerPath = AIRLINER_MSG_DEF_PATH;
    this.airlinerPath = this.airlinerPath.split( '/' );
    this.airlinerPath.pop();
    this.airlinerPath.pop( 'exe' );
    this.airlinerPath = this.airlinerPath.join( '/' );
  } );

  describe( 'Get MIB Params', () => {
    beforeEach( () => {
      this.outObj = {
        msg: 'FAILIURE',
        value: undefined
      }
    } );

    it( 'Should get value when valid param is passed', () => {
      var res = this.cfdp.GetMibParams( this.outObj, [ 'ACK_TIMEOUT' ] )
      expect( res.msg ).toBe( "SUCCESS" );
    } );

    it( 'Should not get value when invalid param is passed', () => {
      var res = this.cfdp.GetMibParams( this.outObj, [ 'ACK_TIMEOUT_FAIL' ] )
      expect( res.msg ).toBe( "FAILIURE" );
      res = this.cfdp.GetMibParams( this.outObj, [ 'ACK_TIMEOUT', '_FAIL' ] )
      expect( res.msg ).toBe( "FAILIURE" );
    } );


  } );

  describe( 'Set MIB Params', () => {
    beforeEach( () => {
      this.outObj = {
        msg: 'FAILIURE',
        value: undefined
      }
    } );

    it( 'Should get value when valid param is passed', () => {
      var res;

      this.cfdp.SetMibParams( this.outObj, [ 'ACK_TIMEOUT', '6' ] )
      res = this.cfdp.GetMibParams( this.outObj, [ 'ACK_TIMEOUT' ] )
      expect( res.msg ).toBe( "SUCCESS" );
      expect( res.value.mib_value ).toBe( "6" );

      this.cfdp.SetMibParams( this.outObj, [ 'ACK_TIMEOUT', '8' ] )
      res = this.cfdp.GetMibParams( this.outObj, [ 'ACK_TIMEOUT' ] )
      expect( res.msg ).toBe( "SUCCESS" );
      expect( res.value.mib_value ).toBe( "8" );

    } );

  } );

} );