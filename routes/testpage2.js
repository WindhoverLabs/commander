var express = require('express');
var router = express.Router();
var fs = require('fs')
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  /* TODO: needs clean up */
  //console.log('-->',req.baseUrl.substring(1), req.originalUrl.substring(1))
  var confObj = JSON.parse(fs.readFileSync(path.join(__dirname,  '../views/'+req.baseUrl.substring(1)+'.json'), 'utf8'));
  res.send(confObj);
});

module.exports = router;
