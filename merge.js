#!/usr/bin/node

var mergeJSON = require('merge-json');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

var displayHelp = function () {
    console.log('mergejs -a <Input JSON file> -b <Input JSON file> -o <output file>');
}

if(argv.hasOwnProperty('a') == false) {
    console.log('Missing "-a"');
    displayHelp();
    process.exit(-1);
}

if(argv.hasOwnProperty('b') == false) {
    console.log('Missing "-b"');
    displayHelp();
    process.exit(-1);
}

if(argv.hasOwnProperty('o') == false) {
    console.log('Missing "-o"');
    displayHelp();
    process.exit(-1);
}

var inputA = JSON.parse(fs.readFileSync(argv.a, 'utf8'));
var inputB = JSON.parse(fs.readFileSync(argv.b, 'utf8'));

var output = mergeJSON.merge(inputA, inputB);

fs.writeFile(argv.o, JSON.stringify(output, null, 2), 'utf8', function(err) {
    if (err) throw err;
    console.log('complete');
});