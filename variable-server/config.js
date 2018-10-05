var convict = require('convict');

// Define a schema
var config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    jsonInputStreamID: {
        doc: 'Input JSON stream from decoder to telemetry server.',
        format: String,
        default: ''
    },
    outputEventsStreamID: {
        doc: 'Events from the variable server.',
        format: String,
        default: ''
    },
    varDefReqStreamID: {
        doc: 'Stream ID for variable definition requests.',
        format: String,
        default: ''
    },
    tlmDefReqStreamID: {
        doc: 'Stream ID for telemetry definition requests.',
        format: String,
        default: ''
    },
    reqSubscribeStreamID: {
        doc: 'Stream ID for subscription requests.',
        format: String,
        default: ''
    },
    variables: [
        {
            name: {
                doc: 'Variable name.',
                format: 'String'
            },
            persistence: {
                count: {
                    doc: 'Number of samples to retain.',
                    format: 'int',
                    default: 1
                }
            }
        }
    ]
});

module.exports = config;