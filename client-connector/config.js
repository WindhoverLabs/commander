var convict = require('convict');

// Define a schema
var config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
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
    varDefRspStreamIDPrefix: {
        doc: 'Prefix of the stream ID that variable definitions will be sent out.  The full stream name is prefix + variable name',
        format: String,
        default: ''
    },
    varUpdateStreamIDPrefix: {
        doc: 'Prefix of the stream ID that variable updates will be sent out.  The full stream name is prefix + variable name',
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
    }
});

module.exports = config;