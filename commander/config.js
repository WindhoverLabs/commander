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
    instances: [
    	{
	    	name: {
	            doc: 'Commander instance name.',
	            format: 'String',
	            default: ''
	        },
	        plugins: [
	            {
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
	            }
	        ]
    	}
    ],
    apps: [
        {
        	name: {
        		doc: 'The name of the application.',
        		format: 'String',
        		default: ''
        	}
        }
    ]
});

module.exports = config;