var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
//update table status
//update table status with user check in 
//update table to be free 
//update table that it has been paid 
//get table 
//using name
/* Retrieve a single restaurant by using its name to search */
router.get('/:name', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("table").find({ belong: req.params.name }).toArray();
        if (result) {
            res.json({ table: result });
        } else {
            res.status(404).json({ message: "Table not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
// compare whether all table are busy or not to create a queue
router.get('/:name/status', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("table").find({ belong: req.params.name }).toArray();
        if (result) {
            let counter = await db.collection("table").countDocuments({ belong: req.params.name, status: "available" });
            if (counter === 0) {
                res.json({ status: true });

            } else {
                res.json({ status: false });

            }



        } else {
            res.status(404).json({ message: "Table not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});


// Update a single table status
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {


        let result = await db.collection("table").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Table updated" });
        } else {
            res.status(404).json({ message: "Table not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});




module.exports = router;
