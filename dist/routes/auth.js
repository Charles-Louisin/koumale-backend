"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const User_2 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Configuration Passport Google (toujours configurée pour le développement)
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, params, profile, done) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        // Vérifier si l'utilisateur existe déjà
        let user = await User_2.default.findOne({ email: (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value });
        if (user) {
            // Utilisateur existe, mettre à jour les informations Google si nécessaire
            if (!user.googleId) {
                user.googleId = profile.id;
                user.firstName = user.firstName || ((_b = profile.name) === null || _b === void 0 ? void 0 : _b.givenName);
                user.lastName = user.lastName || ((_c = profile.name) === null || _c === void 0 ? void 0 : _c.familyName);
                await user.save();
            }
            return done(null, user);
        }
        // Créer un nouvel utilisateur
        user = await User_2.default.create({
            googleId: profile.id,
            email: (_d = profile.emails) === null || _d === void 0 ? void 0 : _d[0].value,
            firstName: (_e = profile.name) === null || _e === void 0 ? void 0 : _e.givenName,
            lastName: (_f = profile.name) === null || _f === void 0 ? void 0 : _f.familyName,
            role: User_1.UserRole.CLIENT,
            status: 'approved'
        });
        return done(null, user);
    }
    catch (error) {
        return done(error);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_2.default.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
// Routes publiques
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/register-vendor', authController_1.registerVendor);
// Routes Google OAuth (toujours disponibles pour le développement)
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/auth/login' }), async (req, res) => {
    try {
        const user = req.user;
        const token = (0, authController_1.generateToken)(user.id);
        // Rediriger vers le frontend avec le token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
    }
    catch (error) {
        res.redirect('/auth/login');
    }
});
// Routes protégées
router.get('/me', auth_1.protect, authController_1.getMe);
router.put('/approve-vendor/:userId', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.SUPER_ADMIN), authController_1.approveVendor);
router.put('/reject-vendor/:userId', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.SUPER_ADMIN), authController_1.rejectVendor);
exports.default = router;
