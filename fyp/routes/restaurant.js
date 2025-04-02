var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');
var passport = require('passport');
const admin = require('../routes/firebase');


const axios = require('axios'); // Add this at the top


// New restaurant
router.post('/', passport.authenticate('bearer', { session: false }), async function (req, res) {
    const db = await connectToDB();
    req.body.outside = parseInt(req.body.outside) == 1;

    try {


        req.body.numoftable = parseInt(req.body.numoftable);
        for (let i = 1; i <= parseInt(req.body.numoftable); i++) {

            var myobj = { table_num: i, status: "available", belong: req.body.name };

            let result2 = await db.collection("table").insertOne(myobj);
        }
        var historicaldata = {
            belong: req.body.name, '1-2 people': 50,
            '3-4 people': 70,
            '5-6 people': 90,
            '7+ people': 100,
        }
        let history = await db.collection("dining").insertOne(historicaldata);
        const address = req.body.location;

        if (!address) {
            return res.status(400).send({ error: 'Address is required' });
        }

        const apiKey = "AIzaSyC6obl69gbCEXgEwtskMIq66R337AOMKCY";
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;


        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK') {
            const final = data.results[0];

            req.body.lat = final.geometry.location.lat;
            req.body.lng = final.geometry.location.lng;
            req.body.location = final.formatted_address;


        } else {
            res.status(404).send({ error: 'Location not found' });
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

/* Retrieve a single restaurant */
router.get('/id/:id/food', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            // Use the $in operator to find food items whose names are in the result.menu array
            let food = await db.collection("food").find({ name: { $in: result.menu } }).toArray();
            res.json({ food: food });
        } else {
            res.status(404).json({ message: "Restaurant not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.post('/send', async function (req, res) {//later add more logic here 
    // Log the incoming request
    console.log('Received request:', req.body);

    // Check for registration token
    const registrationToken = req.body.registrationtoken;
    if (!registrationToken) {
        return res.status(400).send('Registration token is required');
    }

    const messagesend = {
        token: registrationToken,
        notification: {
            title: req.body.title,
            body: req.body.body
        },
        data: {
            key1: "value1",
            key2: "value2"
        },
        android: {
            priority: "high"
        },
        apns: {
            payload: {
                aps: {
                    badge: 42
                }
            }
        }
    };

    try {
        const response = await admin.messaging().send(messagesend);
        console.log('Successfully sent message:', response);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Error sending notification');
    }
});

// Update a single restaurant
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let resu = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });
        console.log(req.body.location)
        const address = req.body.location;

        if (!address) {
            return res.status(400).send({ error: 'Address is required' });
        }

        const apiKey = "AIzaSyC6obl69gbCEXgEwtskMIq66R337AOMKCY";
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;


        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK') {
            const final = data.results[0];

            req.body.lat = final.geometry.location.lat;
            req.body.lng = final.geometry.location.lng;
            req.body.location = final.formatted_address;


        } else {
            res.status(404).send({ error: 'Location not found' });
        }

        delete req.body._id
        req.body.outside = parseInt(req.body.outside) == 1;
        // number of table should be disable to update for now 
        req.body.numoftable = resu.numoftable;


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




router.get('/', async function (req, res) {
    const db = await connectToDB();
    db.collection("restaurant").createIndex({ "$**": 1 })
    db.collection("restaurant").createIndex({ "$**": -1 })
    let sort = { 'name': 1 };

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
    let db;
    try {


        db = await connectToDB();

        // Find the restaurant
        const restaurant = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        // Delete related tables
        await db.collection("table").deleteMany({ belong: restaurant.name });

        // Delete the restaurant
        const deleteResult = await db.collection("restaurant").deleteOne({ _id: new ObjectId(req.params.id) });

        if (deleteResult.deletedCount > 0) {
            res.status(200).json({ message: "Restaurant deleted" });
        } else {
            res.status(404).json({ message: "Restaurant not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        if (db) {
            await db.client.close();
        }
    }
});

module.exports = router;
