import mongoose, { Document, Schema } from 'mongoose';
import { IProduct } from './Product';

export interface ICartItem extends Document {
  product: IProduct['_id'];
  quantity: number;
  selectedAttributes: Record<string, any>; // Selected product attributes/variants
  note: string; // Customer note for this item
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La quantité doit être d\'au moins 1'],
      default: 1
    },
    selectedAttributes: {
      type: Schema.Types.Mixed,
      default: {}
    },
    note: {
      type: String,
      default: '',
      maxlength: [500, 'La note ne peut pas dépasser 500 caractères']
    }
  },
  { timestamps: true }
);

export default mongoose.model<ICartItem>('CartItem', CartItemSchema);
