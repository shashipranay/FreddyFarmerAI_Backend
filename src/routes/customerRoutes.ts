import express from 'express';
import {
    addToCart,
    getCart,
    getChatResponse,
    getMarketInsights,
    getOrders,
    removeFromCart,
    updateCartItem
} from '../controllers/customerController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Orders
router.get('/orders', getOrders);

// Cart
router.get('/cart', getCart);
router.post('/cart/add', addToCart);
router.put('/cart/update', updateCartItem);
router.delete('/cart/remove/:productId', removeFromCart);

// AI Features
router.post('/chat', getChatResponse);
router.get('/market-insights', getMarketInsights);

export default router;