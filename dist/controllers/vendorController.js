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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorProducts = exports.getVendorStats = exports.updateVendor = exports.getVendorBySlug = exports.getPendingVendors = exports.getVendors = void 0;
const Vendor_1 = __importDefault(require("../models/Vendor"));
const User_1 = __importStar(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
// Récupérer tous les vendeurs
const getVendors = async (req, res) => {
    var _a;
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Ne récupérer que les vendeurs approuvés
        const q = (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
        const textFilter = q ? {
            $or: [
                { businessName: { $regex: q, $options: 'i' } },
                { vendorSlug: { $regex: q, $options: 'i' } },
            ]
        } : {};
        const vendors = await Vendor_1.default.find(textFilter)
            .populate({
            path: 'user',
            select: 'status',
            match: { status: User_1.UserStatus.APPROVED }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        // Filtrer les vendeurs dont l'utilisateur n'est pas approuvé
        const approvedVendors = vendors.filter(vendor => vendor.user);
        const total = await Vendor_1.default.countDocuments({
            user: { $in: await User_1.default.find({ status: User_1.UserStatus.APPROVED, role: User_1.UserRole.VENDOR }).select('_id') }
        });
        res.status(200).json({
            success: true,
            count: approvedVendors.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: approvedVendors
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getVendors = getVendors;
// Récupérer les vendeurs en attente d'approbation (pour admin)
const getPendingVendors = async (req, res) => {
    var _a;
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Récupérer les IDs des utilisateurs vendeurs en attente
        const pendingUserIds = await User_1.default.find({
            role: User_1.UserRole.VENDOR,
            status: User_1.UserStatus.PENDING
        }).select('_id');
        // Récupérer les vendeurs correspondants
        const q = (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
        const textFilter = q ? {
            $or: [
                { businessName: { $regex: q, $options: 'i' } },
                { vendorSlug: { $regex: q, $options: 'i' } },
            ]
        } : {};
        const vendors = await Vendor_1.default.find({ user: { $in: pendingUserIds }, ...textFilter })
            .populate('user', 'email status createdAt firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Vendor_1.default.countDocuments({ user: { $in: pendingUserIds }, ...textFilter });
        res.status(200).json({
            success: true,
            count: vendors.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: vendors
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getPendingVendors = getPendingVendors;
// Récupérer un vendeur par son slug
const getVendorBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const vendor = await Vendor_1.default.findOne({ vendorSlug: slug })
            .populate('user', 'email status');
        if (!vendor) {
            res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
            return;
        }
        // Vérifier si le vendeur est approuvé
        const user = vendor.user;
        if (user.status !== User_1.UserStatus.APPROVED) {
            res.status(403).json({ success: false, message: 'Ce vendeur est en attente d\'approbation' });
            return;
        }
        res.status(200).json({
            success: true,
            data: vendor
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getVendorBySlug = getVendorBySlug;
// Mettre à jour un profil vendeur
const updateVendor = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { vendorId } = req.params;
        let vendor;
        if (vendorId && vendorId !== 'me') {
            // Route /:vendorId (pour admin)
            vendor = await Vendor_1.default.findById(vendorId);
        }
        else {
            // Route /me (pour vendeur)
            vendor = await Vendor_1.default.findOne({ user: userId });
        }
        if (!vendor) {
            res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
            return;
        }
        // Vérifier si l'utilisateur est le propriétaire du profil ou un admin
        if (userRole !== User_1.UserRole.SUPER_ADMIN && !vendor.user.equals(userId)) {
            res.status(403).json({ success: false, message: 'Accès non autorisé: vous n\'êtes pas le propriétaire de ce profil' });
            return;
        }
        // Mettre à jour le profil
        const updatedVendor = await Vendor_1.default.findByIdAndUpdate(vendor._id, { $set: req.body }, { new: true, runValidators: true });
        res.status(200).json({
            success: true,
            data: updatedVendor
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.updateVendor = updateVendor;
// Récupérer les statistiques d'un vendeur
const getVendorStats = async (req, res) => {
    try {
        const userId = req.user.id;
        // Récupérer le vendeur
        const vendor = await Vendor_1.default.findOne({ user: userId });
        if (!vendor) {
            res.status(404).json({ success: false, message: 'Profil vendeur non trouvé' });
            return;
        }
        // Récupérer les statistiques
        const totalProducts = await Product_1.default.countDocuments({ vendor: vendor._id });
        const totalViews = await Product_1.default.aggregate([
            { $match: { vendor: vendor._id } },
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]);
        const totalClicks = await Product_1.default.aggregate([
            { $match: { vendor: vendor._id } },
            { $group: { _id: null, total: { $sum: '$clicks' } } }
        ]);
        // Produits les plus vus
        const topProducts = await Product_1.default.find({ vendor: vendor._id })
            .sort({ views: -1 })
            .limit(5)
            .select('name views clicks');
        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                totalViews: totalViews.length > 0 ? totalViews[0].total : 0,
                totalClicks: totalClicks.length > 0 ? totalClicks[0].total : 0,
                topProducts
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getVendorStats = getVendorStats;
// Récupérer les produits d'un vendeur
const getVendorProducts = async (req, res) => {
    try {
        const { slug } = req.params;
        // Récupérer le vendeur
        const vendor = await Vendor_1.default.findOne({ vendorSlug: slug });
        if (!vendor) {
            res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
            return;
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Filtres optionnels
        const { category } = req.query;
        const filter = { vendor: vendor._id };
        if (category)
            filter.category = category;
        // Récupérer les produits
        const products = await Product_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Product_1.default.countDocuments(filter);
        res.status(200).json({
            success: true,
            count: products.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: products
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getVendorProducts = getVendorProducts;
