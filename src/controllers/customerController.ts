import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';
import Order, { IOrder } from '../models/Order';
import { Product } from '../models/Product';
import Trade, { ITrade } from '../models/Trade';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI?.getGenerativeModel({ model: "gemini-2.0-flash" });

interface PopulatedProduct {
  _id: string;
  name: string;
  price: number;
  images?: Array<{ url: string; public_id: string }>;
}

interface PopulatedFarmer {
  _id: string;
  name: string;
  location?: string;
}

interface PopulatedTrade extends Omit<ITrade, 'product' | 'farmer'> {
  product: PopulatedProduct;
  farmer: PopulatedFarmer;
}

interface PopulatedOrder extends Omit<IOrder, 'products'> {
  products: Array<{
    product: PopulatedProduct;
    quantity: number;
  }>;
}

// Get customer orders
export const getOrders = async (req: any, res: any) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate<{ products: Array<{ product: PopulatedProduct; quantity: number }> }>('products.product', 'name price images')
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order: PopulatedOrder) => ({
      _id: order._id,
      products: order.products.map(item => ({
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          images: item.product.images || []
        },
        quantity: item.quantity
      })),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
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
    }).populate<{ products: Array<{ product: PopulatedProduct; quantity: number }> }>('products.product', 'name price images');

    if (!cart) {
      return res.json({ cart: { products: [], total: 0 } });
    }

    const formattedCart = {
      _id: cart._id,
      products: cart.products.map(item => ({
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          images: item.product.images || []
        },
        quantity: item.quantity
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
      params: req.params,
      body: req.body
    });

    const { productId } = req.params;
    const { quantity } = req.body;
    
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

// Checkout cart
export const checkout = async (req: Request, res: Response) => {
  try {
    console.log('Checkout request received:', {
      userId: req.user._id
    });

    // Find the cart
    const cart = await Order.findOne({ 
      customer: req.user._id,
      status: 'cart'
    }).populate('products.product');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    if (cart.products.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Create trades for each product
    const trades = [];
    for (const item of cart.products) {
      const product = item.product as any;
      
      // Create trade
      const trade = await Trade.create({
        farmer: product.farmer,
        buyer: req.user._id,
        product: product._id,
        quantity: item.quantity,
        amount: product.price * item.quantity,
        status: 'pending',
        order: cart._id // Set the order reference
      });

      // Update product stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity }
      });

      trades.push(trade);
    }

    // Update cart status to pending instead of completed
    cart.status = 'pending';
    await cart.save();

    res.json({
      message: 'Checkout successful. Your order has been placed and is pending farmer confirmation.',
      trades,
      order: cart
    });
  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({ message: 'Failed to process checkout' });
  }
};

// Get customer trades
export const getTrades = async (req: any, res: any) => {
  try {
    const trades = await Trade.find({ buyer: req.user._id })
      .populate<{ product: PopulatedProduct }>('product', 'name price images')
      .populate<{ farmer: PopulatedFarmer }>('farmer', 'name location')
      .sort({ createdAt: -1 });

    // Format trades to ensure images are properly included
    const formattedTrades = trades.map((trade: PopulatedTrade) => ({
      _id: trade._id,
      product: {
        _id: trade.product._id,
        name: trade.product.name,
        price: trade.product.price,
        images: trade.product.images || []
      },
      farmer: {
        _id: trade.farmer._id,
        name: trade.farmer.name,
        location: trade.farmer.location
      },
      quantity: trade.quantity,
      amount: trade.amount,
      status: trade.status,
      createdAt: trade.createdAt
    }));

    res.json({ trades: formattedTrades });
  } catch (error) {
    console.error('Get Trades Error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
}; 