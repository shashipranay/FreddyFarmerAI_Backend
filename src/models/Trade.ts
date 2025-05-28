import mongoose, { Document, Schema } from 'mongoose';

export interface ITrade extends Document {
  farmer: mongoose.Types.ObjectId;
  buyer?: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const tradeSchema = new Schema<ITrade>({
  farmer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

export default mongoose.model<ITrade>('Trade', tradeSchema); 