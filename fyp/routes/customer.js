
var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
// New customer
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
       

        let result = await db.collection("customer").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.put('/:id', async function (req, res) {
    delete req.body._id
    const db = await connectToDB();
    try {
        let result = await db.collection("customer").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Customer updated" });
        } else {
            res.status(404).json({ message: "Customer not found" });
        }
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
        let result = await db.collection("customer").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Customer not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});


module.exports = router;
