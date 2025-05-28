import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';
import Expense from '../models/Expense';
import { Product } from '../models/Product';
import Trade from '../models/Trade';

// Initialize Gemini AI with explicit API key check
const apiKey = process.env.GEMINI_API_KEY;
console.log('FarmerController - Gemini API Key available:', !!apiKey);
console.log('FarmerController - Gemini API Key length:', apiKey?.length);

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI?.getGenerativeModel({ model: "gemini-2.0-flash" });
console.log('FarmerController - Gemini client initialized:', !!model);

// Type guard function to check if Gemini is initialized
function isGeminiAvailable(client: GoogleGenerativeAI | null): client is GoogleGenerativeAI {
  const isAvailable = client !== null;
  console.log('FarmerController - Gemini client available:', isAvailable);
  return isAvailable;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Expense Controllers
export const addExpense = async (req: Request, res: Response) => {
  try {
    const expense = new Expense({
      ...req.body,
      farmer: req.user._id
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add expense' });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await Expense.find({ farmer: req.user._id });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      req.body,
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id
    });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Trade Controllers
export const getTrades = async (req: Request, res: Response) => {
  try {
    const trades = await Trade.find({ farmer: req.user._id })
      .populate('product')
      .populate('buyer', 'name email');
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
};

export const updateTradeStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const tradeId = req.params.id;

    // Find the trade and ensure it belongs to the farmer
    const trade = await Trade.findOne({ _id: tradeId, farmer: req.user._id })
      .populate('product');

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // If changing to completed, verify stock availability
    if (status === 'completed' && trade.status !== 'completed') {
      const product = await Product.findById(trade.product);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Verify stock is still available
      if (product.stock < trade.quantity) {
        return res.status(400).json({ 
          error: 'Insufficient stock to complete trade',
          available: product.stock,
          required: trade.quantity
        });
      }
    }

    // If changing from completed to another status, restore stock
    if (trade.status === 'completed' && status !== 'completed') {
      const product = await Product.findById(trade.product);
      if (product) {
        product.stock += trade.quantity;
        await product.save();
      }
    }

    // Update trade status
    trade.status = status;
    await trade.save();

    // If completing the trade, update analytics
    if (status === 'completed') {
      // You could add additional logic here for analytics or notifications
    }

    res.json(trade);
  } catch (error) {
    console.error('Update Trade Status Error:', error);
    res.status(400).json({ error: 'Failed to update trade status' });
  }
};

export const createTrade = async (req: Request, res: Response) => {
  try {
    const { product, quantity, amount, buyer } = req.body;

    // Validate required fields
    if (!product || !quantity || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          product: !product ? 'Product ID is required' : null,
          quantity: !quantity ? 'Quantity is required' : null,
          amount: !amount ? 'Amount is required' : null
        }
      });
    }

    // Validate numeric fields
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Check if product exists and has sufficient stock
    const productDoc = await Product.findOne({ _id: product, farmer: req.user._id });
    if (!productDoc) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (productDoc.stock < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available: productDoc.stock,
        requested: quantity
      });
    }

    // Create the trade
    const trade = new Trade({
      farmer: req.user._id,
      product,
      buyer,
      quantity,
      amount,
      status: 'pending'
    });

    await trade.save();

    // Update product stock
    productDoc.stock -= quantity;
    await productDoc.save();

    res.status(201).json(trade);
  } catch (error) {
    console.error('Create Trade Error:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
};

export const createTestTrades = async (req: Request, res: Response) => {
  try {
    const { count = 5 } = req.body;
    const farmerId = req.user._id;

    // Get all products for the farmer
    const products = await Product.find({ farmer: farmerId });
    if (products.length === 0) {
      return res.status(400).json({ error: 'No products available to create test trades' });
    }

    const trades = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // Select a random product
      const product = products[Math.floor(Math.random() * products.length)];
      
      // Generate random quantity (1-5)
      const quantity = Math.floor(Math.random() * 5) + 1;
      
      // Calculate amount based on product price
      const amount = product.price * quantity;

      // Generate random date within the last 30 days
      const tradeDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      const trade = new Trade({
        farmer: farmerId,
        product: product._id,
        quantity,
        amount,
        status: 'completed',
        createdAt: tradeDate,
        updatedAt: tradeDate
      });

      await trade.save();
      trades.push(trade);

      // Update product stock
      product.stock -= quantity;
      await product.save();
    }

    res.status(201).json({
      message: `Created ${trades.length} test trades`,
      trades
    });
  } catch (error) {
    console.error('Create Test Trades Error:', error);
    res.status(500).json({ error: 'Failed to create test trades' });
  }
};

// Analytics Controllers
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;
    const trades = await Trade.find({ farmer: req.user._id });
    
    // Calculate sales analytics based on period
    const analytics = calculateSalesAnalytics(trades, period as string);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
};

export const getInventoryAnalytics = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ farmer: req.user._id });
    const analytics = {
      totalProducts: products.length,
      lowStock: products.filter(p => p.stock < 10).length,
      outOfStock: products.filter(p => p.stock === 0).length,
      categories: calculateCategoryDistribution(products)
    };
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory analytics' });
  }
};

export const getExpenseAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;
    const expenses = await Expense.find({ farmer: req.user._id });
    
    // Calculate expense analytics based on period
    const analytics = calculateExpenseAnalytics(expenses, period as string);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense analytics' });
  }
};

// AI Analytics Controllers
export const getAIAnalytics = async (req: Request, res: Response) => {
  try {
    if (!isGeminiAvailable(genAI)) {
      return res.status(503).json({ error: 'AI services are not available. Please check your Gemini API key configuration.' });
    }

    const { period = 'monthly', metrics = ['sales', 'inventory', 'predictions'], filters } = req.body;

    // Get data based on filters
    const products = await Product.find({ farmer: req.user._id });
    const trades = await Trade.find({ farmer: req.user._id });
    const expenses = await Expense.find({ farmer: req.user._id });

    try {
      const analytics = await generateAIAnalytics([products, trades, expenses], period, metrics);
      res.json(analytics);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('overloaded')) {
          return res.status(503).json({ 
            error: 'The AI model is currently overloaded. Please try again in a few minutes.',
            retryAfter: 60 // Suggest retrying after 60 seconds
          });
        }
        if (error.message.includes('quota')) {
          return res.status(429).json({ 
            error: 'AI service quota exceeded. Please try again later.',
            retryAfter: 3600 // Suggest retrying after 1 hour
          });
        }
      }
      throw error; // Re-throw other errors to be caught by the outer catch block
    }
  } catch (error) {
    console.error('AI Analytics Error:', error);
    res.status(500).json({ error: 'Failed to generate AI analytics' });
  }
};

export const getProductRecommendations = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ farmer: req.user._id });
    const recommendations = await generateProductRecommendations(products);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate product recommendations' });
  }
};

export const getMarketInsights = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ farmer: req.user._id });
    const insights = await generateMarketInsights(products);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate market insights' });
  }
};

export const getAIPredictions = async (req: Request, res: Response) => {
  try {
    if (!isGeminiAvailable(genAI)) {
      return res.status(503).json({ error: 'AI services are not available. Please check your Gemini API key configuration.' });
    }

    const products = await Product.find({ farmer: req.user._id });
    const trades = await Trade.find({ farmer: req.user._id });
    const expenses = await Expense.find({ farmer: req.user._id });

    const prompt = `Based on the following data:
    Products: ${JSON.stringify(products)}
    Trades: ${JSON.stringify(trades)}
    Expenses: ${JSON.stringify(expenses)}
    Provide predictions for future sales, inventory needs, and potential expenses.`;

    const result = await model!.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      predictions: text
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
};

// Helper functions
function calculateSalesAnalytics(trades: any[], period: string) {
  // Implement sales analytics calculation logic
  return {
    totalSales: trades.reduce((sum, trade) => sum + trade.amount, 0),
    periodSales: [], // Implement period-based sales calculation
    topProducts: [] // Implement top products calculation
  };
}

// Helper function to calculate distribution by category
function calculateCategoryDistribution(items: any[], categoryPath?: string) {
  const distribution: { [key: string]: number } = {};
  
  items.forEach(item => {
    let category: string;
    
    if (categoryPath) {
      // For nested paths (e.g., 'product.category')
      category = categoryPath.split('.').reduce((obj, key) => obj?.[key], item);
    } else {
      // For direct category property
      category = item.category;
    }
    
    if (category) {
      distribution[category] = (distribution[category] || 0) + 1;
    }
  });
  
  return distribution;
}

function calculateExpenseAnalytics(expenses: any[], period: string) {
  // Implement expense analytics calculation logic
  return {
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    periodExpenses: [], // Implement period-based expenses calculation
    categoryExpenses: calculateCategoryDistribution(expenses) // Use the same function for expenses
  };
}

async function getFilteredData(filters: any) {
  // Implement data filtering logic
  return [];
}

async function generateAIAnalytics(data: any[], period: string, metrics: string[]) {
  try {
    if (!genAI || !model) {
      throw new Error('Gemini AI client not initialized');
    }

    const [products, trades, expenses] = data;
    
    // Calculate period-based date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Filter trades for the selected period
    const periodTrades = trades.filter((trade: any) => {
      const tradeDate = new Date(trade.createdAt);
      return tradeDate >= startDate && tradeDate <= now && trade.status === 'completed';
    });

    // Calculate total revenue from completed trades
    const totalRevenue = periodTrades.reduce((sum: number, trade: any) => sum + (trade.amount || 0), 0);

    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    switch (period) {
      case 'daily':
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'weekly':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate.setDate(previousEndDate.getDate() - 7);
        break;
      case 'monthly':
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate.setMonth(previousEndDate.getMonth() - 1);
        break;
      case 'yearly':
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
        break;
    }

    const previousPeriodTrades = trades.filter((trade: any) => {
      const tradeDate = new Date(trade.createdAt);
      return tradeDate >= previousStartDate && tradeDate <= previousEndDate && trade.status === 'completed';
    });

    const previousRevenue = previousPeriodTrades.reduce((sum: number, trade: any) => sum + (trade.amount || 0), 0);
    
    // Calculate revenue change percentage
    const revenueChange = previousRevenue === 0 ? 100 : ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    
    // Prepare data for analysis
    const analysisData = {
      period,
      metrics,
      summary: {
        totalProducts: products.length,
        totalRevenue,
        revenueChange: Math.round(revenueChange * 100) / 100, // Round to 2 decimal places
        totalExpenses: expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
        lowStockProducts: products.filter((p: any) => p.stock < 10).length,
        organicProducts: products.filter((p: any) => p.organic).length
      },
      trends: {
        salesByCategory: calculateCategoryDistribution(periodTrades, 'product.category'),
        expensesByCategory: calculateCategoryDistribution(expenses, 'category'),
        stockLevels: products.map((p: any) => ({
          name: p.name,
          stock: p.stock,
          category: p.category
        }))
      }
    };

    const prompt = `Analyze the following agricultural business data for period ${period} focusing on ${metrics.join(', ')}:
    ${JSON.stringify(analysisData, null, 2)}
    
    Provide detailed insights, trends, and recommendations based on this data.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        insights: text,
        summary: analysisData.summary,
        trends: analysisData.trends,
        period,
        metrics
      };
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      if (geminiError instanceof Error) {
        if (geminiError.message.includes('quota')) {
          throw new Error('Gemini API quota exceeded');
        }
        if (geminiError.message.includes('API key')) {
          throw new Error('Invalid Gemini API key');
        }
        if (geminiError.message.includes('overloaded') || geminiError.message.includes('Service Unavailable')) {
          throw new Error('The AI model is currently overloaded. Please try again in a few minutes.');
        }
      }
      throw new Error('Failed to generate content with Gemini AI');
    }
  } catch (error) {
    console.error('Generate AI Analytics Error:', error);
    throw error;
  }
}

async function generateProductRecommendations(products: any[]) {
  try {
    if (!isGeminiAvailable(genAI)) {
      throw new Error('AI services are not available');
    }

    const prompt = `Based on the following products: ${JSON.stringify(products)}, provide recommendations for new products or improvements.`;
    
    const result = await model!.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      recommendations: text
    };
  } catch (error) {
    throw new Error('Failed to generate product recommendations');
  }
}

async function generateMarketInsights(products: any[]) {
  try {
    if (!isGeminiAvailable(genAI)) {
      throw new Error('AI services are not available');
    }

    const prompt = `Based on the following products: ${JSON.stringify(products)}, provide market insights and trends.`;
    
    const result = await model!.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      insights: text
    };
  } catch (error) {
    throw new Error('Failed to generate market insights');
  }
} 