var express = require('express');
var router = express.Router();
const stream = require('stream');
const { connectToDB, ObjectId } = require('../utils/db');
var passport = require('passport');

//assign course to teacher
router.patch('/:id/:staffid/teacher', async function (req, res) {
    const db = await connectToDB();
    const course_time = ["0", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    try {
        var day;
        var stime;
        var etime;
        var mtime;
        let courseinfo = await db.collection("course").findOne({ _id: new ObjectId(req.params.id) });//first get back the result 

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
        let timetable = await db.collection("timetable").find(query).toArray();

        if (timetable.length > 0) {// if the timetable is not conflict 
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
                res.status(200).json({ message: "Course successfully assigned", results: courseUpdate });
            } else {
                res.status(404).json({ message: "Course not found" });
            }

        } else {//there is a conflict with two course failure to add the course 
            let conflict = await db.collection("timetable").findOne({ staff_id: sid });
            res.status(400).json({ message: `The teacher has conflict with other course` });
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
//* getting the attendance of a specific class  course 
router.get('/:id/attendance', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("course").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            let attendance = await db.collection("attendance").find({ cid: result.cid }).toArray()
            res.json({ attendance: attendance });

        } else {
            res.status(404).json({ message: "Course not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});


// need to update student' time table and check whether there is conflict
//remarks!! a user
//*assign course to students/
router.patch('/:id/:sid/student', async function (req, res) {
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

        let sid = parseInt(req.params.sid);
        var query = { [day + '.' + stime]: "", sid: sid, [day + '.' + etime]: "", [day + '.' + mtime]: "" };
        console.log(query)
        let timetable = await db.collection("timetable").find(query).toArray();

        if (timetable.length > 0 && courseinfo.quota > 0) {
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
                {
                    $pull: { student_attendance: sid },
                    $set: { quota: courseinfo.quota - 1 }
                }
            );
            if (courseUpdate.modifiedCount > 0) {
                res.status(200).json({ message: "Course successfully assigned", results: courseUpdate });
            } else {
                res.status(404).json({ message: "Course not found" });
            }

        } else if (timetable.length === 0) {//make a new case for differeniate different case which is mean new if case 
            console.log("No result found");
            let conflict = await db.collection("timetable").findOne({ sid: sid });
            res.status(400).json({ message: `The Student has conflict with other course` });
        }
        else {
            res.status(400).json({ message: `The quota is full now` });
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// Delete a single course
//also have to update student/teacher time tabe ***remark***
router.delete('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        const db = await connectToDB();
        const course_time = ["0", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

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
        etime = course_time.indexOf(courseinfo.end_time)
        var query = { [day + '.' + stime]: courseinfo.cid, [day + '.' + etime]: courseinfo.cid, [day + '.' + mtime]: courseinfo.cid };
        let updatetime = await db.collection("timetable").updateMany(query, {
            $set: {
                [day + '.' + stime]: "",
                [day + '.' + mtime]: "",
                [day + '.' + etime]: ""
            }
        });
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
module.exports = router;
