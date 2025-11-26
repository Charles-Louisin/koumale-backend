import express from 'express';
import {
  postProductReview,
  getProductReviews,
  postVendorReview,
  getVendorReviews,
  postAppReview,
  getAppReviews
} from '../controllers/reviewController';

const router = express.Router();

// Product reviews
router.post('/products/:id/reviews', postProductReview);
router.get('/products/:id/reviews', getProductReviews);

// Vendor reviews
router.post('/vendors/:slug/reviews', postVendorReview);
router.get('/vendors/:slug/reviews', getVendorReviews);

// App reviews
router.post('/reviews', postAppReview);
router.get('/reviews', getAppReviews);

export default router;
