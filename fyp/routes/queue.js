var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
//new queue
router.post('/', async function (req, res) {
    const db = await connectToDB();
    try {
        // Create a queue object based on the provided request body
        const queueData = {
            restaurantName: req.body.restaurant, // Get the restaurant name from the request body
            currentPosition: 0, // Initialize current position to 0
            queueArray: [] // Initialize an empty array for the queue
        };

        // Insert the queue object into the "queue" collection
        let result = await db.collection("queue").insertOne(queueData);

        // Respond with the inserted ID of the new queue
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

router.get('/:name', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("queue").findOne({ restaurantName: req.params.name });
        if (result) {

            res.json({ queue: result });
        } else {
            res.status(404).json({ message: "Queue not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
router.put('/:id', async function (req, res) {
    const db = await connectToDB();
    try {
        const queueId = req.params.id; // Get the queue ID from the URL parameters
        const newPosition = req.body.currentPosition; // Get the new position from the request body
        let queuenum = await db.collection("queue").findOne({ _id: new ObjectId(req.params.id) });
        if (queuenum.queueArray.length <= newPosition) {
            return res.status(400).json({ message: "You have update the queue number exceed the limit" });

        }


        // Update the queue's current position
        const result = await db.collection("queue").updateOne(
            { _id: new ObjectId(queueId) }, // Filter by queue ID
            { $set: { currentPosition: newPosition } } // Update the current position
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Queue not found or position unchanged" });
        }

        res.status(200).json({ message: "Queue position updated successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
router.delete('/:id', async function (req, res) {
    const db = await connectToDB();
    try {

        let result = await db.collection("queue").deleteOne({ _id: new ObjectId(req.params.id) });


        if (result.deletedCount > 0) {
            res.status(200).json({ message: "Queue deleted" });
        } else {
            res.status(404).json({ message: "Queue not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
router.put('/:id/add', async function (req, res) {
    const db = await connectToDB();
    try {
        const queueId = req.params.id; // Get the queue ID from the URL parameters
        const { customerId, numberOfPeople } = req.body; // Get customer details from the request body

        // Validate the request body
        if (!customerId || typeof numberOfPeople !== 'number' || numberOfPeople <= 0) {
            return res.status(400).json({ message: "Invalid customer data" });
        }

        // Get the current queue
        const queue = await db.collection("queue").findOne({ _id: new ObjectId(queueId) });
        if (!queue) {
            return res.status(404).json({ message: "Queue not found" });
        }

        // Determine the next queue number
        const queueNumber = queue.queueArray.length + 1; // Queue number is the length of the array + 1

        // Create a new customer object
        const newCustomer = {
            customerId,
            numberOfPeople,
            queueNumber,
        };

        // Update the queue by adding the new customer to the queueArray
        await db.collection("queue").updateOne(
            { _id: new ObjectId(queueId) },
            { $push: { queueArray: newCustomer } } // Push the new customer into the queueArray
        );

        res.status(200).json({ message: "Customer added to the queue successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
router.get('/check/:name', async function (req, res) {
    const db = await connectToDB();
    try {
        const name = req.params.name; // Get the restaurant ID from the URL parameters

        // Query the database to check for any queue created by the restaurant
        const queueExists = await db.collection("queue").findOne({ restaurantName: name });

        if (queueExists) {
            return res.status(200).json({ exists: true }); // Return true if a queue exists
        } else {
            return res.status(200).json({ exists: false }); // Return false if no queue exists
        }
    } catch (err) {
        res.status(500).json({ message: err.message }); // Handle any errors
    } finally {
        await db.client.close();
    }
});



module.exports = router;
