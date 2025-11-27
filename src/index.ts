import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import passport from 'passport';
import authRoutes from './routes/auth';
import productRoutes from './routes/product';
import vendorRoutes from './routes/vendor';
import userRoutes from './routes/user';
import categoriesRoutes from './routes/categories';
import reviewRoutes from './routes/review';
import imageProxy from './routes/imageProxy';
import corsOptions from './utils/corsOptions';

// Configuration des variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialiser Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoriesRoutes);

// Route pour le proxy d'images : permet de servir une URL locale avec extension
// Le front enregistre l'URL distante via POST /api/image/register, puis récupère
// une URL locale du type /api/image/:id.:ext. Cette route proxy récupère le flux
// distant et renvoie le contenu avec le bon Content-Type pour que Next/Image fonctionne.
app.use('/api/image', imageProxy);

// Route de test
app.get('/', (req, res) => {
  res.send('API Vendtout fonctionne correctement');
});
app.get("/env", (req, res) => {
  res.send({ node_env: process.env.NODE_ENV });
});


// Connexion à MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendtout')
  .then(() => {
    console.log('Connexion à MongoDB établie avec succès');
    // Démarrer le serveur après la connexion à la base de données
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  });

export default app;
