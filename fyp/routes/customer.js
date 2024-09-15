
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



module.exports = router;
