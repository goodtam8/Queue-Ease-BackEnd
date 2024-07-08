var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// New student
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        var myobj = { sid: req.body.sid, mon:["","","","","","","","","","",""],tue:["","","","","","","","","","",""] 
            ,wed:["","","","","","","","","","",""] ,thur:["","","","","","","","","","",""] ,fri:["","","","","","","","","","",""] 
         };

        let timetable=await db.collection("timetable").insertOne(myobj);

        let result = await db.collection("student").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

/* Retrieve a single student */
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("student").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Student not found" });
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
      

        let result = await db.collection("student").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Student updated" });
        } else {
            res.status(404).json({ message: "Student not found" });
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

        let result = await db.collection("student").find(query).skip(skip).limit(perPage).toArray();
        let total = await db.collection("student").countDocuments(query);

        res.json({ student: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});


module.exports = router;
