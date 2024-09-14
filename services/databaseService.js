const {MongoClient, ObjectId} = require('mongodb');

const MONGO_URL = 'mongodb+srv://mongodb-srv:73Sh8L2wuhfjrOpj@mongodb-srv.mswmp.mongodb.net/?retryWrites=true&w=majority&appName=Mongodb-srv';
const DB_NAME = 'your_database';// Update with your database name
const COLLECTION_NAME = 'your_database';// Update with your collection name
const COLLECTION_NAME_ATACKERS = 'some_atackers';

const client = new MongoClient(MONGO_URL);
let collection;
let collection_atackers;

async function connectToMongoDB() {
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    collection_atackers = db.collection(COLLECTION_NAME_ATACKERS);
}

async function disconnectFromMongoDB() {
    if (client) {
        await client.close();
    }
}

async function createItem(name) {
    try {
        const result = await collection_atackers.insertOne({name});
        if (result) {
            const insertedId = result.insertedId;
            const createdItem = await collection_atackers.findOne({ _id: insertedId});
            return createdItem;
        } else {
            throw new Error('Failed to insert item');
        }
    } catch (error) {
        console.error('Error in createdItem', error.message);
        return { error: error.message};
    }
}

async function getItems() {
    const items = await collection.find({}).toArray();
    return items;
}

async function updateItem(id, name) {
    try {
        const result = await collection.updateOne(
            {_id: new ObjectId(id)},
            { $set: {name}}
        );
        return result;
    } catch (error) {
        console.error('Error in updateItem:', error.message);
        return {error: error.message};
    }
}

async function deleteItem(id) {
    try {
        // Check if id is a valid ObjectId
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid ObjectId');
        }

        const result = await collection.deleteOne({ _id: new ObjectId(id)});
        return result;
    } catch (error) {
        //Handle any errors
        console.error('Error in deleteItem:', error.message);
        return {error: error.message};
    }
}

module.exports = {
    connectToMongoDB,
    disconnectFromMongoDB,
    createItem,
    getItems,
    updateItem,
    deleteItem
};