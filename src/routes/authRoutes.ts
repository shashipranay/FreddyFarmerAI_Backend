import express, { RequestHandler } from 'express';
import { getProfile, login, logout, register, verifyToken } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);

// Protected routes
router.post('/logout', auth as RequestHandler, logout as RequestHandler);
router.get('/profile', auth as RequestHandler, getProfile as RequestHandler);
router.get('/verify', auth as RequestHandler, verifyToken as RequestHandler);

export default router; 