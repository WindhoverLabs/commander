var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  //console.log(req.baseUrl.substring(1), req.originalUrl.substring(1))
  res.render(req.baseUrl.substring(1), { title: 'Express' });
});

module.exports = router;
