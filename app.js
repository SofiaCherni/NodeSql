import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import cors from 'cors';
import { products, users, carts, orders } from './storage.js';
import authMiddleware from './middleware/authMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import Joi from 'joi';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import multer from 'multer';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';

const app = express();
app.use(bodyParser.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ dest: 'uploads/' });
const fileUploadEmitter = new EventEmitter();

const logEvent = (message) => {
    const logFilePath = path.join(__dirname, './filesUpload.log');
    const date = new Date().toLocaleString('uk-UA', { hour12: false });
    fs.appendFileSync(logFilePath, `${date} - ${message}\n`);
};

fileUploadEmitter.on('fileUploadStart', () => {
    logEvent('File upload has started');
});

fileUploadEmitter.on('fileUploadEnd', () => {
    logEvent('File has been uploaded');
});

fileUploadEmitter.on('fileUploadFailed', (error) => {
    logEvent(`Error occurred, file upload was failed; ${error.message}`);
});

const readProductsFromFile = () => {
    const productsFilePath = path.join(__dirname, './products.store.json');
    const data = fs.readFileSync(productsFilePath, 'utf-8');
    return JSON.parse(data);
};

const writeProductsToFile = (products) => {
    const productsFilePath = path.join(__dirname, './products.store.json');
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
};

app.post('/api/products/import', upload.single('file'), async (req, res) => {
    const importedProducts = [];

    fileUploadEmitter.emit('fileUploadStart');

    try {
        let products = await readProductsFromFile();

        const readStream = fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                const newProduct = {
                    id: crypto.randomUUID(),
                    name: row.name,
                    description: row.description,
                    category: row.category,
                    price: parseFloat(row.price),
                };
                importedProducts.push(newProduct);
            })
            .on('end', async () => {
                products = [...products, ...importedProducts];
                await writeProductsToFile(products);
                fs.unlink(req.file.path, () => {});
                fileUploadEmitter.emit('fileUploadEnd');
                res.status(201).json({ message: 'Products imported successfully', products: importedProducts });
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                fileUploadEmitter.emit('fileUploadFailed', error);
                res.status(500).json({ error: 'Error processing CSV file' });
            });
    } catch (error) {
        console.error('Error importing products:', error);
        fileUploadEmitter.emit('fileUploadFailed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST - створити новий продукт
app.post('/api/product', async (req, res) => {
    try {
        const { name, description, category, price } = req.body;
        const productsFilePath = path.join(__dirname, './products.store.json');

        if (!fs.existsSync(productsFilePath)) {
            fs.writeFileSync(productsFilePath, JSON.stringify([], null, 2));
        }

        const productsData = fs.readFileSync(productsFilePath, 'utf-8');
        const products = JSON.parse(productsData);

        const newProduct = {
            id: crypto.randomUUID(),
            name,
            description,
            category,
            price
        };

        products.push(newProduct);
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));

        res.status(201).json(newProduct);
    } catch (error) {
        const errorMessage = error.details ? error.details[0].message : error.message;
        res.status(422).json({ error: errorMessage });
    }
});

// Валідація email та password
const schema = Joi.object({
    email: Joi.string()
        .email()
        .pattern(new RegExp('^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'))
        .required(),
    name: Joi.string()
        .min(3)
        .max(30)
        .required(),
    password: Joi.string()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
        .required()
});

// POST - реєстрація користувача
app.post('/api/register', async (req, res) => {
    try {
        const { email, name, password } = await schema.validateAsync(req.body);

        const id = crypto.randomUUID();
        const newUser = {
            id,
            email,
            name
        };

        users.push(newUser);
        
        res.status(201).json(newUser);
    } catch (error) {
        const errorMessage = error.details ? error.details[0].message : error.message;
        res.status(422).json({ error: errorMessage });
    }
});

// GET - отримати всі продукти
app.get('/api/products', (req, res) => {
    res.send(products);
});

// GET - отримати продукт за ID
app.get('/api/products/:productId', async (req, res) => {
    const product = products.find(p => p.id === req.params.productId);
    if (!product) {
        return res.status(404).json({ error: 'Продукт не знайдено' });
    }
    res.json(product);
});

// PUT - додати продукт до корзини
app.put('/api/cart/:productId', authMiddleware, async (req, res) => {
    const product = products.find(p => p.id === req.params.productId);
    if (!product) {
        return res.status(404).json({ error: 'Продукт не знайдено' });
    }
    
    let cart = carts.find(c => c.userId === req.user.id);
    if (!cart) {
        cart = { 
            id: crypto.randomUUID(),
            userId: req.user.id,
            products: [] 
        };
        carts.push(cart);
    }

    cart.products.push(product);
    res.json(cart);
});

// DELETE - видалити продукт з корзини
app.delete('/api/cart/:productId', authMiddleware, async (req, res) => {
    const cart = carts.find(c => c.userId === req.user.id);
    if (!cart) {
        return res.status(404).json({ error: 'Корзина не знайдена' });
    }

    cart.products = cart.products.filter(p => p.id !== req.params.productId);
    res.json(cart);
});

// POST - створення замовлення
app.post('/api/cart/checkout', authMiddleware, async (req, res) => {
    const cart = carts.find(c => c.userId === req.user.id);
    if (!cart || cart.products.length === 0) {
        return res.status(400).json({ error: 'Корзина порожня' });
    }

    const totalPrice = cart.products.reduce((sum, product) => sum + product.price, 0);
    const order = {
        id: crypto.randomUUID(),
        userId: req.user.id,
        products: cart.products,
        totalPrice
    };
    orders.push(order);

    cart.products = [];
    res.status(201).json(order);
});

app.use(errorMiddleware);

app.listen(3000, () => {
    console.log(`Server is working!`);
});