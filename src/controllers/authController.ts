import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types';

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, location } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      location
    });

    await user.save();
    const token = await user.generateAuthToken();

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: 'Invalid login credentials' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token found');
    }
    req.user.tokens = req.user.tokens.filter((t: any) => t.token !== token);
    await req.user.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An error occurred during logout' });
    }
  }
};

// Get user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Verify token
export const verifyToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    res.json({ valid: true, user: req.user });
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ valid: false, error: error.message });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  }
}; 