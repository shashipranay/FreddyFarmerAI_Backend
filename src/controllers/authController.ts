import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../types';

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An error occurred during registration' });
    }
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();
    res.json({ user, token });
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(401).json({ error: 'Invalid login credentials' });
    }
  }
};

// Logout user
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.token) {
      throw new Error('User not authenticated');
    }
    req.user.tokens = req.user.tokens.filter(token => token.token !== req.token);
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
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    res.json(req.user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An error occurred while fetching profile' });
    }
  }
}; 