var path = require( 'path' );
var Jasmine = require( 'jasmine' );
var reporters = require( 'jasmine-reporters' );

/**
 * Colors
 * @type {String}
 */
var Reset = "\x1b[0m",
  Bright = "\x1b[1m",
  Dim = "\x1b[2m",
  Underscore = "\x1b[4m",
  Blink = "\x1b[5m",
  Reverse = "\x1b[7m",
  Hidden = "\x1b[8m",
  FgRed = "\x1b[31m",
  FgGreen = "\x1b[32m",
  FgYellow = "\x1b[33m",
  FgBlue = "\x1b[34m",
  FgMagenta = "\x1b[35m",
  FgWhite = "\x1b[37m";


// global.AIRLINER_BASEPATH = ( path.join( process.env.CDR_WORKSPACE, '../../../../../../' ) || path.join( __dirname, '../../../../../' ) ).slice( 0, -1 );
// global.CDR_WORKSPACE = process.env.CDR_WORKSPACE || path.join( __dirname, '../workspace' );
// global.AIRLINER_MSG_DEF_PATH = process.env.AIRLINER_MSG_DEF_PATH;
// global.AIRLINER_PROTO_PATH = process.env.AIRLINER_PROTO_PATH;
// global.COMMANDER_PATH = process.env.COMMANDER_PATH;
// global.CDR_INSTALL_DIR = ( path.join( __dirname, '../' ) ).slice( 0, -1 );

global.AIRLINER_BASEPATH = process.env.AIRLINER_BASEPATH;
global.CDR_WORKSPACE = process.env.CDR_WORKSPACE;
global.AIRLINER_MSG_DEF_PATH = process.env.AIRLINER_MSG_DEF_PATH;
global.AIRLINER_PROTO_PATH = process.env.AIRLINER_PROTO_PATH;
global.COMMANDER_PATH = process.env.COMMANDER_PATH;
global.CDR_INSTALL_DIR = process.env.CDR_INSTALL_DIR;


console.log( FgMagenta );
console.log( ' ENVIRONMENT - ' );
console.log( '    AIRLINER_BASEPATH       : ', global.AIRLINER_BASEPATH );
console.log( '    CDR_WORKSPACE           : ', global.CDR_WORKSPACE );
console.log( '    CDR_INSTALL_DIR         : ', global.CDR_INSTALL_DIR );
console.log( '    AIRLINER_MSG_DEF_PATH   : ', global.AIRLINER_MSG_DEF_PATH );
console.log( '    AIRLINER_PROTO_PATH     : ', global.AIRLINER_PROTO_PATH );
console.log( '    COMMANDER_PATH          : ', global.COMMANDER_PATH );
console.log( Reset );


var junitReporter = new reporters.JUnitXmlReporter( {
  savePath: global.CDR_WORKSPACE + '/unit_test_reports/XML/',
  consolidateAll: false
} );

var myReporter = {

  jasmineStarted: function( suiteInfo ) {},
  suiteStarted: function( result ) {
    var border = ''
    for ( var i = 0; i < result.fullName.length + 10; ++i ) {
      border += '-'
    }
    console.log( border )
    console.log( '     ' + result.fullName + '     |' );
    console.log( border )
    console.log( '' );
    console.log( 'Results               Top Level Tests' );
    console.log( '-------               ---------------' );
  },
  specStarted: function( result ) {},
  specDone: function( result ) {
    var line = result.status.substr( 0, 1 ).toUpperCase() + result.status.substr( 1 );
    // console.log( "// DEBUG: ", line );
    if ( line === "Failed" ) {
      line = "+" + FgMagenta + line + Reset;
    } else if ( line === "Passed" ) {
      line = FgGreen + line + Reset
    }

    while ( line.length < 22 ) {
      line += " ";
    }
    console.log( line + result.description );
  },
  suiteDone: function( result ) {
    console.log( '' );
    var coloredStatus = ""
    if ( result.status === "passed" ) {
      coloredStatus = FgGreen + result.status + Reset
    } else {
      coloredStatus = FgMagenta + result.status + Reset
    }
    console.log( 'Group "' + result.description + '" has ' + coloredStatus );
    for ( var i = 0; i < result.failedExpectations.length; i++ ) {
      console.log( 'AfterAll ' + result.failedExpectations[ i ].message );
      console.log( result.failedExpectations[ i ].stack );
    }
    console.log( '' );
    console.log( '' );

    // werkt gewoon niet???? [rv]
    //if (result.status !== "passed") exit(1)
  },
  jasmineDone: function() {}
};

var jasmine = new Jasmine();

process.env.NODE_ENV = 'test'

jasmine.loadConfigFile( "spec/support/jasmine.json" );
jasmine.addReporter( junitReporter );
jasmine.addReporter( myReporter );
jasmine.execute();