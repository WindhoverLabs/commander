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