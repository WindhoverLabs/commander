var Jasmine = require( 'jasmine' ),
  reporters = require( 'jasmine-reporters' );

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
    if ( line === "Failed" ) line = "+" + line;
    while ( line.length < 22 ) line += " ";
    console.log( line + result.description );
  },
  suiteDone: function( result ) {
    console.log( '' );
    console.log( 'Group "' + result.description + '" has ' + result.status );
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

jasmine.loadConfigFile( "spec/support/jasmine.json" );
jasmine.addReporter( junitReporter );
jasmine.addReporter( myReporter );
jasmine.execute();