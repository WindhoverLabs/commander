var convict = require('convict');

// Define a schema
var config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    CFE_SB_PACKET_TIME_FORMAT: {
        doc: 'CFE SB time format.',
        format: ['CFE_SB_TIME_32_16_SUBS','CFE_SB_TIME_32_32_SUBS','CFE_SB_TIME_32_32_M_20'],
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
    msgDefPath: {
        doc: 'Directory containing message definition JSON file, i.e. airliner.json.',
        format: String,
        default: '',
        env: 'AIRLINER_MSG_DEF_PATH'
    },
    msgDefs: [{
        file: {
            doc: 'Input file.',
            format: String,
            default: ''
        }
    }],
    binaryInputStreamID: {
        doc: 'Input binary stream from binary data provider to the decoder.',
        format: String,
        default: ''
    },
    jsonOutputStreamID: {
        doc: 'Output JSON stream from decoder to telemetry server.',
        format: String,
        default: ''
    },
    tlmDefReqStreamID: {
        doc: 'Telemetry definition request',
        format: String,
        default: ''
    },
    tlmDefRspStreamIDPrefix: {
        doc: 'Prefix of the stream ID that telemetry definitions will be sent out.  The full stream name is prefix + telemetry name',
        format: String,
        default: ''
    }
});

module.exports = config;