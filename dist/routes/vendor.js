"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vendorController_1 = require("../controllers/vendorController");
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = express_1.default.Router();
// Routes publiques
router.get('/', vendorController_1.getVendors);
router.get('/:slug', vendorController_1.getVendorBySlug);
router.get('/:slug/products', vendorController_1.getVendorProducts);
router.get('/:slug/reviews', reviewController_1.getVendorReviews);
// Routes protégées
router.get('/admin/pending', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.SUPER_ADMIN), vendorController_1.getPendingVendors);
router.put('/me', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.VENDOR, User_1.UserRole.SUPER_ADMIN), vendorController_1.updateVendor);
router.put('/:vendorId', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.VENDOR, User_1.UserRole.SUPER_ADMIN), vendorController_1.updateVendor);
router.get('/stats/me', auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.VENDOR), vendorController_1.getVendorStats);
router.post('/:slug/reviews', auth_1.protect, reviewController_1.postVendorReview);
exports.default = router;
