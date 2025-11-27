"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = express_1.default.Router();
// Routes publiques
router.get('/', productController_1.getProducts);
router.get('/:id', productController_1.getProductById);
router.post('/:id/click', productController_1.incrementClicks);
router.get('/:id/reviews', reviewController_1.getProductReviews);
// Routes protégées
router.post('/', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.VENDOR, User_1.UserRole.SUPER_ADMIN), productController_1.createProduct);
router.put('/:id', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.VENDOR, User_1.UserRole.SUPER_ADMIN), productController_1.updateProduct);
router.delete('/:id', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.VENDOR, User_1.UserRole.SUPER_ADMIN), productController_1.deleteProduct);
router.post('/:id/reviews', auth_1.protect, reviewController_1.postProductReview);
exports.default = router;
