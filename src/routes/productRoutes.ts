import express from 'express';
import {
    addReview,
    createProduct,
    deleteProduct,
    getProduct,
    getProducts,
    updateProduct
} from '../controllers/productController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes (require authentication)
router.post('/', auth, createProduct);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);
router.post('/:id/reviews', auth, addReview);

export default router; 