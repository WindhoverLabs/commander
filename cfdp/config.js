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
 * Define cfdp-database schema
 * @type {Object}
 */
var config = convict( {
  env: {
    doc: 'The application environment.',
    format: [ 'production', 'development', 'test' ],
    default: 'development',
    env: 'NODE_ENV'
  },
  mibParameters: {
    ACK_TIMEOUT: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '10'
    },
    ACK_LIMIT: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '2'
    },
    NAK_TIMEOUT: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '5'
    },
    NAK_LIMIT: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '3'
    },
    INACTIVITY_TIMEOUT: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '20'
    },
    OUTGOING_FILE_CHUNK_SIZE: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '64'
    },
    SAVE_INCOMPLETE_FILES: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: 'no'
    },
    MY_ID: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '0.23'
    }
  },
  config: {
    DEFAULT_TEMP_BASE_DIR: {
      doc: 'Path for cfdp engine to store temporary files',
      format: String,
      default: '/tmp/cf/'
    }
  },
  CfdpStreamID: {
    doc: 'Stream ID for cfdp queries',
    format: String,
    default: ''
  },
  cfdpInputStream: {
    doc: 'Stream ID for listening to binary data',
    format: String,
    default: ''
  }
} );

module.exports = config;
