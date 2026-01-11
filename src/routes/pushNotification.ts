import express from 'express';
import { getVAPIDKey, subscribe, unsubscribe } from '../controllers/pushNotificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Route publique pour obtenir la clé VAPID
router.get('/vapid-key', getVAPIDKey);

// Routes pour s'abonner/se désabonner (optionnellement protégées)
// L'abonnement peut se faire sans être connecté
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

export default router;
