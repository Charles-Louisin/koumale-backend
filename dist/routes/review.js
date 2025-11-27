"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const router = express_1.default.Router();
// Product reviews
router.post('/products/:id/reviews', reviewController_1.postProductReview);
router.get('/products/:id/reviews', reviewController_1.getProductReviews);
// Vendor reviews
router.post('/vendors/:slug/reviews', reviewController_1.postVendorReview);
router.get('/vendors/:slug/reviews', reviewController_1.getVendorReviews);
// App reviews
router.post('/reviews', reviewController_1.postAppReview);
router.get('/reviews', reviewController_1.getAppReviews);
exports.default = router;
