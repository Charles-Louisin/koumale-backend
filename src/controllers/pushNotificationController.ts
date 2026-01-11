import { Request, Response } from 'express';
import { PushSubscription } from 'web-push';
import {
  registerPushSubscription,
  unregisterPushSubscription,
  getVAPIDPublicKey
} from '../services/pushNotificationService';
import { protect } from '../middleware/auth';

// Obtenir la clé publique VAPID
export const getVAPIDKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const publicKey = getVAPIDPublicKey();
    if (!publicKey) {
      res.status(500).json({
        success: false,
        message: 'Configuration VAPID manquante'
      });
      return;
    }
    res.status(200).json({
      success: true,
      publicKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Enregistrer une subscription push
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscription = req.body.subscription as PushSubscription;
    const userAgent = req.headers['user-agent'];

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      res.status(400).json({
        success: false,
        message: 'Subscription invalide'
      });
      return;
    }

    // Obtenir l'ID de l'utilisateur s'il est connecté (optionnel)
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    await registerPushSubscription(subscription, userId, userAgent);

    res.status(200).json({
      success: true,
      message: 'Subscription enregistrée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la subscription:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Se désabonner des notifications push
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({
        success: false,
        message: 'Endpoint requis'
      });
      return;
    }

    await unregisterPushSubscription(endpoint);

    res.status(200).json({
      success: true,
      message: 'Désabonnement réussi'
    });
  } catch (error) {
    console.error('Erreur lors du désabonnement:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};
