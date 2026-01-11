import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IPushSubscription extends Document {
  user?: IUser['_id']; // Optional pour les utilisateurs non connectés
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    },
    userAgent: {
      type: String
    }
  },
  { timestamps: true }
);

// Index pour optimiser les recherches par utilisateur
PushSubscriptionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
