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

// Récupérer toutes les catégories prédéfinies
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = [
      "Électronique",
      "Téléphones & Tablettes",
      "Ordinateurs & Accessoires",
      "TV & Audio",
      "Appareils Photo & Caméras",
      "Gaming & Consoles",
      "Vêtements",
      "Mode Femme",
      "Mode Homme",
      "Chaussures",
      "Accessoires Mode",
      "Maison & Jardin",
      "Meubles",
      "Décoration",
      "Électroménager",
      "Bricolage",
      "Beauté & Santé",
      "Parfums & Cosmétiques",
      "Soins du Corps",
      "Cheveux & Ongles",
      "Santé & Bien-être",
      "Alimentation",
      "Épicerie",
      "Boissons",
      "Produits Bio",
      "Sports & Loisirs",
      "Équipement Sportif",
      "Vélo & Moto",
      "Camping & Randonnée",
      "Jouets & Jeux",
      "Livres & Médias",
      "Livres",
      "Musique & Films",
      "Jeux Vidéo",
      "Auto & Moto",
      "Pièces Auto",
      "Accessoires Auto",
      "Équipement Moto",
      "Bébé & Enfant",
      "Vêtements Bébé",
      "Puériculture",
      "Jouets Enfant",
      "Animaux",
      "Alimentation Animaux",
      "Accessoires Animaux",
      "Jardinage",
      "Outils & Matériel",
      "Semences & Plantes",
      "Autres"
    ];

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
    const { category, vendorSlug, minPrice, maxPrice, q, promotion, address, minRating, isNew, ...attributes } = req.query as Record<string, string>;

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

    // Filtre pour les produits nouveaux
    if (isNew) {
      const now = new Date();
      let dateFilter: Date;

      switch (isNew) {
        case '1week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          dateFilter = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 1 month
      }

      filter.createdAt = { $gte: dateFilter };
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

    // Recherche flexible sur le nom (supporte les accents et les approximations)
    if (q && q.trim()) {
      const normalizedQuery = q.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9\s]/g, ' ') // Remplacer les caractères spéciaux par des espaces
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();

      // Créer une regex flexible qui accepte les approximations
      const words = normalizedQuery.split(' ').filter(word => word.length > 0);
      const regexPatterns = words.map(word => {
        // Pour chaque mot, créer un pattern qui accepte des variations
        return new RegExp(word.split('').join('.*'), 'i');
      });

      // Recherche sur le nom normalisé et le nom original
      filter.$or = [
        { name: { $regex: regexPatterns.map(r => r.source).join('.*'), $options: 'i' } },
        { name: { $regex: normalizedQuery.split('').join('.*'), $options: 'i' } }
      ];
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

    // Préparer la requête d'agrégation pour inclure les filtres avancés
    const aggregationPipeline: any[] = [
      // Étape 1: Filtrer les produits de base
      { $match: filter },

      // Étape 2: Joindre avec les vendeurs pour les filtres d'adresse
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },

      // Étape 3: Filtrer par adresse si fourni
      ...(address ? [{
        $match: {
          'vendor.address': { $regex: address, $options: 'i' }
        }
      }] : []),

      // Étape 4: Joindre avec les avis pour calculer la note moyenne
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'product',
          as: 'reviews'
        }
      },

      // Étape 5: Calculer la note moyenne et filtrer par note minimale si fourni
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

      // Étape 6: Filtrer par note minimale si fourni
      ...(minRating ? [{
        $match: {
          averageRating: { $gte: Number(minRating) }
        }
      }] : []),

      // Étape 7: Projeter les champs nécessaires
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
          vendor: {
            businessName: '$vendor.businessName',
            vendorSlug: '$vendor.vendorSlug',
            address: '$vendor.address'
          },
          averageRating: 1,
          reviewCount: 1
        }
      },

      // Étape 8: Trier par date de création décroissante
      { $sort: { createdAt: -1 } },

      // Étape 9: Pagination
      { $skip: skip },
      { $limit: limit }
    ];

    // Compter le nombre total de documents (avec les mêmes filtres)
    const countPipeline = [
      // Même étapes que ci-dessus mais sans $skip, $limit et $project
      { $match: filter },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      ...(address ? [{
        $match: {
          'vendor.address': { $regex: address, $options: 'i' }
        }
      }] : []),
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'product',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $avg: '$reviews.rating' },
              else: 0
            }
          }
        }
      },
      ...(minRating ? [{
        $match: {
          averageRating: { $gte: Number(minRating) }
        }
      }] : []),
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

// Récupérer un produit par son ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Utiliser l'agrégation pour inclure les avis et calculer la note moyenne
    const product = await Product.aggregate([
      // Étape 1: Filtrer par ID
      { $match: { _id: new Types.ObjectId(id) } },

      // Étape 2: Joindre avec les vendeurs
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },

      // Étape 3: Joindre avec les avis pour calculer la note moyenne
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'product',
          as: 'reviews'
        }
      },

      // Étape 4: Calculer la note moyenne
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

      // Étape 5: Projeter les champs nécessaires
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
          vendor: {
            businessName: '$vendor.businessName',
            vendorSlug: '$vendor.vendorSlug',
            address: '$vendor.address'
          },
          averageRating: 1,
          reviewCount: 1
        }
      }
    ]);

    if (!product || product.length === 0) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    const productData = product[0];

    // Incrémenter le compteur de vues
    await Product.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.status(200).json({
      success: true,
      data: productData
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
