import { Request, Response } from 'express';
import User, { UserRole, UserStatus } from '../models/User';
import Vendor from '../models/Vendor';
import Product from '../models/Product';

// GET /api/users
// Réservé aux super admins
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const q = (req.query.q as string | undefined)?.trim();

    const filter: Record<string, unknown> = {};
    if (role && Object.values<string>(UserRole as unknown as Record<string, string>).includes(role)) {
      filter.role = role;
    }
    if (status && Object.values<string>(UserStatus as unknown as Record<string, string>).includes(status)) {
      filter.status = status;
    }

    // Par défaut, exclure les super admins dans la liste
    if (!filter.role) {
      filter.role = { $ne: UserRole.SUPER_ADMIN };
    }

    const search: Record<string, unknown> = q ? {
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
      ]
    } : {};

    const finalFilter = Object.keys(search).length ? { $and: [filter, search] } : filter;

    // Utiliser l'agrégation pour inclure les informations de boutique pour les vendeurs
    const aggregationPipeline: any[] = [
      { $match: finalFilter },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: 'user',
          as: 'vendor'
        }
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          email: 1,
          firstName: 1,
          lastName: 1,
          role: 1,
          status: 1,
          createdAt: 1,
          vendor: {
            _id: '$vendor._id',
            businessName: '$vendor.businessName',
            vendorSlug: '$vendor.vendorSlug'
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [usersResult, total] = await Promise.all([
      User.aggregate(aggregationPipeline),
      User.countDocuments(finalFilter),
    ]);

    res.status(200).json({
      success: true,
      count: usersResult.length,
      total,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) },
      data: usersResult,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// DELETE /api/users/:userId
// Supprimer un utilisateur (réservé aux super admins)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }
    
    // Si c'est un vendeur, supprimer aussi sa boutique et ses produits
    if (user.role === UserRole.VENDOR) {
      const vendor = await Vendor.findOne({ user: user._id });
      if (vendor) {
        // Supprimer tous les produits du vendeur
        await Product.deleteMany({ vendor: vendor._id });
        // Supprimer le profil vendeur
        await Vendor.findByIdAndDelete(vendor._id);
      }
    }
    
    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};


