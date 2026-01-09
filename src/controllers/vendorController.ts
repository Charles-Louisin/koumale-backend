

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

    // Filtres
    const q = (req.query.q as string | undefined)?.trim();
    const address = (req.query.address as string | undefined)?.trim();
    const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
    const sortBy = req.query.sortBy as string || 'newest';

    // Filtre de recherche textuelle
    const textFilter: Record<string, unknown> = q ? {
      $or: [
        { businessName: { $regex: q, $options: 'i' } },
        { vendorSlug: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ]
    } : {};

    // Filtre par adresse
    if (address) {
      textFilter.address = { $regex: address, $options: 'i' };
    }

    // Préparer la requête d'agrégation pour inclure les filtres avancés
    const aggregationPipeline: any[] = [
      // Étape 1: Filtrer les vendeurs de base
      { $match: textFilter },

      // Étape 2: Joindre avec les utilisateurs pour vérifier le statut approuvé
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },

      // Étape 3: Filtrer seulement les vendeurs approuvés
      { $match: { 'user.status': UserStatus.APPROVED, 'user.role': UserRole.VENDOR } },

      // Étape 4: Joindre avec les produits du vendeur
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendor',
          as: 'products'
        }
      },

      // Étape 5: Joindre avec les avis des produits pour calculer la note moyenne
      {
        $lookup: {
          from: 'reviews',
          let: { productIds: '$products._id' },
          pipeline: [
            { $match: { $expr: { $in: ['$product', '$$productIds'] } } }
          ],
          as: 'productReviews'
        }
      },

      // Étape 6: Calculer la note moyenne des produits et compter les produits
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$productReviews' }, 0] },
              then: { $avg: '$productReviews.rating' },
              else: null
            }
          },
          reviewCount: {
            $cond: {
              if: { $gt: [{ $size: '$productReviews' }, 0] },
              then: { $size: '$productReviews' },
              else: null
            }
          },
          productCount: { $size: '$products' }
        }
      },

      // Étape 6: Filtrer par note minimale si fourni
      ...(minRating ? [{
        $match: {
          averageRating: { $gte: minRating }
        }
      }] : []),

      // Étape 7: Projeter les champs nécessaires
      {
        $project: {
          vendorSlug: 1,
          businessName: 1,
          description: 1,
          contactPhone: 1,
          whatsappLink: 1,
          telegramLink: 1,
          address: 1,
          latitude: 1,
          longitude: 1,
          logo: 1,
          coverImage: 1,
          documents: 1,
          createdAt: 1,
          averageRating: 1,
          reviewCount: 1,
          productCount: 1,
          user: {
            _id: '$user._id',
            email: '$user.email',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            status: '$user.status'
          }
        }
      },

      // Étape 8: Trier selon le critère demandé
      sortBy === 'popular' ? { $sort: { reviewCount: -1, averageRating: -1, productCount: -1 } } : { $sort: { createdAt: -1 } },

      // Étape 9: Pagination
      { $skip: skip },
      { $limit: limit }
    ];

    // Compter le nombre total de documents (avec les mêmes filtres)
    const countPipeline = [
      // Même étapes que ci-dessus mais sans $skip, $limit et $project
      { $match: textFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: { 'user.status': UserStatus.APPROVED, 'user.role': UserRole.VENDOR } },
      // Joindre avec les produits du vendeur
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendor',
          as: 'products'
        }
      },
      // Joindre avec les avis des produits pour calculer la note moyenne
      {
        $lookup: {
          from: 'reviews',
          let: { productIds: '$products._id' },
          pipeline: [
            { $match: { $expr: { $in: ['$product', '$$productIds'] } } }
          ],
          as: 'productReviews'
        }
      },
      // Calculer la note moyenne des produits
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$productReviews' }, 0] },
              then: { $avg: '$productReviews.rating' },
              else: null
            }
          }
        }
      },
      ...(minRating ? [{
        $match: {
          averageRating: { $gte: minRating }
        }
      }] : []),
      { $count: 'total' }
    ];

    // Exécuter les deux pipelines
    const [vendorsResult, countResult] = await Promise.all([
      Vendor.aggregate(aggregationPipeline),
      Vendor.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      count: vendorsResult.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: vendorsResult
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

    // Utiliser l'agrégation pour calculer la note moyenne
    const vendorResult = await Vendor.aggregate([
      // Étape 1: Filtrer le vendeur par slug
      { $match: { vendorSlug: slug } },

      // Étape 2: Joindre avec les utilisateurs pour vérifier le statut approuvé
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },

      // Étape 3: Filtrer seulement les vendeurs approuvés
      { $match: { 'user.status': UserStatus.APPROVED, 'user.role': UserRole.VENDOR } },

      // Étape 4: Joindre avec les produits du vendeur
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendor',
          as: 'products'
        }
      },

      // Étape 5: Joindre avec les avis des produits pour calculer la note moyenne
      {
        $lookup: {
          from: 'reviews',
          let: { productIds: '$products._id' },
          pipeline: [
            { $match: { $expr: { $in: ['$product', '$$productIds'] } } }
          ],
          as: 'productReviews'
        }
      },

      // Étape 6: Calculer la note moyenne des produits et compter les produits
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$productReviews' }, 0] },
              then: { $avg: '$productReviews.rating' },
              else: null
            }
          },
          reviewCount: { $size: '$productReviews' },
          productCount: { $size: '$products' }
        }
      },

      // Étape 7: Projeter les champs nécessaires
      {
        $project: {
          vendorSlug: 1,
          businessName: 1,
          description: 1,
          contactPhone: 1,
          whatsappLink: 1,
          telegramLink: 1,
          address: 1,
          latitude: 1,
          longitude: 1,
          logo: 1,
          coverImage: 1,
          documents: 1,
          createdAt: 1,
          averageRating: 1,
          reviewCount: 1,
          productCount: 1,
          user: {
            status: '$user.status',
            email: '$user.email'
          }
        }
      }
    ]);

    if (!vendorResult || vendorResult.length === 0) {
      res.status(404).json({ success: false, message: 'Vendeur non trouvé' });
      return;
    }

    const vendor = vendorResult[0];

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

// Supprimer un profil vendeur (par admin)
export const deleteVendorByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;
    
    // Récupérer le vendeur
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Boutique non trouvée' });
      return;
    }
    
    // Récupérer l'utilisateur
    const user = await User.findById(vendor.user);
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }
    
    // Supprimer tous les produits du vendeur
    await Product.deleteMany({ vendor: vendor._id });
    
    // Supprimer le profil vendeur
    await Vendor.findByIdAndDelete(vendor._id);
    
    // Remettre le rôle de l'utilisateur à client
    user.role = UserRole.CLIENT;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Boutique supprimée avec succès'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Supprimer un profil vendeur
export const deleteVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string, role?: UserRole } }).user.id;
    
    // Récupérer le vendeur
    const vendor = await Vendor.findOne({ user: userId });
    
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Profil vendeur non trouvé' });
      return;
    }
    
    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }
    
    // Supprimer tous les produits du vendeur
    await Product.deleteMany({ vendor: vendor._id });
    
    // Supprimer le profil vendeur
    await Vendor.findByIdAndDelete(vendor._id);
    
    // Remettre le rôle de l'utilisateur à client
    user.role = UserRole.CLIENT;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Boutique supprimée avec succès'
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

    // Préparer la requête d'agrégation pour inclure les avis
    const aggregationPipeline: any[] = [
      // Étape 1: Filtrer les produits de base
      { $match: filter },

      // Étape 2: Joindre avec les avis pour calculer la note moyenne
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'product',
          as: 'reviews'
        }
      },

      // Étape 3: Calculer la note moyenne et compter les avis
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $avg: '$reviews.rating' },
              else: 0
            }
          },
          reviewCount: { $size: '$reviews' }
        }
      },

      // Étape 4: Projeter les champs nécessaires
      {
        $project: {
          name: 1,
          description: 1,
          price: 1,
          promotionalPrice: 1,
          category: 1,
          attributes: 1,
          images: 1,
          isActive: 1,
          views: 1,
          clicks: 1,
          createdAt: 1,
          updatedAt: 1,
          averageRating: 1,
          reviewCount: 1
        }
      },

      // Étape 5: Trier par date de création décroissante
      { $sort: { createdAt: -1 } },

      // Étape 6: Pagination
      { $skip: skip },
      { $limit: limit }
    ];

    // Compter le nombre total de documents (avec les mêmes filtres)
    const countPipeline = [
      { $match: filter },
      { $count: 'total' }
    ];

    // Exécuter les deux pipelines
    const [productsResult, countResult] = await Promise.all([
      Product.aggregate(aggregationPipeline),
      Product.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      count: productsResult.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: productsResult
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};
