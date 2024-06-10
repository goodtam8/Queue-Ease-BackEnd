const { MongoClient, ObjectId } = require('mongodb');

process.env.MONGODB_URI = 'mongodb://goodtam30:Vn3NXA0E48XGafDC6WLtqGXixg8MGXL9DfjAk3mTa8hqDuW3BRKaKoj3AHwXTl8CShhhJ6Ek4N53ACDbh3QXhw==@goodtam30.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&maxIdleTimeMS=120000&appName=@goodtam30@';

if (!process.env.MONGODB_URI) {
    // throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
}

// Connect to MongoDB
async function connectToDB() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('bookingsDB');
    db.client = client;
    return db;
}

module.exports = { connectToDB, ObjectId };