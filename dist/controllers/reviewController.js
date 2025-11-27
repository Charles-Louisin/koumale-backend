"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppReviews = exports.postAppReview = exports.getVendorReviews = exports.postVendorReview = exports.getProductReviews = exports.postProductReview = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const Review_1 = __importDefault(require("../models/Review"));
// POST review for product
const postProductReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: productId } = req.params;
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
            res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
            return;
        }
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        const review = await Review_1.default.create({
            user: userId,
            product: productId,
            rating,
            comment: comment.trim()
        });
        res.status(201).json({ success: true, data: review });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.postProductReview = postProductReview;
// GET reviews for product with pagination
const getProductReviews = async (req, res) => {
    try {
        const { id: productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        const reviews = await Review_1.default.find({ product: productId })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Review_1.default.countDocuments({ product: productId });
        res.status(200).json({
            success: true,
            count: reviews.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: reviews
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getProductReviews = getProductReviews;
// POST review for vendor
const postVendorReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { slug } = req.params;
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
            res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
            return;
        }
        const vendor = await Vendor_1.default.findOne({ vendorSlug: slug });
        if (!vendor) {
            res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
            return;
        }
        const review = await Review_1.default.create({
            user: userId,
            vendor: vendor._id,
            rating,
            comment: comment.trim()
        });
        res.status(201).json({ success: true, data: review });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.postVendorReview = postVendorReview;
// GET reviews for vendor with pagination
const getVendorReviews = async (req, res) => {
    try {
        const { slug } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const vendor = await Vendor_1.default.findOne({ vendorSlug: slug });
        if (!vendor) {
            res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
            return;
        }
        const reviews = await Review_1.default.find({ vendor: vendor._id })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Review_1.default.countDocuments({ vendor: vendor._id });
        res.status(200).json({
            success: true,
            count: reviews.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: reviews
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getVendorReviews = getVendorReviews;
// POST review for app
const postAppReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
            res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
            return;
        }
        const review = await Review_1.default.create({
            user: userId,
            type: 'app',
            rating,
            comment: comment.trim()
        });
        res.status(201).json({ success: true, data: review });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.postAppReview = postAppReview;
// GET reviews for app with pagination
const getAppReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const reviews = await Review_1.default.find({ type: 'app' })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Review_1.default.countDocuments({ type: 'app' });
        res.status(200).json({
            success: true,
            count: reviews.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: reviews
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getAppReviews = getAppReviews;
