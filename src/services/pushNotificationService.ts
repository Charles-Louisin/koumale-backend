import webpush, { PushSubscription } from 'web-push';
import PushSubscriptionModel from '../models/PushSubscription';
import User, { UserRole } from '../models/User';
import Product from '../models/Product';
import Vendor from '../models/Vendor';

// Configuration des clés VAPID (à générer et stocker dans .env)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@koumale.com';

// Configurer web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  data?: Record<string, unknown>;
}

// Enregistrer une subscription push
export const registerPushSubscription = async (
  subscription: PushSubscription,
  userId?: string,
  userAgent?: string
): Promise<void> => {
  try {
    const endpoint = subscription.endpoint;
    
    // Vérifier si la subscription existe déjà
    const existingSubscription = await PushSubscriptionModel.findOne({ endpoint });
    
    if (existingSubscription) {
      // Mettre à jour la subscription existante
      existingSubscription.keys = subscription.keys as { p256dh: string; auth: string };
      if (userId) existingSubscription.user = userId as any;
      if (userAgent) existingSubscription.userAgent = userAgent;
      await existingSubscription.save();
    } else {
      // Créer une nouvelle subscription
      await PushSubscriptionModel.create({
        endpoint,
        keys: subscription.keys as { p256dh: string; auth: string },
        user: userId || undefined,
        userAgent
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la subscription push:', error);
    throw error;
  }
};

// Supprimer une subscription push
export const unregisterPushSubscription = async (endpoint: string): Promise<void> => {
  try {
    await PushSubscriptionModel.deleteOne({ endpoint });
  } catch (error) {
    console.error('Erreur lors de la suppression de la subscription push:', error);
    throw error;
  }
};

// Envoyer une notification à une subscription
export const sendNotificationToSubscription = async (
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<void> => {
  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      image: payload.image,
      data: {
        url: payload.url || '/',
        ...payload.data
      }
    });

    await webpush.sendNotification(subscription, notificationPayload);
  } catch (error: any) {
    // Si la subscription est invalide, la supprimer
    if (error.statusCode === 410 || error.statusCode === 404) {
      await PushSubscriptionModel.deleteOne({ endpoint: subscription.endpoint });
      console.log(`Subscription invalide supprimée: ${subscription.endpoint}`);
    } else {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  }
};

// Envoyer une notification à tous les utilisateurs (clients et non connectés)
export const notifyAllClients = async (payload: NotificationPayload): Promise<void> => {
  try {
    const subscriptions = await PushSubscriptionModel.find({
      $or: [
        { user: { $exists: false } }, // Non connectés
        { user: { $in: await User.find({ role: UserRole.CLIENT }).distinct('_id') } } // Clients
      ]
    });

    const promises = subscriptions.map(sub => {
      const pushSubscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };
      return sendNotificationToSubscription(pushSubscription, payload);
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications à tous les clients:', error);
  }
};

// Envoyer une notification aux vendeurs
export const notifyVendors = async (payload: NotificationPayload): Promise<void> => {
  try {
    const vendorUserIds = await User.find({ role: UserRole.VENDOR }).distinct('_id');
    const subscriptions = await PushSubscriptionModel.find({
      user: { $in: vendorUserIds }
    });

    const promises = subscriptions.map(sub => {
      const pushSubscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };
      return sendNotificationToSubscription(pushSubscription, payload);
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications aux vendeurs:', error);
  }
};

// Envoyer une notification aux admins
export const notifyAdmins = async (payload: NotificationPayload): Promise<void> => {
  try {
    const adminUserIds = await User.find({ role: UserRole.SUPER_ADMIN }).distinct('_id');
    const subscriptions = await PushSubscriptionModel.find({
      user: { $in: adminUserIds }
    });

    const promises = subscriptions.map(sub => {
      const pushSubscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };
      return sendNotificationToSubscription(pushSubscription, payload);
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications aux admins:', error);
  }
};

// Envoyer une notification à un utilisateur spécifique
export const notifyUser = async (userId: string, payload: NotificationPayload): Promise<void> => {
  try {
    const subscriptions = await PushSubscriptionModel.find({ user: userId });

    const promises = subscriptions.map(sub => {
      const pushSubscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };
      return sendNotificationToSubscription(pushSubscription, payload);
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de la notification à l'utilisateur ${userId}:`, error);
  }
};

// Notifier lors de la création d'une nouvelle boutique
export const notifyNewVendor = async (vendor: any): Promise<void> => {
  const payload: NotificationPayload = {
    title: 'Nouvelle boutique disponible ! 🏪',
    body: `${vendor.businessName} vient de rejoindre KOUMALE. Découvrez-la maintenant !`,
    url: `/vendor/${vendor.vendorSlug}`,
    data: {
      type: 'new_vendor',
      vendorId: vendor._id.toString()
    }
  };
  await notifyAllClients(payload);
  
  // Notifier aussi les admins
  const adminPayload: NotificationPayload = {
    title: 'Nouvelle boutique en attente de validation',
    body: `${vendor.businessName} attend votre validation`,
    url: `/dashboard/admin/vendors`,
    data: {
      type: 'vendor_pending_approval',
      vendorId: vendor._id.toString()
    }
  };
  await notifyAdmins(adminPayload);
};

// Notifier lors de la création d'un nouveau produit
export const notifyNewProduct = async (product: any): Promise<void> => {
  const vendor = await Vendor.findById(product.vendor).populate('user', 'email');
  if (!vendor) return;

  const vendorSlug = (vendor as any).vendorSlug;
  const productId = (product._id as any).toString();

  const payload: NotificationPayload = {
    title: 'Nouveau produit disponible ! 🎉',
    body: `${product.name} vient d'être ajouté par ${vendor.businessName}`,
    url: `/vendor/${vendorSlug}/product/${productId}`,
    data: {
      type: 'new_product',
      productId,
      vendorSlug
    }
  };
  await notifyAllClients(payload);
};

// Notifier lors de l'ajout d'une review sur un produit
export const notifyProductReview = async (review: any, product: any): Promise<void> => {
  const vendor = await Vendor.findById(product.vendor);
  if (!vendor) return;

  // Notifier le vendeur propriétaire du produit
  const vendorUser = vendor.user as any;
  const productId = (product._id as any).toString();
  const reviewId = (review._id as any).toString();
  
  const vendorSlug = (vendor as any).vendorSlug;
  const payload: NotificationPayload = {
    title: 'Nouvel avis sur votre produit ⭐',
    body: `${product.name} a reçu un avis ${review.rating}/5`,
    url: `/vendor/${vendorSlug}/product/${productId}`,
    data: {
      type: 'product_review',
      productId,
      vendorSlug,
      reviewId
    }
  };
  await notifyUser(vendorUser.toString(), payload);
};

// Notifier les produits en promotion (rappel)
export const notifyPromotionalProducts = async (): Promise<void> => {
  try {
    const promotionalProducts = await Product.find({
      promotionalPrice: { $exists: true, $ne: null },
      isActive: true
    }).limit(5).populate('vendor');

    if (promotionalProducts.length === 0) return;

    // Notifier le premier produit en promotion
    const product = promotionalProducts[0];
    const vendor = (product as any).vendor;
    const discount = Math.round(((product.price - (product.promotionalPrice || 0)) / product.price) * 100);
    const productId = (product._id as any).toString();
    const vendorSlug = vendor?.vendorSlug || '';
    
    const payload: NotificationPayload = {
      title: 'Promotion disponible ! 🎁',
      body: `${product.name} : -${discount}% de réduction ! Profitez-en maintenant`,
      url: vendorSlug ? `/vendor/${vendorSlug}/product/${productId}` : `/products`,
      data: {
        type: 'promotional_reminder',
        productId,
        vendorSlug
      }
    };
    await notifyAllClients(payload);
  } catch (error) {
    console.error('Erreur lors de la notification des produits promotionnels:', error);
  }
};

// Notifier les produits tendances
export const notifyTrendingProducts = async (): Promise<void> => {
  try {
    const trendingProducts = await Product.find({ isActive: true })
      .sort({ views: -1, clicks: -1 })
      .limit(3)
      .populate('vendor');

    if (trendingProducts.length === 0) return;

    const product = trendingProducts[0];
    const vendor = (product as any).vendor;
    const productId = (product._id as any).toString();
    const vendorSlug = vendor?.vendorSlug || '';
    
    const payload: NotificationPayload = {
      title: 'Produit tendance 🔥',
      body: `${product.name} est actuellement très populaire. Ne le manquez pas !`,
      url: vendorSlug ? `/vendor/${vendorSlug}/product/${productId}` : `/products`,
      data: {
        type: 'trending_product',
        productId,
        vendorSlug
      }
    };
    await notifyAllClients(payload);
  } catch (error) {
    console.error('Erreur lors de la notification des produits tendances:', error);
  }
};

// Notifier les boutiques populaires
export const notifyPopularVendors = async (): Promise<void> => {
  try {
    // Cette logique peut être améliorée avec des statistiques réelles
    const popularVendors = await Vendor.find().limit(1);

    if (popularVendors.length === 0) return;

    const vendor = popularVendors[0];
    const vendorId = (vendor._id as any).toString();
    const payload: NotificationPayload = {
      title: 'Boutique populaire 🏆',
      body: `${vendor.businessName} est une boutique très appréciée. Découvrez ses produits !`,
      url: `/vendor/${vendor.vendorSlug}`,
      data: {
        type: 'popular_vendor',
        vendorId
      }
    };
    await notifyAllClients(payload);
  } catch (error) {
    console.error('Erreur lors de la notification des boutiques populaires:', error);
  }
};

// Rappels pour les vendeurs : publier des produits
export const notifyVendorToPublishProducts = async (): Promise<void> => {
  try {
    const vendorsWithFewProducts = await Vendor.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendor',
          as: 'products'
        }
      },
      {
        $match: {
          'products': { $size: { $lt: 5 } } // Moins de 5 produits
        }
      }
    ]);

    for (const vendor of vendorsWithFewProducts) {
      const payload: NotificationPayload = {
        title: 'Boostez votre boutique ! 📈',
        body: `Ajoutez plus de produits pour attirer plus de clients sur ${vendor.businessName}`,
        url: `/dashboard/vendor/products`,
        data: {
          type: 'vendor_reminder_publish_products',
          vendorId: vendor._id.toString()
        }
      };
      await notifyUser(vendor.user.toString(), payload);
    }
  } catch (error) {
    console.error('Erreur lors de la notification des rappels vendeurs:', error);
  }
};

// Rappels pour les vendeurs : mettre des produits en promotion
export const notifyVendorToPromoteProducts = async (): Promise<void> => {
  try {
    const vendors = await Vendor.find();
    
    for (const vendor of vendors) {
      const productsWithoutPromotion = await Product.find({
        vendor: vendor._id,
        promotionalPrice: { $exists: false },
        isActive: true
      }).limit(1);

      if (productsWithoutPromotion.length > 0) {
        const vendorId = (vendor._id as any).toString();
        const vendorUserId = (vendor.user as any).toString();
        const payload: NotificationPayload = {
          title: 'Boostez vos ventes ! 💰',
          body: 'Mettez vos produits en promotion pour attirer plus de clients',
          url: `/dashboard/vendor/products`,
          data: {
            type: 'vendor_reminder_promote_products',
            vendorId
          }
        };
        await notifyUser(vendorUserId, payload);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la notification des rappels promotion:', error);
  }
};

// Notifier les admins : nouveau utilisateur inscrit
export const notifyAdminNewUser = async (user: any): Promise<void> => {
  const payload: NotificationPayload = {
    title: 'Nouvel utilisateur inscrit 👤',
    body: `${user.email} vient de s'inscrire sur KOUMALE`,
    url: `/dashboard/admin/users`,
    data: {
      type: 'new_user',
      userId: user._id.toString()
    }
  };
  await notifyAdmins(payload);
};

// Notifier les admins : boutique en attente de validation
export const notifyAdminVendorPending = async (vendor: any): Promise<void> => {
  const payload: NotificationPayload = {
    title: 'Boutique en attente de validation ⏳',
    body: `${vendor.businessName} attend votre validation`,
    url: `/dashboard/admin/vendors`,
    data: {
      type: 'vendor_pending_approval',
      vendorId: vendor._id.toString()
    }
  };
  await notifyAdmins(payload);
};

// Rappels pour les admins : boutiques avec peu de produits
export const notifyAdminVendorsWithFewProducts = async (): Promise<void> => {
  try {
    const vendorsWithFewProducts = await Vendor.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendor',
          as: 'products'
        }
      },
      {
        $match: {
          'products': { $size: { $lt: 3 } } // Moins de 3 produits
        }
      },
      {
        $limit: 5
      }
    ]);

    if (vendorsWithFewProducts.length > 0) {
      const payload: NotificationPayload = {
        title: 'Boutiques nécessitant de l\'attention 📊',
        body: `${vendorsWithFewProducts.length} boutique(s) ont peu de produits`,
        url: `/dashboard/admin/vendors`,
        data: {
          type: 'admin_reminder_few_products',
          count: vendorsWithFewProducts.length
        }
      };
      await notifyAdmins(payload);
    }
  } catch (error) {
    console.error('Erreur lors de la notification des boutiques avec peu de produits:', error);
  }
};

// Rappels pour les admins : produits avec peu de vues
export const notifyAdminProductsWithLowViews = async (): Promise<void> => {
  try {
    const productsWithLowViews = await Product.find({
      views: { $lt: 10 },
      isActive: true
    }).limit(10);

    if (productsWithLowViews.length > 0) {
      const payload: NotificationPayload = {
        title: 'Produits nécessitant de la visibilité 👁️',
        body: `${productsWithLowViews.length} produit(s) ont peu de vues`,
        url: `/dashboard/admin/products`,
        data: {
          type: 'admin_reminder_low_views',
          count: productsWithLowViews.length
        }
      };
      await notifyAdmins(payload);
    }
  } catch (error) {
    console.error('Erreur lors de la notification des produits avec peu de vues:', error);
  }
};

// Obtenir la clé publique VAPID
export const getVAPIDPublicKey = (): string => {
  return VAPID_PUBLIC_KEY;
};
