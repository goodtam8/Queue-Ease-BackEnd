
var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
// New teacher
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        var myobj = { staff_id: req.body.staff_id, mon:["","","","","","","","","",""],tue:["","","","","","","","","",""] 
            ,wed:["","","","","","","","","",""] ,thur:["","","","","","","","","",""] ,fri:["","","","","","","","","",""] 
         };

        let timetable=await db.collection("timetable").insertOne(myobj);

        let result = await db.collection("teacher").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

/* Retrieve a single teacher */
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("teacher").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Teacher not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// Update a single Booking
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
       

        let result = await db.collection("teacher").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Teacher updated" });
        } else {
            res.status(404).json({ message: "Teacher not found" });
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
        let perPage = parseInt(req.query.perPage) || 6;
        let skip = (page - 1) * perPage;

        let result = await db.collection("teacher").find(query).skip(skip).limit(perPage).toArray();
        let total = await db.collection("teacher").countDocuments(query);

        res.json({ teacher: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});

module.exports = router;
