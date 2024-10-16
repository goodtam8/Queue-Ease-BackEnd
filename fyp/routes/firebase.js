const admin = require('firebase-admin');
const serviceAccount = require('../fyp-5a65b-firebase-adminsdk-ajcir-9a7f302e30.json'); // Download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
