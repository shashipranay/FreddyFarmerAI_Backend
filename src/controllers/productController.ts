import { Response } from 'express';
import { Product } from '../models/Product';
import { AuthRequest } from '../types';

// Create a new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const product = new Product({
      ...req.body,
      farmer: req.user._id
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An error occurred while creating product' });
    }
  }
};

// Get all products with filtering and pagination
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Fetching products with query:', req.query);
    
    const { 
      category, 
      minPrice, 
      maxPrice, 
      organic, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query: any = {};
    
    if (category) query.category = category;
    if (organic) query.organic = organic === 'true';
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    console.log('Sort options:', sort);

    const products = await Product.find(query)
      .populate('farmer', 'name email location')
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    console.log(`Found ${products.length} products`);

    const total = await Product.countDocuments(query);
    console.log('Total products:', total);

    res.json({
      products,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error in getProducts:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ error: 'An error occurred while fetching products' });
    }
  }
};

// Get a single product
export const getProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'name email location')
      .populate('reviews.user', 'name');
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An error occurred while fetching product' });
    }
  }
};

// Update a product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An error occurred while updating product' });
    }
  }
};

// Delete a product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An error occurred while deleting product' });
    }
  }
};

// Add a review to a product
export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const review = {
      user: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment
    };

    product.reviews.push(review);
    const totalRating = product.reviews.reduce((acc, item) => acc + (item.rating || 0), 0);
    product.rating = totalRating / product.reviews.length;
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An error occurred while adding review' });
    }
  }
}; 