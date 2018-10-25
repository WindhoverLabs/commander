#!/usr/bin/node

var mergeJSON = require( 'merge-json' );
var fs = require( 'fs' );
var argv = require( 'minimist' )( process.argv.slice( 2 ) );

/* mergejs cli utility*/
/**
 * Show help text for cli
 */
var displayHelp = function() {
  console.log( 'mergejs -a <Input JSON file> -b <Input JSON file> -o <output file>' );
}

/**
 * validate option 'a' in cli
 * @param  {Object} argv cli argument variable
 */
if ( argv.hasOwnProperty( 'a' ) == false ) {
  console.log( 'Missing "-a"' );
  displayHelp();
  process.exit( -1 );
}

/**
 * validate option 'b' in cli
 * @param  {Object} argv cli argument variable
 */
if ( argv.hasOwnProperty( 'b' ) == false ) {
  console.log( 'Missing "-b"' );
  displayHelp();
  process.exit( -1 );
}

/**
 * validate option 'o' in cli
 * @param  {Object} argv cli argument variable
 */
if ( argv.hasOwnProperty( 'o' ) == false ) {
  console.log( 'Missing "-o"' );
  displayHelp();
  process.exit( -1 );
}

/* merge two input files */
console.log( 'Merging ' + argv.b + ' into ' + argv.a + '.' );
var inputA = JSON.parse( fs.readFileSync( argv.a, 'utf8' ) );
var inputB = JSON.parse( fs.readFileSync( argv.b, 'utf8' ) );

var output = mergeJSON.merge( inputA, inputB );

/* store output file in specified location */
fs.writeFile( argv.o, JSON.stringify( output, null, 4 ), 'utf8', function( err ) {
  if ( err ) throw err;
  console.log( 'complete' );
} );
console.log( 'Saving output as ' + argv.o + '.' );