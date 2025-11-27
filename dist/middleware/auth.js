"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// Middleware pour protéger les routes
const protect = async (req, res, next) => {
    try {
        let token;
        // Vérifier si le token est présent dans les headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Vérifier si le token existe
        if (!token) {
            res.status(401).json({ success: false, message: 'Accès non autorisé, token manquant' });
            return;
        }
        try {
            // Vérifier le token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            // Récupérer l'utilisateur
            const user = await User_1.default.findById(decoded.id);
            if (!user) {
                res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
                return;
            }
            // Ajouter l'utilisateur à la requête
            req.user = user;
            next();
        }
        catch (error) {
            res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.protect = protect;
// Middleware pour restreindre l'accès selon le rôle
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Accès non autorisé, authentification requise' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Accès interdit: le rôle ${req.user.role} n'est pas autorisé à accéder à cette ressource`
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
