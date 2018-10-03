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
    reqSubscribeStreamID: {
        doc: 'Stream ID for subscription requests.',
        format: String,
        default: ''
    },
    persistence: [
        {
            name: {
                doc: 'Variable name.',
                format: 'String'
            },
            count: {
                doc: 'Number of samples to retain.',
                format: 'int',
                default: 1
            }
        }
    ]
});

module.exports = config;