
var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
// New food
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        req.body.price=parseInt(req.body.price)

        let result = await db.collection("food").insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

/* Retrieve a single food */
router.get('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("food").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ message: "Food not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
/* Retrieve a single food and with his/her restaurant */
router.get('/:id/get', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("food").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            const course = await db.collection("restaurant").find({ menu: { $elemMatch: { $eq:result.name.toString() } } }).toArray();
            res.json(course);



        } else {
            res.status(404).json({ message: "Food not found" });
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
    delete req.body._id

    try {


        let result = await db.collection("food").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Food updated" });
        } else {
            res.status(407).json({ message: "Food not updated" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.get('/', async function (req, res) {
    const db = await connectToDB();
   await db.collection("food").createIndex( { "$**" : 1 } )
    await db.collection("food").createIndex( { "$**" : -1 } )
    try {
        let query = {};
        let sort = {'name':1};

        let page = parseInt(req.query.page) || 1;
        let perPage = parseInt(req.query.perPage) || 6;
        let skip = (page - 1) * perPage;

        let result = await db.collection("food").find(query).sort(sort).skip(skip).limit(perPage).toArray();
        let total = await db.collection("food").countDocuments(query);

        res.json({ food: result, total: total, page: page, perPage: perPage });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    finally {
        await db.client.close();
    }
});


//dropping a restaurant from a staff
router.patch('/:name/:id/drop', async function(req, res) {
    const db = await connectToDB();

    try {
        // First, find the restaurant to get the current quota
        const restaurant = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });
        
        // Check if the restaurant was found
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found." });
        }

        // Use the found restaurant's quota
        let courseUpdate = await db.collection("restaurant").updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $pull: { menu: req.params.name },
                $set: { quota: restaurant.quota + 1 } // Use the quota from the restaurant
            }
        );

        res.json({ courseUpdate: courseUpdate });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.patch('/:id/:name/', async function (req, res) {
    const db = await connectToDB();

    try {
        let result = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });

        if (!result) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        let courseUpdate = await db.collection("restaurant").updateOne(
            { _id: new ObjectId(req.params.id) }, // Filter
            { 
                $push: { menu: req.params.name }, // Update operations
                $set: { quota: result.quota - 1 }
            }
        );

        if (courseUpdate.modifiedCount > 0) {
            res.status(200).json({ message: "Food successfully assigned", results: courseUpdate });
        } else {
            res.status(404).json({ message: "Food not found" });
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});



module.exports = router;
