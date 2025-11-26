import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IProduct } from './Product';
import { IVendor } from './Vendor';

export interface IReview extends Document {
  user: IUser['_id'];
  product?: IProduct['_id'];
  vendor?: IVendor['_id'];
  type?: 'app' | 'product' | 'vendor'; // Add type field for app reviews
  rating: number; // 1 to 5
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false,
    },
    type: {
      type: String,
      enum: ['app', 'product', 'vendor'],
      default: 'product',
      required: false,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index to optimize queries on product or vendor reviews
ReviewSchema.index({ product: 1 });
ReviewSchema.index({ vendor: 1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
