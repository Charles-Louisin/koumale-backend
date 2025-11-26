import express from 'express';
import { getCategories } from '../controllers/productController';

const router = express.Router();

// Route pour récupérer toutes les catégories
router.get('/', getCategories);

export default router;
