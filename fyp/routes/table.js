var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
//update table status
//update table status with user check in 
//update table to be free 
//update table that it has been paid 
//get table 
//using name
/* Retrieve a single restaurant by using its name to search */
router.get('/:name', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("table").find({ belong: req.params.name }).toArray();
        if (result) {
            res.json({ table: result });
        } else {
            res.status(404).json({ message: "Table not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        if (db && db.client) {
            await db.client.close();
        }
    }
});
// compare whether all table are busy or not to create a queue
router.get('/:name/status', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("table").find({ belong: req.params.name }).toArray();
        if (result) {
            let counter = await db.collection("table").countDocuments({ belong: req.params.name, status: "available" });
            if (counter === 0) {
                res.json({ status: true });

            } else {
                res.json({ status: false });

            }



        } else {
            res.status(404).json({ message: "Table not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
// Get the total number of bookings per restaurant and status
router.get('/stats/restaurant', async function (req, res) {
    const db = await connectToDB();
    try {
        let result = await db.collection("table").aggregate([
            // Non-null restaurant name
            { $match: { belong: { $ne: null } } },
            // Group by restaurant name and status
            {
                $group: {
                    _id: {
                        belong: "$belong",
                        status: "$status" // Assuming 'status' field contains 'free' or 'available'
                    },
                    total: { $sum: 1 }
                }
            }
        ]).toArray();



        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
})



// Update a single table status
router.put('/:id/occupied', async function (req, res) {
    const db = await connectToDB();
    try {
        req.body.occupiedSince = new Date();


        let result = await db.collection("table").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });


        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Table updated" });
        } else {
            res.status(404).json({ message: "Table not found" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        await db.client.close();
    }
});
//update average dineing time 
//check out 
router.put('/:id/free', async (req, res) => {
    const db = await connectToDB();

    try {

        const tableId = req.params.id;

        // Fetch the table that is being vacated
        const table = await db.collection("table").findOne({ _id: new ObjectId(tableId) })
        if (!table || table.status !== 'in used') {
            return res.status(404).send('Table not found or not in used');
        }

        // Calculate dining duration
        const occupiedSince = new Date(table.occupiedSince);
        const vacatedAt = new Date();
        const diningDuration = (vacatedAt - occupiedSince) / (1000 * 60); // Convert to minutes

        // Fetch historical data
        let historicalData = await db.collection("dining").findOne({ belong: table.belong });

        //calculate average
        // Update average dining time
        //assume each time is 100 for simplicity 
        let partySize = '1-2 people';

        if (table.type != null) {
            partySize = table.type ?? '1-2 people';

        }


        const currentAvgDiningTime = historicalData[`${partySize}`] || 0;
        const currentCount = 100;

        const newAvgDiningTime = ((currentAvgDiningTime * currentCount) + diningDuration) / (currentCount + 1);

        await db.collection("dining").updateOne(
            { belong: table.belong },
            {
                $set: {
                    [partySize]: newAvgDiningTime

                }
            }
        );
        if (table.rid) {
            await db.collection("dinerecord").updateOne({ _id: new ObjectId(table.rid) }, { $set: { "status": "checked out" } });
        }


        req.body.occupiedSince = null;
        // Update table status to free
        await db.collection("table").updateOne({ _id: new ObjectId(tableId) }, { $set: req.body });

        res.status(200).json({ message: "Table updated to available" });
    } catch (error) {
        console.log(error)
        res.status(500).send('Error updating table status and historical data');
    }
});



module.exports = router;
