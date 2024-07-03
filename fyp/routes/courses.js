var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// routes



// New Booking
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        console.log(req.semester)
       
 
        let result = await db.collection("course").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
  });


  module.exports = router;
