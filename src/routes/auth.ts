import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { register, login, registerVendor, getMe, approveVendor, rejectVendor, generateToken, verifyEmail, resendVerificationCode } from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import User, { IUser } from '../models/User';
import Vendor from '../models/Vendor';

const router = express.Router();

// Configuration Passport Google (toujours configurée pour le développement)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
  passReqToCallback: true
}, async (req: express.Request, accessToken: string, refreshToken: string, params: any, profile: Profile, done: (error: any, user?: any) => void) => {
  try {
    // Vérifier si l'utilisateur existe déjà
    let user = await User.findOne({ email: profile.emails?.[0].value });

    if (user) {
      // Utilisateur existe, mettre à jour les informations Google si nécessaire
      if (!user.googleId) {
        user.googleId = profile.id;
        user.firstName = user.firstName || profile.name?.givenName;
        user.lastName = user.lastName || profile.name?.familyName;
        await user.save();
      }
      return done(null, user);
    }

    // Créer un nouvel utilisateur
    user = await User.create({
      googleId: profile.id,
      email: profile.emails?.[0].value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      role: UserRole.CLIENT,
      status: 'approved'
    });

    return done(null, user);
  } catch (error) {
    return done(error as Error);
  }
}));

passport.serializeUser((user: any, done: (error: any, id?: any) => void) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: (error: Error | null, user?: IUser | null) => void) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error as Error);
  }
});

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/register-vendor', registerVendor);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);

// Routes Google OAuth (toujours disponibles pour le développement)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth/login' }), async (req: express.Request, res: express.Response) => {
  try {
    const user = req.user as IUser;
    const token = generateToken(user.id);

    // Rediriger vers le frontend avec le token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
  } catch (error) {
    res.redirect('/auth/login');
  }
});

// Vérifier la disponibilité du nom d'entreprise
router.post('/check-business-name', async (req: express.Request, res: express.Response) => {
  try {
    const { businessName } = req.body;

    if (!businessName || !businessName.trim()) {
      res.status(400).json({ success: false, message: 'Nom d\'entreprise requis' });
      return;
    }

    // Vérifier si un vendeur avec ce nom d'entreprise existe déjà (insensible à la casse)
    const existingVendor = await Vendor.findOne({
      businessName: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') }
    });

    if (existingVendor) {
      res.status(400).json({ success: false, message: 'Nom d\'entreprise déjà utilisé' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
});

// Routes protégées
router.get('/me', protect, getMe);
router.put('/approve-vendor/:userId', protect, authorize(UserRole.SUPER_ADMIN), approveVendor);
router.put('/reject-vendor/:userId', protect, authorize(UserRole.SUPER_ADMIN), rejectVendor);

export default router;
