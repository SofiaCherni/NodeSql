const express = require('express');
const bodyParser = require('body-parser');
const mongoService = require('./services/databaseService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

//connect to MongoDB

mongoService.connectToMongoDB().then(() => {
    console.log('Connect to MongoDB');

    // CRUD Operations
    
    // Create (INSERT)
    app.post('/items', async (req, res) => {
        const { name } = req.body;
        try {
            const newItems = await mongoService.createItem(name);
            res.json(newItems);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // Read (SELECT)
    app.get('/items', async (req, res) => {
        try {
            const items = await mongoService.getItems();
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // Update (UPDATE)
    app.put('/items/:id', async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        try {
            const result = await mongoService.updateItem(id, name);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // Delete (DELETE)
    app.delete('/items/:id', async (req, res) => {
        const { id } = req.params;
        try{
            const result = await mongoService.deleteItem(id);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.log('Failed to connect to MongoDB', err);
    process.exit(1);//Exit the application on MongoDB connection failure
});