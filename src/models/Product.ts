import mongoose, { Document, Schema } from 'mongoose';
import { IVendor } from './Vendor';

export interface IProduct extends Document {
  vendor: IVendor['_id'];
  name: string;
  description: string;
  price: number;
  promotionalPrice?: number; // Prix promotionnel optionnel
  category: string;
  attributes: Record<string, unknown>; // Champs dynamiques standards + personnalisés
  images: string[];
  isActive: boolean;
  views: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Nom du produit est requis'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description est requise']
    },
    price: {
      type: Number,
      required: [true, 'Prix est requis'],
      min: [0, 'Le prix ne peut pas être négatif']
    },
    promotionalPrice: {
      type: Number,
      min: [0, 'Le prix promotionnel ne peut pas être négatif'],
      validate: {
        validator: function (this: IProduct, value: number) {
          return value < this.price;
        },
        message: 'Le prix promotionnel doit être inférieur au prix normal'
      }
    },
    category: {
      type: String,
      required: [true, 'Catégorie est requise'],
      index: true
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: {}
    },
    images: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index pour optimiser les recherches par vendeur et catégorie
ProductSchema.index({ vendor: 1, category: 1 });

// Index de recherche textuelle pour le nom du produit
ProductSchema.index({ name: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
