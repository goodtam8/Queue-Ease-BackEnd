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


// need to update teacher' time table and check whether there is conflict
//remarks!! a user
router.patch('/:id/:staffid/teacher', async function (req, res) {
    const db = await connectToDB();
    const course_time = ["0", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    try {
        var day;
        var stime;
        var etime;
        var mtime;
        let courseinfo = await db.collection("course").findOne({ _id: new ObjectId(req.params.id) });
        
        const date = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        for (let i = 0; i < date.length; i++) {
            if (date[i] === courseinfo.week_day) {
                day = date[i];
                break;
            }
        }
        
        stime = course_time.indexOf(courseinfo.start_time);
        mtime = stime + 1;
        etime = course_time.indexOf(courseinfo.end_time);
        
        const cid = courseinfo.cid;

        let sid = parseInt(req.params.staffid);
        var query = { [day + '.' + stime]: "", staff_id: sid, [day + '.' + etime]: "", [day + '.' + mtime]: "" };
        console.log(query);
        console.log(stime);
        console.log(mtime);
        console.log(etime);

        let timetable = await db.collection("timetable").find(query).toArray();
        
        if (timetable.length > 0) {
            console.log("Result found");

            let result = await db.collection("timetable").updateOne(query, {
                $set: {
                    [day + '.' + stime]: cid,
                    [day + '.' + mtime]: cid,
                    [day + '.' + etime]: cid
                }
            });

            let courseUpdate = await db.collection("course").updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { teacher: sid } }
            );
            if (courseUpdate.modifiedCount > 0) {
                res.status(200).json({ message: "Course successfully assigned",results:courseUpdate });
            } else {
                res.status(404).json({ message: "Course not found" });
            }
            
        } else {
            console.log("No result found");
            let conflict = await db.collection("timetable").findOne({ staff_id: sid });
            res.status(400).json({ message: `The teacher has conflict with other course` });
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// need to update student' time table and check whether there is conflict
//remarks!! a user
router.patch('/:id/student', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("course").updateOne({ _id: new ObjectId(req.params.id) },
            {
                $push: { student_attendance: {} }
            });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Course updated" });
        } else {
            res.status(404).json({ message: "Course not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});



// Delete a single course
//also have to update student/teacher time tabe ***remark***
router.delete('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result3 = await db.collection("course").findOne({ _id: new ObjectId(req.params.id) });

        let result2 = await db.collection("attendance").deleteMany({ cid: result3.cid });// the assign course need this field
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

router.get('/all', async function (req, res) {
    const db = await connectToDB();
    try {


        let result = await db.collection("course")

        res.json({ courses: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
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

// Update a single course
//remarks the time of the course should not be updated***
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
