const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

process.env.MONGODB_URI = process.env.MONGODB_URI;

if (!process.env.MONGODB_URI) {
    // throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
}

// Connect to MongoDB
async function connectToDB() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('fypDB');
    db.client = client;
    return db;
}

module.exports = { connectToDB, ObjectId };