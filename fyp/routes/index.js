var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');
const { generateToken } = require('../utils/auth');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' }); // This will save uploaded files to an 'uploads' directory

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/api/login', upload.single('file'),async function (req, res, next) {
  const db = await connectToDB();
  try {
    // check if the user exists
    var user = await db.collection("users").findOne({ email: req.body.email });
    if (!user) {
      res.status(401).json({ message: 'Admin not found' });
      return;
    }

// res.json(user);

delete user.password;

// generate a JWT token
const token = generateToken(user);

// return the token
res.json({ token: token });    
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    await db.client.close();
  }
});

router.post('/api/login/student', async function (req, res, next) {
  const db = await connectToDB();
  try {
    let id = parseInt(req.body.sid)
    // check if the user exists
    var user = await db.collection("student").findOne({ sid:id });
    if (!user) {
      res.status(401).json({ message: 'Admin not found' });
      return;
    }

// res.json(user);

delete user.password;

// generate a JWT token
const token = generateToken(user);

// return the token
res.json({ token: token });    
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    await db.client.close();
  }
});
router.post('/api/upload',  async function (req, res) {
  try {
    // Get the file
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(file);
    return res.json(file);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/api/login/teacher', async function (req, res, next) {
  const db = await connectToDB();
  try {
    let id = parseInt(req.body.sid)

    // check if the user exists
    var user = await db.collection("teacher").findOne({ staff_id: id});
    if (!user) {
      res.status(401).json({ message: 'Admin not found' });
      return;
    }

// res.json(user);

delete user.password;

// generate a JWT token
const token = generateToken(user);

// return the token
res.json({ token: token });    
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    await db.client.close();
  }
});

module.exports = router;

