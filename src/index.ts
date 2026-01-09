import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import passport from 'passport';
import session from 'express-session';
import authRoutes from './routes/auth';
import productRoutes from './routes/product';
import vendorRoutes from './routes/vendor';
import userRoutes from './routes/user';
import categoriesRoutes from './routes/categories';
import reviewRoutes from './routes/review';
import cartRoutes from './routes/cart';
import imageProxy from './routes/imageProxy';
import corsOptions from './utils/corsOptions';

// Configuration des variables d'environnement
// console.log(JSON.stringify(process.env.GOOGLE_CLI/ENT_ID));
// console.log(JSON.stringify(process.env.RESEND_API_KEY))
// console.log(JSON.stringify(process.env.GOOGLE_CLIENT_SECRET));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialiser Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);

// Route pour le proxy d'images : permet de servir une URL locale avec extension
// Le front enregistre l'URL distante via POST /api/image/register, puis récupère
// une URL locale du type /api/image/:id.:ext. Cette route proxy récupère le flux
// distant et renvoie le contenu avec le bon Content-Type pour que Next/Image fonctionne.
app.use('/api/image', imageProxy);

// Route de test
app.get('/', (req, res) => {
  res.send('API KOUMALE fonctionne correctement');
});
app.get("/env", (req, res) => {
  res.send({ node_env: process.env.NODE_ENV });
});


// Connexion à MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/koumale')
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
