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
    cmdStreamID: {
        doc: 'Commands to the variable server.',
        format: String,
        default: ''
    },
    varUpdateStreamIDPrefix: {
        doc: 'Prefix of the stream ID that variable updates will be sent out.  The full stream name is prefix + variable name',
        format: String,
        default: ''
    }
});

module.exports = config;