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

var convict = require( 'convict' );

/**
 * Define config-database schema
 * @type {Object}
 */
var config = convict( {
  env: {
    doc: 'The application environment.',
    format: [ 'production', 'development', 'test' ],
    default: 'development',
    env: 'NODE_ENV'
  },
  CFE_SB_PACKET_TIME_FORMAT: {
    doc: 'CFE SB time format.',
    format: [ 'CFE_SB_TIME_32_16_SUBS', 'CFE_SB_TIME_32_32_SUBS', 'CFE_SB_TIME_32_32_M_20' ],
    default: 'CFE_SB_TIME_32_16_SUBS'
  },
  CFE_TIME_EPOCH_YEAR: {
    doc: 'CFE Time epoch year.',
    format: 'int',
    default: 1980
  },
  CFE_TIME_EPOCH_DAY: {
    doc: 'CFE Time epoch year.',
    format: 'int',
    default: 1
  },
  CFE_TIME_EPOCH_HOUR: {
    doc: 'CFE Time epoch year.',
    format: 'int',
    default: 0
  },
  CFE_TIME_EPOCH_MINUTE: {
    doc: 'CFE Time epoch year.',
    format: 'int',
    default: 0
  },
  CFE_TIME_EPOCH_SECOND: {
    doc: 'CFE Time epoch year.',
    format: 'int',
    default: 0
  },
  msgDefs: [ {
    file: {
      doc: 'Input file.',
      format: String,
      default: ''
    }
  } ],
  queryConfigStreamID: {
    doc: 'Stream ID for configuration queries',
    format: String,
    default: ''
  }
} );

module.exports = config;