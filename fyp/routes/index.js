var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');
const { generateToken } = require('../utils/auth');
const multer = require('multer');
const admin = require('./firebase'); // Import the initialized Firebase Admin SDK
require('dotenv').config();
const upload = multer({ dest: 'uploads/' }); // This will save uploaded files to an 'uploads' directory

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/api/login', upload.single('file'), async function (req, res, next) {
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
router.get('/rest', async function (req, res) {
  const db = await connectToDB();
  try {
      console.log("hi");
      let query = {};

      let result = await db.collection("restaurant").find(query).toArray();

      res.json({ restaurants: result });
  } catch (err) {
      res.status(400).json({ message: err.message });
  }
  finally {
      await db.client.close();
  }
});


router.post('/api/login/user', async function (req, res, next) {
  const db = await connectToDB();
  try {
    let id = parseInt(req.body.sid)
    // check if the user exists
    var user = await db.collection("customer").findOne({ uid: id });
    if (!user) {
      res.status(401).json({ message: 'Customer not found' });
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
router.post('/api/upload', async function (req, res) {
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

router.post('/api/login/staff', async function (req, res, next) {
  const db = await connectToDB();
  try {
    let id = parseInt(req.body.sid)

    // check if the user exists
    var user = await db.collection("staff").findOne({ sid: id });
    if (!user) {
      res.status(401).json({ message: 'Staff not found' });
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
// Google Geocoding API endpoint
const axios = require('axios'); // Add this at the top

router.post('/geocode', async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).send({ error: 'Address is required' });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === 'OK') {
      const result = data.results[0];
      const location = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address,
      };
      res.send(location);
    } else {
      res.status(404).send({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Error fetching data from Google Geocoding API:', error);
    res.status(500).send({ error: 'An error occurred while fetching data' });
  }
});

router.post('/send', async (req, res) => {
  const { token, title, body } = req.body; // Get FCM token and message details from request

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token, // The FCM token of the recipient
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    res.status(200).send('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).send('Error sending notification');
  }
});

module.exports = router;

