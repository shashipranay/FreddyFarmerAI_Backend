import express from 'express';
import { addToCart, getCart } from '../controllers/customerController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Debug middleware to log all cart route requests
router.use((req, res, next) => {
  console.log('Cart Route accessed:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// All routes require authentication
router.use(authenticateToken);

// Get cart
router.get('/', getCart);

// Add item to cart
router.post('/add', (req, res) => {
  console.log('Add to cart request:', {
    body: req.body,
    user: req.user
  });
  addToCart(req, res);
});

export default router; 