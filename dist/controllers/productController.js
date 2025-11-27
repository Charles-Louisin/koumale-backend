"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductReviews = exports.postProductReview = exports.incrementClicks = exports.deleteProduct = exports.updateProduct = exports.getProductById = exports.getProducts = exports.getCategories = exports.createProduct = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const Review_1 = __importDefault(require("../models/Review"));
const User_1 = require("../models/User");
// Créer un nouveau produit
const createProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        // Vérifier si l'utilisateur est un vendeur
        const vendor = await Vendor_1.default.findOne({ user: userId });
        if (!vendor) {
            res.status(403).json({ success: false, message: 'Accès non autorisé: profil vendeur requis' });
            return;
        }
        const { name, description, price, promotionalPrice, category, attributes, images } = req.body;
        // Validation du prix promotionnel
        if (promotionalPrice !== undefined && promotionalPrice !== null && promotionalPrice >= price) {
            res.status(400).json({ success: false, message: 'Le prix promotionnel doit être inférieur au prix normal' });
            return;
        }
        // Créer le produit
        const product = await Product_1.default.create({
            vendor: vendor._id,
            name,
            description,
            price,
            promotionalPrice,
            category,
            attributes: attributes || {},
            images: images || []
        });
        res.status(201).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.createProduct = createProduct;
// Récupérer toutes les catégories distinctes
const getCategories = async (req, res) => {
    try {
        const categories = await Product_1.default.distinct('category');
        res.status(200).json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getCategories = getCategories;
// Récupérer tous les produits (avec filtres optionnels)
const getProducts = async (req, res) => {
    try {
        const { category, vendorSlug, minPrice, maxPrice, q, promotion, ...attributes } = req.query;
        // Construire le filtre de recherche
        const filter = {};
        if (category)
            filter.category = category;
        const priceFilter = {};
        if (minPrice)
            priceFilter.$gte = Number(minPrice);
        if (maxPrice)
            priceFilter.$lte = Number(maxPrice);
        if (Object.keys(priceFilter).length > 0)
            filter.price = priceFilter;
        // Filtre pour les produits en promotion
        if (promotion === 'true') {
            filter.promotionalPrice = { $exists: true, $ne: null, $gt: 0 };
        }
        // Si un vendorSlug est fourni, récupérer l'ID du vendeur
        if (vendorSlug) {
            const vendor = await Vendor_1.default.findOne({ vendorSlug });
            if (vendor) {
                filter.vendor = vendor._id;
            }
            else {
                res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
                return;
            }
        }
        // Recherche plein texte simple sur le nom
        if (q && q.trim()) {
            filter.name = { $regex: q.trim(), $options: 'i' };
        }
        // Filtrer par attributs personnalisés
        Object.keys(attributes).forEach(key => {
            if (key !== 'page' && key !== 'limit') {
                filter[`attributes.${key}`] = attributes[key];
            }
        });
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Exécuter la requête
        const products = await Product_1.default.find(filter)
            .populate('vendor', 'businessName vendorSlug')
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
exports.getProducts = getProducts;
// Récupérer un produit par son ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findById(id).populate('vendor', 'businessName vendorSlug');
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        // Incrémenter le compteur de vues
        product.views += 1;
        await product.save();
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getProductById = getProductById;
// Mettre à jour un produit
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Récupérer le produit
        const product = await Product_1.default.findById(id);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        // Vérifier si l'utilisateur est le propriétaire du produit ou un admin
        if (userRole !== User_1.UserRole.SUPER_ADMIN) {
            const vendor = await Vendor_1.default.findOne({ user: userId });
            if (!vendor || !vendor._id.equals(product.vendor)) {
                res.status(403).json({ success: false, message: 'Accès non autorisé: vous n\'êtes pas le propriétaire de ce produit' });
                return;
            }
        }
        // Préparer les données de mise à jour
        const updateData = { ...req.body };
        // Si promotionalPrice est fourni et n'est pas vide, le convertir en nombre
        if (updateData.promotionalPrice !== undefined) {
            if (updateData.promotionalPrice === '' || updateData.promotionalPrice === null) {
                updateData.promotionalPrice = undefined; // Supprimer le champ
            }
            else {
                updateData.promotionalPrice = Number(updateData.promotionalPrice);
            }
        }
        // Validation du prix promotionnel
        const newPrice = updateData.price !== undefined ? updateData.price : product.price;
        if (updateData.promotionalPrice !== undefined && updateData.promotionalPrice !== null && updateData.promotionalPrice >= newPrice) {
            res.status(400).json({ success: false, message: 'Le prix promotionnel doit être inférieur au prix normal' });
            return;
        }
        // Mettre à jour le produit
        const updatedProduct = await Product_1.default.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        res.status(200).json({
            success: true,
            data: updatedProduct
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.updateProduct = updateProduct;
// Supprimer un produit
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Récupérer le produit
        const product = await Product_1.default.findById(id);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        // Vérifier si l'utilisateur est le propriétaire du produit ou un admin
        if (userRole !== User_1.UserRole.SUPER_ADMIN) {
            const vendor = await Vendor_1.default.findOne({ user: userId });
            if (!vendor || !vendor._id.equals(product.vendor)) {
                res.status(403).json({ success: false, message: 'Accès non autorisé: vous n\'êtes pas le propriétaire de ce produit' });
                return;
            }
        }
        // Supprimer le produit
        await Product_1.default.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Produit supprimé avec succès'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.deleteProduct = deleteProduct;
// Incrémenter le compteur de clics
const incrementClicks = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findById(id);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        // Incrémenter le compteur de clics
        product.clicks += 1;
        await product.save();
        res.status(200).json({
            success: true,
            clicks: product.clicks
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.incrementClicks = incrementClicks;
// POST review for product
const postProductReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: productId } = req.params;
        const { rating, comment } = req.body;
        // Validate input
        if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
            res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
            return;
        }
        // Check product exists
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        // Create review
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
        // Check product exists
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ success: false, message: 'Produit non trouvé' });
            return;
        }
        // Fetch reviews
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
