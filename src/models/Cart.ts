import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { ICartItem } from './CartItem';

export interface ICart extends Document {
  user: IUser['_id'];
  items: ICartItem['_id'][];
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // Un seul panier par utilisateur
    },
    items: [{
      type: Schema.Types.ObjectId,
      ref: 'CartItem'
    }]
  },
  { timestamps: true }
);

export default mongoose.model<ICart>('Cart', CartSchema);

