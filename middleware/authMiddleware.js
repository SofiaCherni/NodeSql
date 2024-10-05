import { users } from '../storage.js';

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

export default authMiddleware;