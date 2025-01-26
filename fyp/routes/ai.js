

const express = require('express');
const axios = require('axios');
const { connectToDB, ObjectId } = require('../utils/db');
const router = express.Router();
//no menu to find

const apiKey = "aace82ee-218a-424d-8c60-1b1c474376d7";
const endpointUrl = "https://genai.hkbu.edu.hk/general/rest/deployments/gpt-4-o-mini/chat/completions?api-version=2024-02-01";

router.post('/', async (req, res) => {
    const userMessage = req.body.message; // Get the user's message from the request body
    const db = await connectToDB();
    try {
        const restaurantInfo = await handleUserMessage(userMessage, db);
        console.log(restaurantInfo)
        if (restaurantInfo === 500) {
            res.status(200).json({
                reply: "I'm here to help with questions about our restaurant. You can ask me about our menu, hours, location, reservations, or the type of restaurant. For other inquiries, please contact our support team."
            });
            return
        }
        // Prepare the messages array as per the API's expected format
        const messages = [
            {
                role: "user",
                content: userMessage // Use the user's message
            },
            {
                role: "system",
                content: `Here is the restaurant information: ${JSON.stringify(restaurantInfo)}.` // Include restaurant info
            }
        ];

        const response = await axios.post(endpointUrl, {
            messages: messages, // Send the messages array
            temperature: 0 // Set the temperature as per  requirement
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey, // Use  API key for authorization
                'Content-Type': 'application/json'
            }
        });

        // Send the AI's response back to the client
        res.json({
            reply: response.data.choices[0].message.content // Adjust according to the response structure
        });
    } catch (error) {
        console.error('Error processing request:', error);

        // Send a specific error message to the frontend
        res.status(500).json({
            reply: "I'm here to help with questions about our restaurant. You can ask me about our menu, hours, location, reservations, or the type of restaurant. For other inquiries, please contact our support team."
        });
    }
});

router.post('/analysis', async (req, res) => {
    const userMessage = req.body.message; // Get the user's message from the request body
    try {

        // Prepare the messages array as per the API's expected format
        const messages = [

            {
                role: "system",
                content: `Here is the my restaurant revenue information, Provide some analysis on it
                : ${JSON.stringify(userMessage)}.` // Include restaurant info
            }
        ];

        const response = await axios.post(endpointUrl, {
            messages: messages, // Send the messages array
            temperature: 0 // Set the temperature as per your requirement
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey, // UseAPI key for authorization
                'Content-Type': 'application/json'
            }
        });

        // Send the AI's response back to the client
        res.json({
            reply: response.data.choices[0].message.content // Adjust according to the response structure
        });
    } catch (error) {
        console.error('Error processing request:', error);

        // Send a specific error message to the frontend
        res.status(500).json({
            reply: "Error in providing results."
        });
    }

});


async function handleUserMessage(userMessage, db) {
    //create pattern of text for detect which query match the pattern mentioned below
    const relevantKeywords = ['menu', 'hours', 'location', 'reservation', 'contact', 'type', 'cuisine', 'restaurant'];
    const isRelevant = relevantKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    const addressPattern = /address|location|find.at|where.located/i;
    const isAddressQuery = addressPattern.test(userMessage);

    const typePattern = /what type of restaurant|what cuisine|is it a (.+) restaurant|type of restaurant|restaurant with type|restaurant type|(.+) restaurant|(.+) cuisine/i;
    const isTypeQuery = typePattern.test(userMessage) ||
        /(thai|japanese|italian|chinese|mexican|indian|cafe|bistro)/i.test(userMessage);

    const openTimePattern = /are you open|what are your hours|is it open now|when do you close|open hours/i;
    const isOpenTimeQuery = openTimePattern.test(userMessage);

    let restaurantInfo;

    try {
        if (isOpenTimeQuery) {
            restaurantInfo = await getOpenRestaurants(db);
            console.log("Processing open time query");
        } else if (isAddressQuery) {
            console.log("Processing address query");
            restaurantInfo = await getRestaurantByAddress(userMessage, db);
        } else if (isTypeQuery) {
            console.log("Processing type query");
            restaurantInfo = await getRestaurantByType(userMessage, db);
        } else if (!isRelevant) {

            return 500
        } else {
            console.log('Processing general query');
            restaurantInfo = await db.collection("restaurant").find({}).toArray();
        }

        return restaurantInfo;
    } catch (error) {
        console.error('Error in handleUserMessage:', error);
        throw error;
    }
}

async function getOpenRestaurants(db) {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    try {
        const restaurants = await db.collection("restaurant").find({}).toArray();
        const openRestaurants = restaurants.filter(restaurant => {
            const startTime = restaurant.start_time.split(':');
            const endTime = restaurant.end_time.split(':');
            const startTimeInMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
            const endTimeInMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);

            // Check if current time is between start and end time
            return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
        }).map(restaurant => restaurant.name); // Return the names of open restaurants

        return { openRestaurants };
    } catch (error) {
        console.error('Error checking open restaurants:', error);
        throw new Error('Failed to check open restaurants');
    }
}

// Function to get restaurant information by address
async function getRestaurantByAddress(userMessage, db) {
    const addressMatch = userMessage.match(/at\s(.+)$/i);
    const address = addressMatch ? addressMatch[1].trim() : '';

    try {
        const restaurantInfo = await db.collection("restaurant").findOne({ location: new RegExp(address, 'i') });
        if (!restaurantInfo) {
            throw new Error(`Sorry, I couldn't find a restaurant at the address "${address}". Please try another address.`);
        }
        return restaurantInfo;
    } catch (error) {
        console.error('Error querying MongoDB:', error);
        throw new Error('Failed to query MongoDB');
    }
}

async function getRestaurantByType(userMessage, db) {
    // Create a mapping object for common variations
    const typeMapping = {
        'thai': ['thai', 'thailand'],
        'japanese': ['japanese', 'japan'],
        'italian': ['italian', 'italy'],
        'chinese': ['chinese', 'china'],
        'mexican': ['mexican', 'mexico'],
        'indian': ['indian', 'india'],
        'cafe': ['cafe', 'café'],
        'bistro': ['bistro']
    };

    // Extract the type from user message
    const typeMatch = userMessage.match(/(japanese|thai|italian|chinese|mexican|indian|cafe|bistro)/i);
    const userType = typeMatch ? typeMatch[1].toLowerCase() : '';

    try {
        // Create a query that matches any of the variations for the requested type
        let query = {};
        if (userType && typeMapping[userType]) {
            query.type = { $in: typeMapping[userType].map(t => new RegExp(t, 'i')) };
        }

        const restaurantInfo = await db.collection("restaurant").findOne(query);
        console.log(restaurantInfo);

        if (!restaurantInfo) {
            throw new Error(`Sorry, I couldn't find any restaurant of type "${userType}". Please try asking about another type.`);
        }
        return restaurantInfo;
    } catch (error) {
        console.error('Error querying MongoDB:', error);
        throw new Error('Failed to query MongoDB');
    }
}

module.exports = router;
