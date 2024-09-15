var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');

// New staff
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
       
        let result = await db.collection("staff").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
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
        let result = await db.collection("staff").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);   
        } else {
            res.status(404).json({ message: "Staff not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// Update a single staff
router.put('/:id', async function (req, res) {
    delete req.body._id
    const db = await connectToDB();
    try {
        let result = await db.collection("staff").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Staff updated" });
        } else {
            res.status(404).json({ message: "Staff not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
//handle search and return all students
router.get('/', async function (req, res) {
    const db = await connectToDB();
    db.collection("staff").createIndex( { "$**" : 1 } )
    db.collection("staff").createIndex( { "$**" : -1 } )


    try {
        let query = {};
        // sort by sort_by query parameter
let sort = {'name':1};

        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 6;
        let skip = (page - 1) * perPage;
        let result = await db.collection("staff").find(query).sort(sort).skip(skip).limit(perPage).toArray();
        let total = await db.collection("staff").countDocuments(query);
        res.json({ staff: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});




//dropping a restaurant from a staff
router.patch('/:sid/:id/drop',async function(req,res){
    const db = await connectToDB();

    try{
       
        console.log(result)
        let courseUpdate = await db.collection("restaurant").updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $pull: { staff_list: sid },
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


/* Retrieve a single student and with his/her restaurant */
router.get('/:id/get', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("student").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            const course = await db.collection("restaurant").find({ staff_list: { $elemMatch: { $eq:result.sid } } }).toArray();
            res.json(course);



        } else {
            res.status(404).json({ message: "Student not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.patch('/:id/:staffid/staff', async function (req, res) {
    const db = await connectToDB();
   

    try {
        const query = { staff_list: { $elemMatch: { $eq: req.params.staffid } } };

        let conflict = await db.collection("restaurant").findOne(query);

        if(conflict) {//there is a conflict 
            res.status(400).json({ message: `The staff has already assigned with restaurant` });
        }
        
            let courseUpdate = await db.collection("restaurant").updateOne(
                { _id: new ObjectId(req.params.id) },
                {  $push: { staff_list: sid } }
            );
            if (courseUpdate.modifiedCount > 0) {
                res.status(200).json({ message: "Course successfully assigned", results: courseUpdate });
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
