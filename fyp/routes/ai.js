

const express = require('express');
const axios = require('axios');
const { connectToDB, ObjectId } = require('../utils/db');
const router = express.Router();

// Replace with your Azure AI API key
const apiKey = "9f81b190-947e-4321-8a52-53268aedc900";
const endpointUrl = "https://genai.hkbu.edu.hk/general/rest/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-01";

router.post('/', async (req, res) => {
    const userMessage = req.body.message; // Get the user's message from the request body
    const db = await connectToDB();

    try {
        const restaurantInfo = await handleUserMessage(userMessage, db);
        
        // Prepare the messages array as per the API's expected format
        const messages = [
            {
                role: "user",
                content: userMessage // Use the user's message
            },
            {
                role: "system",
                content: `Here is the restaurant information: ${JSON.stringify(restaurantInfo)}` // Include restaurant info
            }
        ];

        const response = await axios.post(endpointUrl, {
            messages: messages, // Send the messages array
            temperature: 0 // Set the temperature as per your requirement
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey, // Use your API key for authorization
                'Content-Type': 'application/json'
            }
        });

        // Send the AI's response back to the client
        res.json({
            reply: response.data.choices[0].message.content // Adjust according to the response structure
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
// Function to handle user messages and determine the appropriate response
async function handleUserMessage(userMessage, db) {
    const relevantKeywords = ['menu', 'hours', 'location', 'reservation', 'contact', 'type', 'cuisine', 'restaurant'];
    const isRelevant = relevantKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    // Patterns for different types of queries
    const addressPattern = /address|location|find.at|where.located/i;
    const isAddressQuery = addressPattern.test(userMessage);

    const typePattern = /what type of restaurant|what cuisine|is it a (.+) restaurant|type of restaurant/i;
    const isTypeQuery = typePattern.test(userMessage);

    const openTimePattern = /are you open|what are your hours|is it open now|when do you close|open hours/i;
    const isOpenTimeQuery = openTimePattern.test(userMessage);

    let restaurantInfo;

    if (isOpenTimeQuery) {
        restaurantInfo = await getOpenRestaurants(db);
    } else if (isAddressQuery) {
        restaurantInfo = await getRestaurantByAddress(userMessage, db);
    } else if (isTypeQuery) {
        restaurantInfo = await getRestaurantByType(userMessage, db);
    } else if (!isRelevant) {
        throw new Error("I'm here to help with questions about our restaurant. You can ask me about our menu, hours, location, reservations, or the type of restaurant. For other inquiries, please contact our support team.");
    } else {
        restaurantInfo = await db.collection("restaurant").findOne({});
    }

    return restaurantInfo;
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

// Function to get restaurant information by type
async function getRestaurantByType(userMessage, db) {
    const typeMatch = userMessage.match(/(japanese|thai|italian|chinese|mexican|indian|cafe|bistro)/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : '';

    try {
        const restaurantInfo = await db.collection("restaurant").findOne({ type: new RegExp(type, 'i') });
        if (!restaurantInfo) {
            throw new Error(`Sorry, I couldn't find any restaurant of type "${type}". Please try asking about another type.`);
        }
        return restaurantInfo;
    } catch (error) {
        console.error('Error querying MongoDB:', error);
        throw new Error('Failed to query MongoDB');
    }
}

module.exports = router;
