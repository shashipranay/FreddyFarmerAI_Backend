import express from 'express';
import {
    addExpense,
    createTrade,
    deleteExpense,
    getAIAnalytics,
    getAIPredictions,
    getExpenseAnalytics,
    getExpenses,
    getInventoryAnalytics,
    getMarketInsights,
    getProductRecommendations,
    getSalesAnalytics,
    getTrades,
    updateExpense,
    updateTradeStatus
} from '../controllers/farmerController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Expense routes
router.post('/expenses', addExpense);
router.get('/expenses', getExpenses);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

// Trade routes
router.get('/trades', getTrades);
router.post('/trades', createTrade);
router.put('/trades/:tradeId/status', updateTradeStatus);

// Analytics routes
router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/inventory', getInventoryAnalytics);
router.get('/analytics/predictions', getAIPredictions);
router.get('/analytics/expenses', getExpenseAnalytics);

// AI Analytics routes
router.post('/ai-analytics', getAIAnalytics);
router.get('/ai-recommendations', getProductRecommendations);
router.get('/market-insights', getMarketInsights);

export default router; 