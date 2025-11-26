import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IVendor extends Document {
  user: IUser['_id'];
  vendorSlug: string;
  businessName: string;
  description: string;
  contactPhone: string;
  whatsappLink?: string;
  telegramLink?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logo?: string;
  coverImage?: string;
  documents?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vendorSlug: {
      type: String,
      required: [true, 'Slug du vendeur est requis'],
      unique: true,
      trim: true,
      lowercase: true
    },
    businessName: {
      type: String,
      required: [true, 'Nom de l\'entreprise est requis'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description est requise']
    },
    contactPhone: {
      type: String,
      required: [true, 'Numéro de téléphone est requis']
    },
    whatsappLink: {
      type: String
    },
    telegramLink: {
      type: String
    },
  address: {
    type: String
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  logo: {
    type: String
  },
  coverImage: {
    type: String
  },
    documents: {
      type: [String]
    }
  },
  { timestamps: true }
);

// Index pour optimiser les recherches par vendorSlug
VendorSchema.index({ vendorSlug: 1 });

export default mongoose.model<IVendor>('Vendor', VendorSchema);
