import { Request } from 'express';
import { Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'farmer' | 'buyer' | 'admin';
  location: string;
  phone: string;
  tokens: Array<{ token: string }>;
  generateAuthToken(): Promise<string>;
}

export interface IUserModel extends Document {
  findByCredentials(email: string, password: string): Promise<IUser>;
}

export interface AuthRequest extends Request {
  user?: IUser;
  token?: string;
} 