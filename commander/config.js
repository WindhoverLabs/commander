var convict = require('convict');

// Define a schema
var config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    instances: [
    	{
	    	name: {
	            doc: 'Commander instance name.',
	            format: 'String',
	            default: ''
	        },
	        CFE_SB_PACKET_TIME_FORMAT: {
	            doc: 'CFE Software Bus message time Format.',
	            format: ['CFE_SB_TIME_32_16_SUBS', 'CFE_SB_TIME_32_32_SUBS'],
	            default: 'CFE_SB_TIME_32_16_SUBS'
	        },
	        CFE_TIME_EPOCH_YEAR: {
	            doc: 'CFE Software Bus message epoch year.',
	            format: 'int',
	            default: 1980
	        },
	        CFE_TIME_EPOCH_DAY: {
	            doc: 'CFE Software Bus message epoch day.',
	            format: 'int',
	            default: 1
	        },
	        CFE_TIME_EPOCH_HOUR: {
	            doc: 'CFE Software Bus message epoch hour.',
	            format: 'int',
	            default: 0
	        },
	        CFE_TIME_EPOCH_MINUTE: {
	            doc: 'CFE Software Bus message epoch minute.',
	            format: 'int',
	            default: 0
	        },
	        CFE_TIME_EPOCH_SECOND: {
	            doc: 'CFE Software Bus message epoch second.',
	            format: 'int',
	            default: 0
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
});

module.exports = config;