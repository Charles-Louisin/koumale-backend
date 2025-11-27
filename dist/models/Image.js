"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Schéma Mongoose pour enregistrer une URL distante et son extension détectée
// Nous stockons :
// - remoteUrl : l'URL retournée par UploadThing
// - ext : l'extension déduite à partir du content-type (jpg, png, ...)
// - createdAt : horodatage pour pouvoir gérer la rétention ou le cache
const ImageSchema = new mongoose_1.default.Schema({
    remoteUrl: { type: String, required: true },
    ext: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
});
// Export du modèle Image (réutilise celui existant si déjà compilé)
exports.default = mongoose_1.default.models.Image || mongoose_1.default.model("Image", ImageSchema);
