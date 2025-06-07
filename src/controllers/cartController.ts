import { Request, Response } from 'express';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';

export const getCart = async (req: Request, res: Response) => {
  try {
    const cart = await Cart.findOne({ customer: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price image farmer'
      });

    if (!cart) {
      return res.json({ items: [], total: 0 });
    }

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      // Create new cart if it doesn't exist
      cart = new Cart({
        customer: req.user._id,
        items: [{ product: productId, quantity: 1 }],
        total: product.price
      });
    } else {
      // Check if product already exists in cart
      const existingItem = cart.items.find(
        item => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.items.push({ product: productId, quantity: 1 });
      }

      // Calculate new total
      const populatedCart = await cart.populate('items.product');
      cart.total = populatedCart.items.reduce((sum, item) => {
        const product = item.product as any;
        return sum + (product.price * item.quantity);
      }, 0);
    }

    await cart.save();

    // Populate product details before sending response
    await cart.populate({
      path: 'items.product',
      select: 'name price image farmer'
    });

    res.json(cart);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ customer: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;

    // Calculate new total
    const populatedCart = await cart.populate('items.product');
    cart.total = populatedCart.items.reduce((sum, item) => {
      const product = item.product as any;
      return sum + (product.price * item.quantity);
    }, 0);

    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name price image farmer'
    });

    res.json(cart);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Failed to update cart' });
  }
};

export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ customer: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    // Calculate new total
    const populatedCart = await cart.populate('items.product');
    cart.total = populatedCart.items.reduce((sum, item) => {
      const product = item.product as any;
      return sum + (product.price * item.quantity);
    }, 0);

    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name price image farmer'
    });

    res.json(cart);
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
}; 