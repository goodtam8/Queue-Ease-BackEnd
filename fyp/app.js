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
var coursesRouter = require('./routes/courses'); // around line 9
var teacherRouter = require('./routes/teachers'); // around line 9
var studentRouter = require('./routes/students'); // around line 9
var announcementRouter = require('./routes/announcement'); // around line 9
var assignRouter = require('./routes/assign'); // around line 9

var leaveRouter=require('./routes/leave');
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
app.use('/api/users', passport.authenticate('bearer', { session: false }), usersRouter);app.use('/api/course', coursesRouter); // around line 25
app.use('/api/teacher', teacherRouter); // around line 25
app.use('/api/student', studentRouter); // around line 25
app.use('/api/annou',announcementRouter);
app.use('/api/leave',leaveRouter);
app.use('/api/assign',assignRouter);
var fileUpload = require('express-fileupload');
app.use(fileUpload());


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
