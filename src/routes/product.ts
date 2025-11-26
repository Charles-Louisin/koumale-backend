import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  incrementClicks
} from '../controllers/productController';

import {
  postProductReview,
  getProductReviews
} from '../controllers/reviewController';

import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();


// Routes publiques
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/:id/click', incrementClicks);
router.get('/:id/reviews', getProductReviews);

// Routes protégées
router.post(
  '/',
  protect,
  authorize(UserRole.VENDOR, UserRole.SUPER_ADMIN),
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize(UserRole.VENDOR, UserRole.SUPER_ADMIN),
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize(UserRole.VENDOR, UserRole.SUPER_ADMIN),
  deleteProduct
);

router.post('/:id/reviews', protect, postProductReview);

export default router;
