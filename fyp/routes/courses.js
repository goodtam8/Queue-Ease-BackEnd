var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// routes



// New Booking
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {

        req.body.year = parseInt(req.body.year);
        req.body.semester = parseInt(req.body.semester);
        req.body.quota = parseInt(req.body.quota);



 
        let result = await db.collection("course").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
  });



  /* Retrieve a single course by using cid to search */
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("course").findOne({ cid: req.params.id });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Booking not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

  module.exports = router;
