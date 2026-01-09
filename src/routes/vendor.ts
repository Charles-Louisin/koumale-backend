import express from 'express';
import {
  getVendors,
  getPendingVendors,
  getVendorBySlug,
  updateVendor,
  getVendorStats,
  getVendorProducts,
  deleteVendor,
  deleteVendorByAdmin
} from '../controllers/vendorController';

import {
  postVendorReview,
  getVendorReviews
} from '../controllers/reviewController';

import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

// Routes publiques
router.get('/', getVendors);
router.get('/:slug', getVendorBySlug);
router.get('/:slug/products', getVendorProducts);
router.get('/:slug/reviews', getVendorReviews);

// Routes protégées
router.get(
  '/admin/pending',
  protect,
  authorize(UserRole.SUPER_ADMIN),
  getPendingVendors
);

router.put(
  '/me',
  protect,
  authorize(UserRole.VENDOR, UserRole.SUPER_ADMIN),
  updateVendor
);

router.put(
  '/:vendorId',
  protect,
  authorize(UserRole.VENDOR, UserRole.SUPER_ADMIN),
  updateVendor
);

router.get(
  '/stats/me',
  protect,
  authorize(UserRole.VENDOR),
  getVendorStats
);

router.delete(
  '/me',
  protect,
  authorize(UserRole.VENDOR),
  deleteVendor
);

router.delete(
  '/:vendorId',
  protect,
  authorize(UserRole.SUPER_ADMIN),
  deleteVendorByAdmin
);

router.post('/:slug/reviews', protect, postVendorReview);

export default router;
