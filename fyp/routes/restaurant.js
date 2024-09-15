var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');
var passport = require('passport');




// New restaurant
router.post('/', passport.authenticate('bearer', { session: false }), async function (req, res) {
    const db = await connectToDB();
    req.body.outside = parseInt(req.body.outside) == 1;
    req.body.quota=2;

    try {

        
        req.body.numoftable = parseInt(req.body.numoftable);
        for (let i = 1; i <= parseInt(req.body.numoftable); i++) {

            var myobj = { table_num: i, status: "available", belong: req.body.name};

            let result2 = await db.collection("table").insertOne(myobj);
        }



        let result = await db.collection("restaurant").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

/* Retrieve a single restaurant by using its name to search */
router.get('/:name', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("restaurant").findOne({ name: req.params.name });
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ message: "Restaurant not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});


/* Retrieve a single restaurant */
router.get('/id/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ message: "restaurant not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});


// Update a single restaurant
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let res = await db.collection("restaurant").findOne({ _id: new ObjectId(req.body.id) });

        delete req.body._id
        req.body.outside = parseInt(req.body.outside) == 1;

        req.body.quota=res.quota;


        let result = await db.collection("restaurant").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Restaurant updated" });
        } else {
            res.status(404).json({ message: "Restaurant not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});



//get all the course without pagination 
router.get('/rest/all', async function (req, res) {
    const db = await connectToDB();
    try {
        console.log("hi");
        let query = {};

        let result = await db.collection("restaurant").find(query).toArray();

        res.json({ restaurants: result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});




router.get('/', async function (req, res) {
    const db = await connectToDB();
    db.collection("restaurant").createIndex( { "$**" : 1 } )
    db.collection("restaurant").createIndex( { "$**" : -1 } )
    let sort = {'name':1};

    try {
        let query = {};
        if (req.query.name) {
            // query.email = req.query.email;
            query.name = { $regex: req.query.name };
        }
        

        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 6;
        let skip = (page - 1) * perPage;

        let result = await db.collection("restaurant").find(query).sort(sort).skip(skip).limit(perPage).toArray();
        let total = await db.collection("restaurant").countDocuments(query);

        res.json({ rests: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});

router.delete('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result3 = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });

        let result = await db.collection("restaurant").deleteOne({ _id: new ObjectId(req.params.id) });

        let result2 = await db.collection("table").deleteMany({ belong: result3.name });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: "restaurant deleted" });
        } else {
            res.status(404).json({ message: "restaurant not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

module.exports = router;
