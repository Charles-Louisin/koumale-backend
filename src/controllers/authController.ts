import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import User, { UserRole, UserStatus } from '../models/User';
import Vendor from '../models/Vendor';
import { generateSlug } from '../utils/helpers';
import { sendVerificationEmail } from '../utils/emailService';

// Fonction pour générer un token JWT
export const generateToken = (userId: string | mongoose.Types.ObjectId): string => {
  const id = userId.toString(); // Convertir l'ObjectId en string si nécessaire
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  } as jwt.SignOptions);
};

// Inscription d'un utilisateur
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
      return;
    }

    // Générer un code de vérification
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Créer un nouvel utilisateur
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || UserRole.CLIENT,
      status: role === UserRole.VENDOR ? UserStatus.PENDING : UserStatus.APPROVED,
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires
    });

    // Envoyer l'email de vérification
    try {
      await sendVerificationEmail(user.email, verificationCode);
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
      // Ne pas échouer l'inscription si l'email ne peut pas être envoyé
    }

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Vérifiez votre email pour le code de vérification.',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Connexion d'un utilisateur
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }).select('+password');
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

    // Vérifier si l'email est vérifié
    if (!user.isEmailVerified) {
      res.status(403).json({
        success: false,
        message: 'Veuillez vérifier votre email avant de vous connecter.',
        requiresEmailVerification: true,
        email: user.email
      });
      return;
    }

    // Vérifier si le compte est approuvé
    if (user.role === UserRole.VENDOR && user.status === UserStatus.PENDING) {
      res.status(403).json({
        success: false,
        message: 'Votre compte vendeur est toujours en attente de validation par un administrateur'
      });
      return;
    }

    // Générer un token
    const token = generateToken(user._id as Types.ObjectId);

    // Récupérer les informations du vendeur si c'est un vendeur
    let vendorInfo = null;
    if (user.role === UserRole.VENDOR) {
      vendorInfo = await Vendor.findOne({ user: user._id });
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Inscription d'un vendeur
export const registerVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      businessName,
      description,
      contactPhone,
      whatsappLink,
      telegramLink,
      address,
      logo,
      coverImage,
      documents
    } = req.body;

    // Vérifier si un vendeur avec ce nom d'entreprise existe déjà (insensible à la casse)
    const existingVendor = await Vendor.findOne({
      businessName: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') }
    });
    if (existingVendor) {
      res.status(400).json({ success: false, message: 'Un vendeur avec ce nom d\'entreprise existe déjà' });
      return;
    }

    // Vérifier si un utilisateur avec cet email existe déjà
    let user = await User.findOne({ email }).select('+password');

    if (user) {
      // Si l'utilisateur existe déjà et est déjà vendeur
      if (user.role === UserRole.VENDOR) {
        res.status(400).json({ success: false, message: 'Cet utilisateur est déjà enregistré en tant que vendeur' });
        return;
      }

      // Vérifier si l'email est vérifié pour les utilisateurs existants
      if (!user.isEmailVerified) {
        res.status(403).json({ success: false, message: 'Veuillez vérifier votre email avant de créer un compte vendeur.' });
        return;
      }

      // Mettre à jour le compte client existant pour devenir vendeur
      user.role = UserRole.VENDOR;
      user.status = UserStatus.PENDING;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      // Si un mot de passe est fourni lors de la conversion, le mettre à jour (le pre-save hachera)
      if (password) user.password = password;
      await user.save();
    } else {
      // Créer un nouvel utilisateur avec le rôle vendeur (sans profil vendeur pour l'instant)
      user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role: UserRole.VENDOR,
        status: UserStatus.PENDING,
        isEmailVerified: false,
        emailVerificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // Envoyer l'email de vérification
      try {
        await sendVerificationEmail(user.email, user.emailVerificationCode!);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
        // Ne pas échouer l'inscription si l'email ne peut pas être envoyé
      }

      // Retourner un message indiquant que la vérification email est requise
      res.status(201).json({
        success: true,
        message: 'Inscription initiée. Vérifiez votre email pour le code de vérification avant de continuer.',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified
        },
        requiresEmailVerification: true
      });
      return;
    }

    // Générer un slug unique à partir du nom de l'entreprise
    const vendorSlug = await generateSlug(businessName);

    // Créer ou mettre à jour le profil vendeur
    let vendor = await Vendor.findOne({ user: user._id });
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
    } else {
      vendor = await Vendor.create({
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
    const token = generateToken(user._id as Types.ObjectId);

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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Récupérer le profil de l'utilisateur connecté
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    // Récupérer les informations du vendeur si c'est un vendeur
    let vendorInfo = null;
    if (user.role === UserRole.VENDOR) {
      vendorInfo = await Vendor.findOne({ user: user._id });
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Approuver un vendeur (réservé aux super admin)
export const approveVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est un vendeur
    if (user.role !== UserRole.VENDOR) {
      res.status(400).json({ success: false, message: 'Cet utilisateur n\'est pas un vendeur' });
      return;
    }

    // Mettre à jour le statut
    user.status = UserStatus.APPROVED;
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Rejeter une demande de vendeur (réservé aux super admin)
export const rejectVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est un vendeur en attente
    if (user.role !== UserRole.VENDOR || user.status !== UserStatus.PENDING) {
      res.status(400).json({ success: false, message: 'Cet utilisateur n\'est pas un vendeur en attente' });
      return;
    }

    // Supprimer le profil vendeur
    await Vendor.findOneAndDelete({ user: user._id });

    // Remettre le rôle à client
    user.role = UserRole.CLIENT;
    user.status = UserStatus.APPROVED;
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Vérifier l'email avec le code de vérification
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ success: false, message: 'Code de vérification requis' });
      return;
    }

    // Trouver l'utilisateur par code de vérification
    const user = await User.findOne({
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Code de vérification invalide ou expiré' });
      return;
    }

    // Vérifier si l'email est déjà vérifié
    if (user.isEmailVerified) {
      res.status(400).json({ success: false, message: 'Email déjà vérifié' });
      return;
    }

    // Marquer l'email comme vérifié et nettoyer les champs de vérification
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Générer un token pour connecter automatiquement l'utilisateur
    const token = generateToken(user._id as Types.ObjectId);

    // Récupérer les informations du vendeur si c'est un vendeur
    let vendorInfo = null;
    if (user.role === UserRole.VENDOR) {
      vendorInfo = await Vendor.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès',
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};

// Renvoyer le code de vérification
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email requis' });
      return;
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    // Vérifier si l'email est déjà vérifié
    if (user.isEmailVerified) {
      res.status(400).json({ success: false, message: 'Email déjà vérifié' });
      return;
    }

    // Générer un nouveau code de vérification
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Mettre à jour l'utilisateur
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Envoyer l'email de vérification
    try {
      await sendVerificationEmail(user.email, verificationCode);
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
      res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Code de vérification renvoyé avec succès'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};
