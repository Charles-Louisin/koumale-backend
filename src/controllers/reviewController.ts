import { Request, Response } from 'express';
import Product from '../models/Product';
import Vendor from '../models/Vendor';
import Review from '../models/Review';
import { notifyProductReview } from '../services/pushNotificationService';

// POST review for product
export const postProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { id: productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
      res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment: comment.trim()
    });

    // Notifier le vendeur du nouveau review (en arrière-plan)
    notifyProductReview(review, product).catch(err => 
      console.error('Erreur lors de l\'envoi de la notification review:', err)
    );

    res.status(201).json({ success: true, data: review });
  } catch (error) {
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

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

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
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// POST review for vendor
export const postVendorReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { slug } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
      res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
      return;
    }

    const vendor = await Vendor.findOne({ vendorSlug: slug });
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
      return;
    }

    const review = await Review.create({
      user: userId,
      vendor: vendor._id,
      rating,
      comment: comment.trim()
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// GET reviews for vendor with pagination
export const getVendorReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const vendor = await Vendor.findOne({ vendorSlug: slug });
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
      return;
    }

    const reviews = await Review.find({ vendor: vendor._id })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ vendor: vendor._id });

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
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// POST review for app
export const postAppReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !comment || comment.trim() === '') {
      res.status(400).json({ success: false, message: 'Note (1-5) et commentaire sont requis' });
      return;
    }

    const review = await Review.create({
      user: userId,
      type: 'app',
      rating,
      comment: comment.trim()
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// GET reviews for app with pagination
export const getAppReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ type: 'app' })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ type: 'app' });

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
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};
