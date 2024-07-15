var express = require('express');
var router = express.Router();
const stream=require('stream');
const { connectToDB, ObjectId } = require('../utils/db');

// New leave
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
       

        let result = await db.collection("leave").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
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
        if (req.query.status) {
            // query.email = req.query.email;
            query.status = { $regex: req.query.status };
        }
        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 10;
        let skip = (page - 1) * perPage;

        let result = await db.collection("leave").find(query).skip(skip).limit(perPage).toArray();
        let total = await db.collection("leave").countDocuments(query);

        res.json({ bookings: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});

// Update a single leave and set it to pending 
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
       
        req.body.modifiedAt = new Date();

        let result = await db.collection("leave").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body,
            status:"Pending"
         });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Leave form  updated" });
        } else {
            res.status(404).json({ message: "Leave not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
//Setting the status of leave to reject or approved 
router.patch('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
       
        req.body.modifiedAt = new Date();

        let result = await db.collection("leave").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Leave form  updated" });
        } else {
            res.status(404).json({ message: "Leave not found" });
        }
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
        let result = await db.collection("leave").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Leave not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
module.exports = router;
