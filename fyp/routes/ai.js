

const express = require('express');
const axios = require('axios');

const router = express.Router();

// Replace with your Azure AI API key
const apiKey = "9f81b190-947e-4321-8a52-53268aedc900";
const endpointUrl = "https://genai.hkbu.edu.hk/general/rest/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-01";

router.post('/', async (req, res) => {
    const userMessage = req.body.message; // Get the user's message from the request body

    // Prepare the messages array as per the API's expected format
    const messages = [
      
        {
            role: "user",
            content: userMessage // Use the user's message
        }
    ];

    try {
        const response = await axios.post(endpointUrl, {
            messages: messages, // Send the messages array
            temperature: 0 // Set the temperature as per your requirement
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey, // Use your API key for authorization
                'Content-Type': 'application/json',
            }
        });

        // Send the AI's response back to the client
        res.json({
            reply: response.data.choices[0].message.content, // Adjust according to the response structure
        });
    } catch (error) {
        console.error('Error communicating with Azure AI:', error);
        res.status(500).json({ error: 'Failed to communicate with Azure AI' });
    }
});

module.exports = router;
