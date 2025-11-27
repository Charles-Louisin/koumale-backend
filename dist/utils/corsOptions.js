"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const FRONTEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const corsOptions = {
    origin: FRONTEND_URL,
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 200
};
exports.default = corsOptions;
