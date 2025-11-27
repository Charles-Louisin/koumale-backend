"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectVendor = exports.approveVendor = exports.getMe = exports.registerVendor = exports.login = exports.register = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importStar(require("../models/User"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const helpers_1 = require("../utils/helpers");
// Fonction pour générer un token JWT
const generateToken = (userId) => {
    const id = userId.toString(); // Convertir l'ObjectId en string si nécessaire
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};
exports.generateToken = generateToken;
// Inscription d'un utilisateur
const register = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName } = req.body;
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
            return;
        }
        // Créer un nouvel utilisateur
        const user = await User_1.default.create({
            email,
            password,
            firstName,
            lastName,
            role: role || User_1.UserRole.CLIENT,
            status: role === User_1.UserRole.VENDOR ? User_1.UserStatus.PENDING : User_1.UserStatus.APPROVED
        });
        // Générer un token
        const token = (0, exports.generateToken)(user._id);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.register = register;
// Connexion d'un utilisateur
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Vérifier si l'utilisateur existe
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect!' });
            return;
        }
        // Vérifier le mot de passe
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Les mots de passe ne correspondent pas!' });
            return;
        }
        // Vérifier si le compte est approuvé
        if (user.role === User_1.UserRole.VENDOR && user.status === User_1.UserStatus.PENDING) {
            res.status(403).json({
                success: false,
                message: 'Votre compte vendeur est toujours en attente de validation par un administrateur'
            });
            return;
        }
        // Générer un token
        const token = (0, exports.generateToken)(user._id);
        // Récupérer les informations du vendeur si c'est un vendeur
        let vendorInfo = null;
        if (user.role === User_1.UserRole.VENDOR) {
            vendorInfo = await Vendor_1.default.findOne({ user: user._id });
        }
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                vendor: vendorInfo
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.login = login;
// Inscription d'un vendeur
const registerVendor = async (req, res) => {
    try {
        const { email, password, firstName, lastName, businessName, description, contactPhone, whatsappLink, telegramLink, address, logo, coverImage, documents } = req.body;
        // Vérifier si un utilisateur avec cet email existe déjà
        let user = await User_1.default.findOne({ email }).select('+password');
        if (user) {
            // Si l'utilisateur existe déjà et est déjà vendeur
            if (user.role === User_1.UserRole.VENDOR) {
                res.status(400).json({ success: false, message: 'Cet utilisateur est déjà enregistré en tant que vendeur' });
                return;
            }
            // Mettre à jour le compte client existant pour devenir vendeur
            user.role = User_1.UserRole.VENDOR;
            user.status = User_1.UserStatus.PENDING;
            if (firstName)
                user.firstName = firstName;
            if (lastName)
                user.lastName = lastName;
            // Si un mot de passe est fourni lors de la conversion, le mettre à jour (le pre-save hachera)
            if (password)
                user.password = password;
            await user.save();
        }
        else {
            // Créer un nouvel utilisateur avec le rôle vendeur
            user = await User_1.default.create({
                email,
                password,
                firstName,
                lastName,
                role: User_1.UserRole.VENDOR,
                status: User_1.UserStatus.PENDING
            });
        }
        // Générer un slug unique à partir du nom de l'entreprise
        const vendorSlug = await (0, helpers_1.generateSlug)(businessName);
        // Créer ou mettre à jour le profil vendeur
        let vendor = await Vendor_1.default.findOne({ user: user._id });
        if (vendor) {
            vendor.vendorSlug = vendor.vendorSlug || vendorSlug;
            vendor.businessName = businessName || vendor.businessName;
            vendor.description = description || vendor.description;
            vendor.contactPhone = contactPhone || vendor.contactPhone;
            vendor.whatsappLink = whatsappLink || vendor.whatsappLink;
            vendor.telegramLink = telegramLink || vendor.telegramLink;
            vendor.address = address || vendor.address;
            vendor.logo = logo || vendor.logo;
            vendor.coverImage = coverImage || vendor.coverImage;
            vendor.documents = documents || vendor.documents;
            await vendor.save();
        }
        else {
            vendor = await Vendor_1.default.create({
                user: user._id,
                vendorSlug,
                businessName,
                description,
                contactPhone,
                whatsappLink,
                telegramLink,
                address,
                logo,
                coverImage,
                documents
            });
        }
        // Générer un token
        const token = (0, exports.generateToken)(user._id);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status
            },
            vendor
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.registerVendor = registerVendor;
// Récupérer le profil de l'utilisateur connecté
const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }
        // Récupérer les informations du vendeur si c'est un vendeur
        let vendorInfo = null;
        if (user.role === User_1.UserRole.VENDOR) {
            vendorInfo = await Vendor_1.default.findOne({ user: user._id });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                vendor: vendorInfo
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getMe = getMe;
// Approuver un vendeur (réservé aux super admin)
const approveVendor = async (req, res) => {
    try {
        const { userId } = req.params;
        // Vérifier si l'utilisateur existe
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }
        // Vérifier si l'utilisateur est un vendeur
        if (user.role !== User_1.UserRole.VENDOR) {
            res.status(400).json({ success: false, message: 'Cet utilisateur n\'est pas un vendeur' });
            return;
        }
        // Mettre à jour le statut
        user.status = User_1.UserStatus.APPROVED;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Vendeur approuvé avec succès',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.approveVendor = approveVendor;
// Rejeter une demande de vendeur (réservé aux super admin)
const rejectVendor = async (req, res) => {
    try {
        const { userId } = req.params;
        // Vérifier si l'utilisateur existe
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }
        // Vérifier si l'utilisateur est un vendeur en attente
        if (user.role !== User_1.UserRole.VENDOR || user.status !== User_1.UserStatus.PENDING) {
            res.status(400).json({ success: false, message: 'Cet utilisateur n\'est pas un vendeur en attente' });
            return;
        }
        // Supprimer le profil vendeur
        await Vendor_1.default.findOneAndDelete({ user: user._id });
        // Remettre le rôle à client
        user.role = User_1.UserRole.CLIENT;
        user.status = User_1.UserStatus.APPROVED;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Demande de vendeur rejetée avec succès',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.rejectVendor = rejectVendor;
