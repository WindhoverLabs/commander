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
 * Define binary-encoder schema
 * @type {Object}
 */
var config = convict( {
  env: {
    doc: 'The application environment.',
    format: [ 'production', 'development', 'test' ],
    default: 'development',
    env: 'NODE_ENV'
  },
  varServerEventsStreamID: {
    doc: 'Variable Server events stream.',
    format: String,
    default: ''
  },
  varDefReqStreamID: {
    doc: 'Variable definition request',
    format: String,
    default: ''
  },
  cmdDefReqStreamID: {
    doc: 'Command definition request',
    format: String,
    default: ''
  },
  cmdSendStreamID: {
    doc: 'Command send',
    format: String,
    default: ''
  },
  reqSubscribeStreamID: {
    doc: 'Stream ID for subscription requests.',
    format: String,
    default: ''
  },
  queryConfigStreamID: {
    doc: 'Stream ID for configuration database queries.',
    format: String,
    default: ''
  },
  instances: [ {
    name: {
      doc: 'Commander instance name.',
      format: 'String',
      default: ''
    },
    plugins: [ {
      name: {
        doc: 'The name of the application.',
        format: 'String',
        default: ''
      },
      require: {
        doc: "The directory to 'require'.",
        format: "String",
        default: ''
      },
      config: {
        doc: "The directory to 'require'.",
        format: "Object",
        default: {}
      },
    } ]
  } ],
  apps: [ {
    name: {
      doc: 'The name of the application.',
      format: 'String',
      default: ''
    }
  } ]
} );

module.exports = config;