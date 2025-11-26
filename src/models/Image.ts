import mongoose from "mongoose";

// Schéma Mongoose pour enregistrer une URL distante et son extension détectée
// Nous stockons :
// - remoteUrl : l'URL retournée par UploadThing
// - ext : l'extension déduite à partir du content-type (jpg, png, ...)
// - createdAt : horodatage pour pouvoir gérer la rétention ou le cache
const ImageSchema = new mongoose.Schema({
  remoteUrl: { type: String, required: true },
  ext: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

// Export du modèle Image (réutilise celui existant si déjà compilé)
export default mongoose.models.Image || mongoose.model("Image", ImageSchema);
