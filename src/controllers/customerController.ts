import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';
import { Document } from 'mongoose';
import Order, { IOrder } from '../models/Order';
import { Product } from '../models/Product';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI?.getGenerativeModel({ model: "gemini-2.0-flash" });

interface PopulatedProduct {
  _id: string;
  name: string;
  price: number;
  image: string;
}

interface PopulatedOrder extends Omit<IOrder, 'products'> {
  products: Array<{
    product: PopulatedProduct;
    quantity: number;
  }>;
}

// Get customer orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate<{ products: Array<{ product: PopulatedProduct; quantity: number }> }>('products.product', 'name price image')
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order: Document & PopulatedOrder) => ({
      id: order._id,
      products: order.products.map((item: { product: PopulatedProduct; quantity: number }) => ({
        id: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      total: order.total,
      status: order.status,
      date: order.createdAt.toISOString().split('T')[0]
    }));

    res.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Market Insights
export const getMarketInsights = async (req: Request, res: Response) => {
  try {
    // Get all products
    const products = await Product.find()
      .populate('farmer', 'name location')
      .sort({ createdAt: -1 });

    // Calculate basic market insights
    const insights = {
      trendingProducts: products
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map(product => ({
          name: product.name,
          price: product.price,
          category: product.category,
          trend: 'Popular'
        })),
      priceChanges: products
        .slice(0, 5)
        .map(product => ({
          name: product.name,
          currentPrice: product.price,
          previousPrice: product.price,
          change: 0
        })),
      recommendations: products
        .filter(product => product.stock > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map(product => ({
          name: product.name,
          price: product.price,
          rating: product.rating,
          category: product.category
        }))
    };

    res.json(insights);
  } catch (error) {
    console.error('Market Insights Error:', error);
    res.status(500).json({ error: 'Failed to fetch market insights' });
  }
};

// Chat with AI
export const getChatResponse = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!genAI || !model) {
      return res.status(503).json({ error: 'AI service is not available' });
    }

    const prompt = `As an agricultural marketplace assistant, respond to the following customer query: ${message}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
};

// Get customer cart
export const getCart = async (req: Request, res: Response) => {
  try {
    const cart = await Order.findOne({ 
      customer: req.user._id,
      status: 'cart'
    }).populate<{ products: Array<{ product: PopulatedProduct; quantity: number }> }>('products.product', 'name price image');

    if (!cart) {
      return res.json({ cart: { products: [], total: 0 } });
    }

    const formattedCart = {
      id: cart._id,
      products: cart.products.map((item: { product: PopulatedProduct; quantity: number }) => ({
        id: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        image: item.product.image
      })),
      total: cart.total
    };

    res.json({ cart: formattedCart });
  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
}; 