var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var jwt = require('jsonwebtoken');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;
passport.use(new BearerStrategy(
  function (token, done) {
    jwt.verify(token, process.env.TOKEN_SECRET, function (err, decoded) {
      if (err) { return done(err); }
      return done(null, decoded, { scope: "all" });
    });
  }
));
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var restaurantrouter = require('./routes/restaurant'); // around line 9
var staffrouter = require('./routes/staff'); // around line 9
var customerrouter = require('./routes/customer'); // around line 9
var foodrouter = require('./routes/food'); // around line 9
var tablerouter=require('./routes/table')

var app = express();
process.env.TOKEN_SECRET = 'secret';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/api/users', passport.authenticate('bearer', { session: false }), usersRouter);
app.use('/api/rest', restaurantrouter); // around line 25
app.use('/api/staff', staffrouter); // around line 25
app.use('/api/customer', customerrouter); // around line 25
app.use('/api/food', foodrouter); // around line 25
app.use('/api/table',tablerouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
