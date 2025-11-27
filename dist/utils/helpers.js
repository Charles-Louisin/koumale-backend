"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDiscountPercentage = exports.truncateString = exports.formatPrice = exports.generateSlug = void 0;
const Vendor_1 = __importDefault(require("../models/Vendor"));
// Fonction pour générer un slug unique à partir d'une chaîne
const generateSlug = async (text) => {
    // Convertir en minuscules et remplacer les espaces par des tirets
    let slug = text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
        .replace(/[\s_-]+/g, '-') // Remplacer les espaces et underscores par des tirets
        .replace(/^-+|-+$/g, ''); // Supprimer les tirets au début et à la fin
    // Vérifier si le slug existe déjà
    const existingVendor = await Vendor_1.default.findOne({ vendorSlug: slug });
    // Si le slug existe déjà, ajouter un nombre aléatoire
    if (existingVendor) {
        const randomNum = Math.floor(Math.random() * 10000);
        slug = `${slug}-${randomNum}`;
    }
    return slug;
};
exports.generateSlug = generateSlug;
// Fonction pour formater les prix
const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
};
exports.formatPrice = formatPrice;
// Fonction pour limiter la longueur d'une chaîne
const truncateString = (str, length) => {
    if (str.length <= length)
        return str;
    return str.slice(0, length) + '...';
};
exports.truncateString = truncateString;
// Fonction pour calculer le pourcentage de réduction
const calculateDiscountPercentage = (originalPrice, promotionalPrice) => {
    if (originalPrice <= 0 || promotionalPrice >= originalPrice)
        return 0;
    return Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100);
};
exports.calculateDiscountPercentage = calculateDiscountPercentage;
