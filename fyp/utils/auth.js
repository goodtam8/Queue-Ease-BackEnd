const jwt = require('jsonwebtoken');


// generate a token
const generateToken = function (user) {
    return jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: 86400 // expires in 24 hours
    });
}

const isRay = function (req, res, next) {

  // extra checking
  if (req.user.email != "admin@gmail.com" || req.authInfo.scope != "all") {
      res.status(401).send('Unauthorized: Invalid role');
  }

  next();
}Ï

module.exports = { generateToken, isRay };

module.exports = { generateToken };