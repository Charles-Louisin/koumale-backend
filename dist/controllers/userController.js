"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const User_1 = __importStar(require("../models/User"));
// GET /api/users
// Réservé aux super admins
const getUsers = async (req, res) => {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const role = req.query.role;
        const status = req.query.status;
        const q = (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
        const filter = {};
        if (role && Object.values(User_1.UserRole).includes(role)) {
            filter.role = role;
        }
        if (status && Object.values(User_1.UserStatus).includes(status)) {
            filter.status = status;
        }
        // Par défaut, exclure les super admins dans la liste
        if (!filter.role) {
            filter.role = { $ne: User_1.UserRole.SUPER_ADMIN };
        }
        const search = q ? {
            $or: [
                { email: { $regex: q, $options: 'i' } },
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } },
            ]
        } : {};
        const finalFilter = Object.keys(search).length ? { $and: [filter, search] } : filter;
        const [users, total] = await Promise.all([
            User_1.default.find(finalFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('email firstName lastName role status createdAt'),
            User_1.default.countDocuments(finalFilter),
        ]);
        res.status(200).json({
            success: true,
            count: users.length,
            total,
            pagination: { page, limit, totalPages: Math.ceil(total / limit) },
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
    }
};
exports.getUsers = getUsers;
