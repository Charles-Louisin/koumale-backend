import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';

// Interface pour étendre la requête Express
declare module 'express' {
  interface Request {
    user?: any;
  }
}

// Middleware pour protéger les routes
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

      // Récupérer l'utilisateur
      const user = await User.findById(decoded.id);

      if (!user) {
        res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
        return;
      }

      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Middleware pour restreindre l'accès selon le rôle
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
