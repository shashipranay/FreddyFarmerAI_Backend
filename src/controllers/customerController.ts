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

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    console.log('Add to cart request received:', {
      userId: req.user._id,
      body: req.body
    });

    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      console.log('Product not found:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find or create cart
    let cart = await Order.findOne({ 
      customer: req.user._id,
      status: 'cart'
    });

    if (!cart) {
      console.log('Creating new cart for user:', req.user._id);
      cart = new Order({
        customer: req.user._id,
        products: [{ product: productId, quantity: 1 }],
        total: product.price,
        status: 'cart'
      });
    } else {
      console.log('Updating existing cart:', cart._id);
      // Check if product already in cart
      const existingProduct = cart.products.find(
        p => p.product.toString() === productId
      );

      if (existingProduct) {
        existingProduct.quantity += 1;
      } else {
        cart.products.push({ product: productId, quantity: 1 });
      }

      // Update total
      const populatedCart = await cart.populate('products.product');
      cart.total = populatedCart.products.reduce((sum, item) => {
        const product = item.product as any;
        return sum + (product.price * item.quantity);
      }, 0);
    }

    await cart.save();
    console.log('Cart saved successfully:', cart._id);

    // Populate product details before sending response
    await cart.populate({
      path: 'products.product',
      select: 'name price image farmer'
    });

    res.json({
      message: 'Product added to cart successfully',
      cart
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Failed to add product to cart' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    console.log('Update cart request received:', {
      userId: req.user._id,
      body: req.body
    });

    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Find the product to check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} items available in stock` });
    }

    // Find the cart
    const cart = await Order.findOne({ 
      customer: req.user._id,
      status: 'cart'
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the product in cart
    const cartItem = cart.products.find(
      p => p.product.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Update quantity
    cartItem.quantity = quantity;

    // Update total
    const populatedCart = await cart.populate('products.product');
    cart.total = populatedCart.products.reduce((sum, item) => {
      const product = item.product as any;
      return sum + (product.price * item.quantity);
    }, 0);

    await cart.save();
    console.log('Cart updated successfully:', cart._id);

    // Populate product details before sending response
    await cart.populate({
      path: 'products.product',
      select: 'name price image stock'
    });

    res.json({
      message: 'Cart updated successfully',
      cart
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Failed to update cart' });
  }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    console.log('Remove from cart request received:', {
      userId: req.user._id,
      productId: req.params.productId
    });

    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Find the cart
    const cart = await Order.findOne({ 
      customer: req.user._id,
      status: 'cart'
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove the product from cart
    cart.products = cart.products.filter(
      p => p.product.toString() !== productId
    );

    // Update total
    const populatedCart = await cart.populate('products.product');
    cart.total = populatedCart.products.reduce((sum, item) => {
      const product = item.product as any;
      return sum + (product.price * item.quantity);
    }, 0);

    await cart.save();
    console.log('Item removed from cart successfully:', cart._id);

    // Populate product details before sending response
    await cart.populate({
      path: 'products.product',
      select: 'name price image stock'
    });

    res.json({
      message: 'Item removed from cart successfully',
      cart
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
}; 