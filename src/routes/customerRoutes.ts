import express from 'express';
import { getChatResponse, getMarketInsights, getOrders } from '../controllers/customerController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Orders
router.get('/orders', getOrders);

// Market insights
router.get('/market-insights', getMarketInsights);

// Chat with AI
router.post('/chat', getChatResponse);

export default router; 