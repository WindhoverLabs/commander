var Jasmine = require( 'jasmine' ),
  reporters = require( 'jasmine-reporters' ),
  Reset = "\x1b[0m",
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


var junitReporter = new reporters.JUnitXmlReporter( {
  savePath: __dirname + '/reports/XML/',
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