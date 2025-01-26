var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// Update a single record
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
       
        req.body.modifiedAt = new Date();

        let result = await db.collection("dinerecord").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "record updated" });
        } else {
            res.status(404).json({ message: "record not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
// New receipt record

router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        req.body.createdAt = new Date();

        let result = await db.collection("dinerecord").insertOne(req.body);
        res.status(201).json(result.insertedId);
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
/* Retrieve a single record */
//name:
//id
//date
//by which customer
//status
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("dinerecord").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "dining record not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
// Delete a single Booking
router.delete('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("dinerecord").deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: "Record deleted" });
        } else {
            res.status(404).json({ message: "Record not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

module.exports = router;