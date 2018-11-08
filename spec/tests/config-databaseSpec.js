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

var ConfigDatabase = require( '../../config-database/index' );
var TestConfig = require( '../../config/test.json' );
var Emitter = require( 'events' );
var fs = require( 'fs' );

describe( 'ConfigDatabase Constructor', () => {

  beforeAll( () => {
    this.testConfig = TestConfig;
    var workspace = global.CDR_INSTALL_DIR;
    var configFile = global.CDR_INSTALL_DIR + this.testConfig.ConfigDatabase.configFile;;
    this.cd = new BinaryEncoder( workspace, configFile );
  } );

  // it( 'Should load airliner.json to memory', () => {
  //   expect( this.cd.defs ).toBeDefined();
  // } );
  //
  // it( 'Should Configure Endianess', () => {
  //   expect( this.cd.ccsdsPriHdr ).toBeDefined();
  //   expect( this.cd.ccsdsCmdSecHdr ).toBeDefined();
  //   expect( this.cd.ccsdsTlmSecHdr ).toBeDefined();
  //   expect( this.cd.tlmHeaderLength ).toBeDefined();
  //   expect( this.cd.ccsds ).toBeDefined();
  // } );


} );