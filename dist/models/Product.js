"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProductSchema = new mongoose_1.Schema({
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: function (value) {
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
        type: mongoose_1.Schema.Types.Mixed,
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
}, { timestamps: true });
// Index pour optimiser les recherches par vendeur et catégorie
ProductSchema.index({ vendor: 1, category: 1 });
exports.default = mongoose_1.default.model('Product', ProductSchema);
