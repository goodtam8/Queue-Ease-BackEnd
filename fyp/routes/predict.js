var express = require('express');
var router = express.Router();

const { connectToDB, ObjectId } = require('../utils/db');
const e = require('express');

//calculate the waiting time of each customer 
router.get('/:name', async (req, res) => {
  const db = await connectToDB();

  try {
    // Fetch data from the database
    const queue = await db.collection("queue").findOne({ restaurantName: req.params.name });;
    const tables = await db.collection("table").find({ belong: req.params.name }).toArray();
    const historicalData = await db.collection("dining").findOne({ belong: req.params.name });
    //calculate the average time for all types
    const avgtime = (historicalData['1-2 people'] + historicalData['3-4 people'] + historicalData['5-6 people'] + historicalData['7+ people']) / 4


    // Calculate remaining time for each table average number for all type 
    const now = new Date();
    const tableStatus = tables
      .filter(table => table.status === 'in use')//only get the in use data
      .map(table => {
        console.log(table);
        const occupiedSince = new Date(table.occupiedSince) || Date.now();
        console.log(occupiedSince)

        const occupiedTime = (now - occupiedSince) / (1000 * 60); // Convert to minutes
        const avgDiningTime = avgtime;
        const remainingTime = avgDiningTime - occupiedTime;
        return Math.max(0, remainingTime);
      });
    const predictWaitingTime = (queueArray, tableStatus, length, currentPosition) => {
      let waitingTime = 0;
      for (let i = currentPosition; i <= length; i++) {//calculate need to wait too long
        const avgDiningTime = avgtime || 60; // Default to 60 minutes if not found

        if (tableStatus.length > 0) {
          const availableTableTime = tableStatus.shift();// check which one is larger comparison
          waitingTime = Math.max(waitingTime, availableTableTime);//why pick largest because it has to there are other people 
          //maybe a case only one 7+people table
          // so that why have the 
          //前一位有人下一位等同一張咪要＋avg dining time
          //loop stand for how many table they have to wait 
        } else {
          waitingTime += avgDiningTime;
        }
      }
      return waitingTime;
    };

    const waitingTime = predictWaitingTime(queue.queueArray, tableStatus, queue.queueArray.length, queue.currentPosition);

    // Send the response
    res.json({
      waitingTime: Math.max(0, waitingTime)
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error fetch');
  }
});



router.get('/:name/:id/time', async (req, res) => {
  const db = await connectToDB();

  try {
    const customerId = req.params.id;

    // Fetch data from the database
    const queue = await db.collection("queue").findOne({ restaurantName: req.params.name });
    const tables = await db.collection("table").find({ belong: req.params.name }).toArray();
    const historicalData = await db.collection("dining").findOne({ belong: req.params.name });
    const type = ['1-2 people', '3-4 people', '5-6 people', '7+ people']
    const queueObject = await db.collection("queue").aggregate([
      { $match: { restaurantName: req.params.name } },
      { $unwind: "$queueArray" },
      { $match: { "queueArray.customerId": req.params.id } },
      { $project: { _id: 0, queueObject: "$queueArray" } }
    ]).toArray();

    // Calculate remaining time for each table base on its type is what and compare when it will reach to the dining time limit.
    const now = Date.now();
    const obj=queueObject[0].queueObject;
    const tableStatus = tables
      .filter(table => table.status === 'in used'&&table.type===obj.numberOfPeople) // Only get the in-use data
      .map(table => {
        const occupiedSince = new Date(table.occupiedSince);
        const occupiedTime = isNaN(occupiedSince.getTime()) ? 0 : (now - occupiedSince.getTime()) / (1000 * 60); // Convert to minutes
        const avgDiningTime = historicalData[obj.numberOfPeople] || 60; // Example lookup
        const remainingTime = avgDiningTime - occupiedTime;

        return Math.max(0, remainingTime); //finding best case 
      });
      //if the remaining time is larger than dineing time mean time up and return 0 

    // Finish generating an array
    console.log(tableStatus);

    // Find the position of the customer in the queue
    const customerIndex = queue.queueArray.filter(queueItem => queueItem.customerId === customerId);
    if (customerIndex === -1) {
      return res.status(404).send('Customer not found in the queue');
    }
    // Predict waiting time for the specified customer
    // if it is zero, it will return 
    const predictWaitingTime = ( tableStatus, customerIndex, currentPosition) => {
      let waitingTime = 0;
      for (let i = currentPosition; i <= customerIndex; i++) {// if 輪到佢就會0

        const avgDiningTime = historicalData[obj.numberOfPeople] || 60; // Default to 60 minutes if not found

        if (tableStatus.length > 0) {//base on their time 
          const availableTableTime = tableStatus.shift();
          waitingTime = Math.max(waitingTime, availableTableTime);//Multiple tables becoming available at different times
          //Sequential seating of customers
          //The fact that a customer must wait for the longest remaining time among available tables if earlier tables are taken by customers ahead in the queue
        } else {
          waitingTime += avgDiningTime;
        }
      }
      return waitingTime;
    };
    console.log(customerIndex.queueNumber);
    console.log(queue.currentPosition);

    const waitingTime = predictWaitingTime( tableStatus, customerIndex[0].queueNumber, queue.currentPosition);

    // Send the response
    res.json({
      customerId: customerId,
      waitingTime: Math.max(0, waitingTime)
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;


