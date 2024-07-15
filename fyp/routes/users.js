var express = require('express');
var router = express.Router();
const { generateToken, isRay } = require('../utils/auth');
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
