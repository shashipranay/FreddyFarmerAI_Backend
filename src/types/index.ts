import { Request } from 'express';
import { Document } from 'mongoose';

export interface IToken {
  token: string;
}

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: 'farmer' | 'customer' | 'buyer';
  location?: string;
  tokens: IToken[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserModel extends Document {
  findByCredentials(email: string, password: string): Promise<IUser>;
}

export interface AuthRequest extends Request {
  user?: IUser & Document;
} 