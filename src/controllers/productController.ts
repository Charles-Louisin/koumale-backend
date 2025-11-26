import { Request, Response } from 'express';
import Product from '../models/Product';
import Vendor from '../models/Vendor';
import Review from '../models/Review';
import { UserRole } from '../models/User';
import { Types } from 'mongoose';

// Créer un nouveau produit
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string, role?: UserRole } }).user.id;

    // Vérifier si l'utilisateur est un vendeur
    const vendor = await Vendor.findOne({ user: userId });
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
    const product = await Product.create({
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer toutes les catégories distinctes
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Product.distinct('category');

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer tous les produits (avec filtres optionnels)
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, vendorSlug, minPrice, maxPrice, q, promotion, ...attributes } = req.query as Record<string, string>;

    // Construire le filtre de recherche
    const filter: Record<string, unknown> = {};

    if (category) filter.category = category;
    const priceFilter: Record<string, number> = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);
    if (Object.keys(priceFilter).length > 0) filter.price = priceFilter;

    // Filtre pour les produits en promotion
    if (promotion === 'true') {
      filter.promotionalPrice = { $exists: true, $ne: null, $gt: 0 };
    }

    // Si un vendorSlug est fourni, récupérer l'ID du vendeur
    if (vendorSlug) {
      const vendor = await Vendor.findOne({ vendorSlug });
      if (vendor) {
        filter.vendor = vendor._id;
      } else {
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Exécuter la requête
    const products = await Product.find(filter)
      .populate('vendor', 'businessName vendorSlug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer un produit par son ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('vendor', 'businessName vendorSlug');

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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Mettre à jour un produit
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as Request & { user: { id: string, role?: UserRole } }).user.id;
    const userRole = (req as Request & { user: { id: string, role: UserRole } }).user.role;

    // Récupérer le produit
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est le propriétaire du produit ou un admin
    if (userRole !== UserRole.SUPER_ADMIN) {
      const vendor = await Vendor.findOne({ user: userId });

      if (!vendor || !(vendor._id as Types.ObjectId).equals(product.vendor as Types.ObjectId)) {
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
      } else {
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
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedProduct
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Supprimer un produit
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as Request & { user: { id: string, role?: UserRole } }).user.id;
    const userRole = (req as Request & { user: { id: string, role: UserRole } }).user.role;

    // Récupérer le produit
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est le propriétaire du produit ou un admin
    if (userRole !== UserRole.SUPER_ADMIN) {
      const vendor = await Vendor.findOne({ user: userId });

      if (!vendor || !(vendor._id as Types.ObjectId).equals(product.vendor as Types.ObjectId)) {
        res.status(403).json({ success: false, message: 'Accès non autorisé: vous n\'êtes pas le propriétaire de ce produit' });
        return;
      }
    }

    // Supprimer le produit
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Incrémenter le compteur de clics
export const incrementClicks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};





// POST review for product
export const postProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { id: productId } = req.params;
    const { rating, comment } = req.body;

    // Validate input
    if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
      res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
      return;
    }

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    // Create review
    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment: comment.trim()
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// GET reviews for product with pagination
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    // Fetch reviews
    const reviews = await Review.find({ product: productId })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ product: productId });

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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};
