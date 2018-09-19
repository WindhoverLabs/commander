var convict = require('convict');

// Define a schema
var config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    msgDefPath: {
        doc: 'Directory containing message definition JSON file, i.e. airliner.json.',
        format: String,
        default: '',
        env: 'AIRLINER_MSG_DEF_PATH'
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
    msgDefs: [{
        file: {
            doc: 'Input file.',
            format: String,
            default: ''
        }
    }],
    jsonInputStreamID: {
        doc: 'Input JSON stream from a command source to the encoder.',
        format: String,
        default: ''
    },
    binaryOutputStreamID: {
        doc: 'Output binary stream from encoder to binary data provider.',
        format: String,
        default: ''
    },
    protobufDirectory: {
        doc: 'Directory containing all the Proto Buffer definition files (*.proto).',
        format: String,
        default: '',
        env: 'AIRLINER_PROTOBUF_PATH'
    }
});

module.exports = config;