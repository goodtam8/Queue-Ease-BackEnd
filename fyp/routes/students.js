var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// New student
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        var myobj = { sid: req.body.sid, Monday:["","","","","","","","","","",""],Tuesday:["","","","","","","","","","",""] 
            ,Wednesday:["","","","","","","","","","",""] ,Thursday:["","","","","","","","","","",""] ,Friday:["","","","","","","","","","",""] 
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

// Update a single student
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
/* Retrieve a single student and with his/her time table */
router.get('/:id/timetable', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("student").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            let timetable = await db.collection("timetable").findOne({sid:result.sid})
            res.json(timetable);



        } else {
            res.status(404).json({ message: "Teacher not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.patch('/:sid/:cid/drop',async function(req,res){
    const db = await connectToDB();
    const course_time = ["0", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    try{
        var day;
        var stime;
        var etime;
        var mtime;
        let courseinfo = await db.collection("course").findOne({ cid: req.params.cid });//first get back the result 

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
        const quot=courseinfo.quota+1;

        let sid = parseInt(req.params.sid);
        var query = { [day + '.' + stime]: courseinfo.cid, sid: sid, [day + '.' + etime]: courseinfo.cid, [day + '.' + mtime]: courseinfo.cid };
        console.log(query)

        let result = await db.collection("timetable").updateOne(query, {
            $set: {
                [day + '.' + stime]: "",
                [day + '.' + mtime]: "",
                [day + '.' + etime]: ""
            }
        });
        console.log(result)
        let courseUpdate = await db.collection("course").updateOne(
            { _id: new ObjectId(courseinfo._id) },
            { 
                $pull: { student_attendance: sid },
                $set: { quota: quot }
            }
        );

        res.json({result:result,courseUpdate:courseUpdate})
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }



})

module.exports = router;
