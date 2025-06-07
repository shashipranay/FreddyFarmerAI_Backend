// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Then import other dependencies
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import cartRoutes from './routes/cartRoutes';
import customerRoutes from './routes/customerRoutes';
import farmerRoutes from './routes/farmerRoutes';
import productRoutes from './routes/productRoutes';
import uploadRoutes from './routes/uploadRoutes';

// Debug logging for environment variables
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('API Key length:', process.env.GEMINI_API_KEY?.length);
console.log('API Key starts with:', process.env.GEMINI_API_KEY?.substring(0, 7));

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://freddy-farmer-ai-frontend.vercel.app', 'https://freddy-farmer-ai-frontend.vercel.app/'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/cart', cartRoutes);

// Root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Green Harvest API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      upload: '/api/upload',
      farmer: '/api/farmer',
      customer: '/api/customer',
      cart: '/api/cart',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  console.log('404 Not Found:', req.method, req.path);
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/green-harvest';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Available routes:');
    console.log('- GET /api/cart');
    console.log('- POST /api/cart/add');
  });
}

// Export the Express app for Vercel
export default app; 