var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// New receipt record
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        req.body.createdAt = new Date();

        let result = await db.collection("receipt").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

/* Retrieve a single staff */
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("receipt").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "receipt not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

//get all receipt by using the dining record id 

module.exports = router;