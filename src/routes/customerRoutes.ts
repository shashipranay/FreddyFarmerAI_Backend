import express from 'express';
import {
    addToCart,
    checkout,
    getCart,
    getChatResponse,
    getMarketInsights,
    getOrders,
    getTrades,
    removeFromCart,
    updateCartItem
} from '../controllers/customerController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Orders
router.get('/orders', getOrders);

// Trades
router.get('/trades', getTrades);

// Cart routes
router.get('/cart', getCart);
router.post('/cart/add', addToCart);
router.put('/cart/update/:productId', updateCartItem);
router.delete('/cart/remove/:productId', removeFromCart);
router.post('/cart/checkout', checkout);

// AI features
router.post('/chat', getChatResponse);
router.get('/market-insights', getMarketInsights);

export default router;