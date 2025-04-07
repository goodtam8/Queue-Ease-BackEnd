var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');
var passport = require('passport');
const admin = require('../routes/firebase');


const axios = require('axios'); // Add this at the top


router.post('/',
    passport.authenticate('bearer', { session: false }),
    async (req, res) => {
        let db;
        try {
            // Validate required fields
            const requiredFields = ['name', 'location', 'numoftable', 'outside'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: `Missing required fields: ${missingFields.join(', ')}`
                });
            }

            db = await connectToDB();

            // Process boolean field
            req.body.outside = parseInt(req.body.outside) === 1;

            // Validate and parse table count
            const numOfTables = parseInt(req.body.numoftable);
            if (isNaN(numOfTables) || numOfTables < 1 || numOfTables > 50) {
                return res.status(400).json({ error: 'Invalid table count (1-50)' });
            }

            // Create tables in bulk
            const tables = Array.from({ length: numOfTables }, (_, i) => ({
                table_num: i + 1,
                status: "available",
                belong: req.body.name
            }));

            await db.collection("table").insertMany(tables);

            // Create historical data
            const historicalData = {
                belong: req.body.name,
                ...Object.fromEntries(['1-2', '3-4', '5-6', '7+'].map((size, i) => [
                    `${size} people`,
                    50 + (i * 20) // Example dynamic pricing
                ]))
            };

            await db.collection("dining").insertOne(historicalData);

            // Geocoding
            const apiKey = "AIzaSyC6obl69gbCEXgEwtskMIq66R337AOMKCY";
            if (!apiKey) {
                return res.status(500).json({ error: 'Server configuration error' });
            }

            const geocodeResponse = await axios.get(
                'https://maps.googleapis.com/maps/api/geocode/json',
                {
                    params: {
                        address: req.body.location,
                        key: apiKey
                    }
                }
            );

            const { data } = geocodeResponse;
            if (data.status !== 'OK' || !data.results[0]) {
                return res.status(400).json({
                    error: 'Location not found or invalid address'
                });
            }

            const locationData = data.results[0];
            req.body.lat = locationData.geometry.location.lat;
            req.body.lng = locationData.geometry.location.lng;
            req.body.location = locationData.formatted_address;

            // Insert restaurant data
            const result = await db.collection("restaurant").insertOne(req.body);

            res.status(201).json({
                success: true,
                id: result.insertedId,
                name: req.body.name,
                location: req.body.location
            });

        } catch (err) {
            console.error('Creation error:', err);
            const statusCode = err.response?.status || 500;
            const message = err.response?.data?.error || 'Internal server error';
            res.status(statusCode).json({ error: message });
        } finally {
            if (db?.client) await db.client.close();
        }
    }
);

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
/* Retrieve a single restaurant */
router.get('/id/:id/joinqrfood', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("restaurant").findOne({ name: req.params.id });
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

router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        let resu = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.id) });
        if (!resu) {
            return res.status(404).json({ message: "Restaurant not found" }); // Early exit if restaurant doesn't exist
        }

        const address = req.body.location;
        if (!address) {
            return res.status(400).send({ error: 'Address is required' });
        }

        const apiKey = "AIzaSyC6obl69gbCEXgEwtskMIq66R337AOMKCY";
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK') {
            const result = data.results[0]; // Access first result
            req.body.lat = result.geometry.location.lat;
            req.body.lng = result.geometry.location.lng;
            req.body.location = result.formatted_address;
        } else {
            return res.status(404).send({ error: 'Location not found' }); // Added return
        }

        delete req.body._id;
        req.body.outside = parseInt(req.body.outside) == 1;
        req.body.numoftable = resu.numoftable;

        let result = await db.collection("restaurant").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );

        res.status(200).json({ message: "Restaurant updated" }); // Single success response
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
