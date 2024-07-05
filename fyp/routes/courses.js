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
        for (let i = 1; i <= 13; i++) {

            var myobj = { cid: req.body.cid, week: i,student_attendance:[{sid:101,attend:false,attend_time:"13:00"},{sid:102,attend:false,attend_time:"14:00"}] };

            let result2 = await db.collection("attendance").insertOne(myobj);
        }



        let result = await db.collection("course").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// Delete a single course
router.delete('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result3 = await db.collection("course").findOne({ _id: new ObjectId(req.params.id) });

        let result2 = await db.collection("attendance").deleteMany({ cid: result3.cid});
        let result = await db.collection("course").deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: "Course deleted" });
        } else {
            res.status(404).json({ message: "Course not found" });
        }
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
            res.status(404).json({ message: "Course not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});


/* Retrieve a single Booking */
router.get('/id/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("course").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ message: "Course not found" });
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
        if (req.query.cid) {
            query.cid = { $regex: req.query.cid };
        }


        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 6;
        let skip = (page - 1) * perPage;

        let result = await db.collection("course").find(query).skip(skip).limit(perPage).toArray();
        let total = await db.collection("course").countDocuments(query);

        res.json({ courses: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});

// Update a single Booking
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        req.body.year = parseInt(req.body.year);
        req.body.semester = parseInt(req.body.semester);
        req.body.quota = parseInt(req.body.quota);

        let result = await db.collection("course").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Course updated" });
        } else {
            res.status(404).json({ message: "Course not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

module.exports = router;
