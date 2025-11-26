

import { Request, Response } from 'express';
import Vendor from '../models/Vendor';
import User, { UserRole, UserStatus } from '../models/User';
import Product from '../models/Product';
import { Types } from 'mongoose';

// Récupérer tous les vendeurs
export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Ne récupérer que les vendeurs approuvés
    const q = (req.query.q as string | undefined)?.trim();
    const textFilter: Record<string, unknown> = q ? {
      $or: [
        { businessName: { $regex: q, $options: 'i' } },
        { vendorSlug: { $regex: q, $options: 'i' } },
      ]
    } : {};

    const vendors = await Vendor.find(textFilter)
      .populate({
        path: 'user',
        select: 'status',
        match: { status: UserStatus.APPROVED }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Filtrer les vendeurs dont l'utilisateur n'est pas approuvé
    const approvedVendors = vendors.filter(vendor => vendor.user);
    
    const total = await Vendor.countDocuments({
      user: { $in: await User.find({ status: UserStatus.APPROVED, role: UserRole.VENDOR }).select('_id') }
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer les vendeurs en attente d'approbation (pour admin)
export const getPendingVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Récupérer les IDs des utilisateurs vendeurs en attente
    const pendingUserIds = await User.find({ 
      role: UserRole.VENDOR, 
      status: UserStatus.PENDING 
    }).select('_id');
    
    // Récupérer les vendeurs correspondants
    const q = (req.query.q as string | undefined)?.trim();
    const textFilter: Record<string, unknown> = q ? {
      $or: [
        { businessName: { $regex: q, $options: 'i' } },
        { vendorSlug: { $regex: q, $options: 'i' } },
      ]
    } : {};

    const vendors = await Vendor.find({ user: { $in: pendingUserIds }, ...textFilter })
      .populate('user', 'email status createdAt firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Vendor.countDocuments({ user: { $in: pendingUserIds }, ...textFilter });
    
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer un vendeur par son slug
export const getVendorBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const vendor = await Vendor.findOne({ vendorSlug: slug })
      .populate('user', 'email status');
    
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
      return;
    }
    
    // Vérifier si le vendeur est approuvé
    const user = vendor.user as { status: UserStatus };
    if (user.status !== UserStatus.APPROVED) {
      res.status(403).json({ success: false, message: 'Ce vendeur est en attente d\'approbation' });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Mettre à jour un profil vendeur
export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string, role?: UserRole } }).user.id;
    const userRole = (req as Request & { user: { id: string, role: UserRole } }).user.role;
    const { vendorId } = req.params;

    let vendor;

    if (vendorId && vendorId !== 'me') {
      // Route /:vendorId (pour admin)
      vendor = await Vendor.findById(vendorId);
    } else {
      // Route /me (pour vendeur)
      vendor = await Vendor.findOne({ user: userId });
    }

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est le propriétaire du profil ou un admin
    if (userRole !== UserRole.SUPER_ADMIN && !(vendor.user as Types.ObjectId).equals(userId)) {
      res.status(403).json({ success: false, message: 'Accès non autorisé: vous n\'êtes pas le propriétaire de ce profil' });
      return;
    }

    // Mettre à jour le profil
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendor._id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedVendor
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer les statistiques d'un vendeur
export const getVendorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string, role?: UserRole } }).user.id;
    
    // Récupérer le vendeur
    const vendor = await Vendor.findOne({ user: userId });
    
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Profil vendeur non trouvé' });
      return;
    }
    
    // Récupérer les statistiques
    const totalProducts = await Product.countDocuments({ vendor: vendor._id });
    const totalViews = await Product.aggregate([
      { $match: { vendor: vendor._id } },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalClicks = await Product.aggregate([
      { $match: { vendor: vendor._id } },
      { $group: { _id: null, total: { $sum: '$clicks' } } }
    ]);
    
    // Produits les plus vus
    const topProducts = await Product.find({ vendor: vendor._id })
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer les produits d'un vendeur
export const getVendorProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Récupérer le vendeur
    const vendor = await Vendor.findOne({ vendorSlug: slug });
    
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
      return;
    }
    
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Filtres optionnels
    const { category } = req.query;
    const filter: Record<string, unknown> = { vendor: vendor._id as Types.ObjectId };
    if (category) filter.category = category;
    
    // Récupérer les produits
    const products = await Product.find(filter)
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
