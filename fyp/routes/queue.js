var express = require('express');
var router = express.Router();
const admin = require('./firebase'); // Import the initialized Firebase Admin SDK

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
// Check if the customer exists in the queue
router.get('/:name/check/:customerId', async function (req, res) {
    const db = await connectToDB();
    try {
        const name = req.params.name; // Get the restaurant name from the URL parameters
        const customerId = req.params.customerId.toString(); // Get the customer ID from the URL parameters

        // Get the current queue for the restaurant
        const queue = await db.collection("queue").findOne({ restaurantName: name });
        if (!queue) {
            return res.status(404).json({ message: "Queue not found" });
        }

        // Check if the customer exists in the queue
        const customerExists = queue.queueArray.some(customer => customer.customerId === customerId);
        if (customerExists) {
            return res.status(200).json({ message: "Customer is already in the queue", exists: true });
        } else {
            return res.status(200).json({ message: "Customer does not exist in the queue", exists: false });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

//get a singlequeue using restaurant name 
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
})



// get back the customer take queue in the restuarant 
router.get('/:id/verify', async function (req, res) {
    const db = await connectToDB();
    try {
        const customerId = req.params.id;

        // Query the database to check if the customerId exists in the queueArray
        const queueExists = await db.collection("queue").find({
            "queueArray": {
                $elemMatch: { customerId: customerId }
            }
        }).toArray();
        console.log(queueExists)


        if (queueExists.length > 0) {
            return res.status(200).json({ exists: queueExists }); // Return true if a queue exists
        } else {
            return res.status(404).json({ exists: "Not found" }); // Return false if no queue exists
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// get back the customer take queue in the restuarant 
router.get('/:id/search/:restid/pay', async function (req, res) {
    const db = await connectToDB();
    //error:input must be a 24 character hex string, 12 byte Uint8Array, or an integer
    try {
        console.log(req.params.name)
        const customerId = req.params.id;
        let result3 = await db.collection("restaurant").findOne({ _id: new ObjectId(req.params.restid) });
        // Query the database to check if the customerId exists in the queueArray
        const queueExists = await db.collection("queue").findOne({
            "restaurantName": result3.name,
            "queueArray": {
                $elemMatch: { customerId: customerId }
            }
        });

        if (queueExists) {
            const foundTableByName = queueExists.queueArray.find(customer => customer.customerId === customerId);

            return res.status(200).json(foundTableByName.rid); // Return true if a queue exists
        } else {
            return res.status(404).json({ exists: "Not found" }); // Return false if no queue exists
        }
    } catch (err) {
        console.log(err.message);
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});

// get back the customer take queue in the restuarant 
router.get('/:id/search/:name', async function (req, res) {
    const db = await connectToDB();
    //error:input must be a 24 character hex string, 12 byte Uint8Array, or an integer
    try {
        console.log(req.params.name)
        const customerId = req.params.id;
        let result3 = await db.collection("restaurant").findOne({ name: req.params.name });
        // Query the database to check if the customerId exists in the queueArray
        const queueExists = await db.collection("queue").findOne({
            "restaurantName": result3.name,
            "queueArray": {
                $elemMatch: { customerId: customerId }
            }
        });

        if (queueExists) {
            const foundTableByName = queueExists.queueArray.find(customer => customer.customerId === customerId);

            return res.status(200).json(foundTableByName.rid); // Return true if a queue exists
        } else {
            return res.status(404).json({ exists: "Not found" }); // Return false if no queue exists
        }
    } catch (err) {
        console.log(err.message);
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
//template for checked in and out 
// router.get('/:id/:name/checkout', async function (req, res) {
//     const db = await connectToDB();

//     const queuerecord = await db.collection("queue").findOne({ restaurantName: req.params.name })
//     const result = queuerecord.queueArray.filter(table => table.customerId === req.params.id)
//     let result2 = await db.collection("dinerecord").updateOne({ _id: new ObjectId(result[0].rid) }, { $set:{ "status": "checked" }});

//     console.log(result[0].rid);

// })

// update the user check in 
router.patch('/:id/:name/checkin', async function (req, res) {
    const db = await connectToDB();
    // later can make it complex to handle different condition
    try {
        const customerId = req.params.id;
        const restaurantName = req.params.name;

        // First check if there are any available tables
        const availableTable = await db.collection("table").findOne({
            status: "available",
            belong: restaurantName
        });

        // If no tables are available, return 405 Method Not Allowed
        if (!availableTable) {
            return res.status(405).json({ message: "No tables available for check-in" });
        }

        // Proceed with check-in process if tables are available
        const queuerecord = await db.collection("queue").findOne({ restaurantName: restaurantName });
        const queueExists = await db.collection("queue").updateOne(
            {
                "queueArray": {
                    $elemMatch: { customerId: customerId }
                },
                restaurantName: restaurantName
            },
            {
                $set: { "queueArray.$.checkInTime": new Date() }
            }
        );

        const result = queuerecord.queueArray.filter(table => table.customerId === customerId);
        const table = await db.collection("table").updateOne(
            { status: "available", belong: restaurantName },
            { $set: { "status": "in used", "rid": result[0].rid } }
        );
        console.log(table);

        //update record status
        let result2 = await db.collection("dinerecord").updateOne(
            { _id: new ObjectId(result[0].rid) },
            { $set: { "status": "checked" } }
        );
        //assign table to them 

        if (queueExists.modifiedCount > 0 || table.modifiedCount > 0) {
            res.status(200).json({ message: "Customer checked in successfully" });
        } else {
            res.status(404).json({ message: "Customer not found in queue" });
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
        const queueId = req.params.id;
        const newPosition = req.body.currentPosition;
        
        // Initial validation
        let queueData = await db.collection("queue").findOne({ _id: new ObjectId(req.params.id) });
        if (!queueData || queueData.queueArray.length < newPosition) {
            return res.status(407).json({ message: "You have updated the queue number exceeding the limit" });
        }

        // Update the queue's current position
        const result = await db.collection("queue").updateOne(
            { _id: new ObjectId(queueId) },
            { $set: { currentPosition: newPosition } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Queue not found or position unchanged" });
        }
        
        // Re-fetch the queue to get the most up-to-date data
        const updatedQueue = await db.collection("queue").findOne({ _id: new ObjectId(queueId) });
        
        // Safety check if queue structure has changed
        if (newPosition > updatedQueue.queueArray.length) {
            return res.status(400).json({ message: "Queue position is no longer valid" });
        }
        
        // Notify current customer
        if (newPosition > 0 && newPosition <= updatedQueue.queueArray.length) {
            const currentCustomerId = updatedQueue.queueArray[newPosition - 1].customerId;
            const currentCustomer = await db.collection("customer").findOne({ _id: new ObjectId(currentCustomerId) });
            
            if (currentCustomer && currentCustomer.fcm) {
                const messagesend = {
                    token: currentCustomer.fcm,
                    notification: {
                        title: `Queue message from ${updatedQueue.restaurantName}`,
                        body: "It is your turn now. Please come to us for check in "
                    },
                    data: { key1: "value1", key2: "value2" },
                    android: { priority: "high" },
                    apns: { payload: { aps: { badge: 42 } } }
                };
                
                await admin.messaging().send(messagesend);
            }
            
            // Notify upcoming customers
            const remainingLength = updatedQueue.queueArray.length - newPosition;
            
            if (remainingLength > 0) {
                // Determine how many customers to notify (1, 2, or 3)
                const notifyCount = Math.min(remainingLength, 3);
                let notificationBody = "";
                
                switch (notifyCount) {
                    case 1: notificationBody = "Next table is you. Please come to us for check in"; break;
                    case 2: notificationBody = "Next two tables is you. Please come to us for check in"; break;
                    case 3: notificationBody = "Next three tables is you. Please come to us for check in"; break;
                }
                
                // Notify the upcoming customers
                for (let i = 0; i < notifyCount; i++) {
                    const upcomingIndex = newPosition + i;
                    
                    // Verify index is valid before accessing
                    if (upcomingIndex < updatedQueue.queueArray.length) {
                        const upcomingCustomerId = updatedQueue.queueArray[upcomingIndex].customerId;
                        const upcomingCustomer = await db.collection("customer").findOne({ _id: new ObjectId(upcomingCustomerId) });
                        
                        if (upcomingCustomer && upcomingCustomer.fcm) {
                            const messagesend = {
                                token: upcomingCustomer.fcm,
                                notification: {
                                    title: `Queue message from ${updatedQueue.restaurantName}`,
                                    body: notificationBody
                                },
                                data: { key1: "value1", key2: "value2" },
                                android: { priority: "high" },
                                apns: { payload: { aps: { badge: 42 } } }
                            };
                            
                            await admin.messaging().send(messagesend);
                        }
                    }
                }
            }
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

// Join the queue
router.put('/:name/add', async function (req, res) {
    const db = await connectToDB();
    try {
        const name = req.params.name; // Get the queue ID from the URL parameters
        let { customerId, numberOfPeople, rid, children } = req.body; // Get customer details from the request body
        customerId = customerId.toString();


        // Get the current queue
        const queue = await db.collection("queue").findOne({ restaurantName: name });
        if (!queue) {
            return res.status(404).json({ message: "Queue not found" });
        }

        // Check if the customer is already in the queue
        const customerExists = queue.queueArray.some(customer => customer.customerId === customerId);
        if (customerExists) {
            return res.status(400).json({ message: "Customer is already in the queue" });
        }

        // Determine the next queue number
        const queueNumber = queue.queueArray.length + 1; // Queue number is the length of the array + 1

        // Create a new customer object
        const newCustomer = {
            customerId,
            numberOfPeople,
            queueNumber,
            rid,
            children
        };

        // Update the queue by adding the new customer to the queueArray
        await db.collection("queue").updateOne(
            { _id: new ObjectId(queue._id) },
            { $push: { queueArray: newCustomer } } // Push the new customer into the queueArray
        );

        res.status(200).json({ message: "Customer added to the queue successfully" });
    } catch (err) {
        console.log(err.message);
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
//leave the queue
router.delete('/:name/leave/:customerId', async function (req, res) {
    const db = await connectToDB();
    try {
        const name = req.params.name; // Get the restaurant name from the URL parameters
        const customerId = req.params.customerId; // Get the customer ID from the URL parameters

        // Find the queue for the restaurant
        const queue = await db.collection("queue").findOne({ restaurantName: name });

        if (!queue) {
            return res.status(404).json({ message: "Queue not found" });
        }

        // Check if the customer is in the queue
        const customerIndex = queue.queueArray.findIndex(customer => customer.customerId === customerId);
        if (customerIndex === -1) {
            return res.status(404).json({ message: "Customer not found in the queue" });
        }

        // Remove the customer from the queue
        await db.collection("queue").updateOne(
            { restaurantName: name },
            { $pull: { queueArray: { customerId: customerId } } }
        );

        await db.collection("queue").updateOne(
            { restaurantName: name },
            { $inc: { "queueArray.$[elem].queueNumber": -1 } },
            { arrayFilters: [{ "elem.queueNumber": { $gt: queue.queueArray[customerIndex].queueNumber } }] }
        );

        res.status(200).json({ message: "Customer removed from the queue successfully" });
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

//delete queue
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
module.exports = router;
