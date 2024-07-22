var express = require('express');
var router = express.Router();
const stream = require('stream');
const { connectToDB, ObjectId } = require('../utils/db');
var passport = require('passport');




// New course
router.post('/', passport.authenticate('bearer', { session: false }), async function (req, res) {
    const db = await connectToDB();

    try {

        req.body.year = parseInt(req.body.year);
        req.body.semester = parseInt(req.body.semester);
        req.body.quota = parseInt(req.body.quota);
        for (let i = 1; i <= 13; i++) {

            var myobj = { cid: req.body.cid, week: i, student_attendance: [{ sid: 101, attend: false, attend_time: "13:00" }, { sid: 102, attend: false, attend_time: "14:00" }] };

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


/* Retrieve a single course */
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


// Update a single course
//remarks the time of the course should not be updated***
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        delete req.body._id


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

//cancel course if there is some sudden situation occur
router.patch('/:cid/:week', async function (req, res) {
    const db = await connectToDB();
    let lesson = parseInt(req.params.week)
    let query = { cid: req.params.cid, week: lesson };

    let attendance_update = await db.collection("attendance").updateOne(
        query,
        {
            $set: { status: "cancel" }
        }
    );
    if (attendance_update.modifiedCount > 0) {
        res.status(200).json({ message: "Attendance successfully cancelled", results: attendance_update });
    } else {
        res.status(404).json({ message: "Attendance not found" });
    }
})

//get all the course without pagination 
router.get('/cs/all', async function (req, res) {
    const db = await connectToDB();
    try {
        console.log("hi");
        let query = {};

        let result = await db.collection("course").find(query).toArray();

        res.json({ courses: result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});


//get all the course without pagination 
router.get('/cs/all/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        console.log("hi");
        let query = {};
        let staff_id=parseInt(req.params.id);
        let teacher = await db.collection("teacher").findOne({ _id: new ObjectId(req.params.id) });



        const result = await db.collection("course").find({ teacher: { $ne:teacher.staff_id} }).toArray();

        res.json({ courses: result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});


router.get('/', async function (req, res) {
    const db = await connectToDB();
    db.collection("course").createIndex( { "$**" : 1 } )
    db.collection("course").createIndex( { "$**" : -1 } )
    let sort = {'cid':1};

    try {
        let query = {};
        if (req.query.cid) {
            // query.email = req.query.email;
            query.cid = { $regex: req.query.cid };
        }
        

        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 6;
        let skip = (page - 1) * perPage;

        let result = await db.collection("course").find(query).sort(sort).skip(skip).limit(perPage).toArray();
        let total = await db.collection("course").countDocuments(query);

        res.json({ courses: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});


module.exports = router;
