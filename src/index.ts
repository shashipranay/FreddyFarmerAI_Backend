import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Green Harvest Smart Market API' });
});

// AI-powered route for market analysis
app.post('/api/analyze-market', async (req, res) => {
  try {
    const { query } = req.body;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an agricultural market analysis expert. Provide insights based on the query."
        },
        {
          role: "user",
          content: query
        }
      ],
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in market analysis:', error);
    res.status(500).json({ error: 'Failed to analyze market data' });
  }
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/green-harvest';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 