var express = require('express');
var router = express.Router();
const stream=require('stream');
const { connectToDB, ObjectId } = require('../utils/db');

// New announcement
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
       

        let result = await db.collection("announcement").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

/* Retrieve a single leave */
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("announcement").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Announcement not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.get('/', async function (req, res) {
    const db = await connectToDB();
    try {
        let query = {};
     
        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 10;
        let skip = (page - 1) * perPage;

        let result = await db.collection("announcement").find(query).skip(skip).limit(perPage).toArray();
        let total = await db.collection("announcement").countDocuments(query);

        res.json({ bookings: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});
module.exports = router;
