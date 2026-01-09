import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  addToCartValidation,
  updateCartItemValidation
} from '../controllers/cartController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All cart routes require authentication
router.use(authenticateToken);

// GET /api/cart - Get user's cart
router.get('/', getCart);

// POST /api/cart - Add item to cart
router.post('/', addToCartValidation, addToCart);

// PUT /api/cart/:itemId - Update cart item
router.put('/:itemId', updateCartItemValidation, updateCartItem);

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', removeFromCart);

// DELETE /api/cart - Clear entire cart
router.delete('/', clearCart);

export default router;
