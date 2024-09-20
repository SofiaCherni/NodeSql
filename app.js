import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import cors from 'cors';
import { products, users, carts, orders } from './storage.js';


const app = express();
app.use(bodyParser.json());
app.use(cors());

// Валідація email та password
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};


// POST - реєстрація користувача
app.post('/api/register', async (req, res) => {
    const { email, name, password } = req.body;

    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Невалідний email' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Пароль не відповідає вимогам' });
    }

    const id = crypto.randomUUID();
    const newUser = {
        id,
        email,
        name
    };

    users.push(newUser);

    res.setHeader('x-user-id', id);
    res.status(201).json(newUser);
});

// GET - отримати всі продукти
app.get('/api/products', (req, res) => {
    res.send(products);
});

// GET - отримати продукт за ID
app.get('/api/products/:productId', async (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.productId));
    if (!product) {
        return res.status(404).json({ error: 'Продукт не знайдено' });
    }
    res.json(product);
});

//  Перевірка заголовка x-user-id
const authMiddleware = (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) {
        return res.status(401).json({ error: 'Необхідно вказати x-user-id' });
    }
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(401).json({ error: 'Невірний x-user-id' });
    }
    req.user = user;
    next();
};

// PUT - додати продукт до корзини
app.put('/api/cart/:productId', authMiddleware, async (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.productId));
    if (!product) {
        return res.status(404).json({ error: 'Продукт не знайдено' });
    }
    
    let cart = carts.find(c => c.userId === req.user.id);
    if (!cart) {
        cart = { 
            id: crypto.randomUUID(),
            userId: req.user.id,
            products: [] };
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

    cart.products = cart.products.filter(p => p.id !== parseInt(req.params.productId));
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

app.listen(3000, () => {
    console.log(`Server is working!`);
});