import dotenv from 'dotenv';

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Liste des origines autorisées
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  FRONTEND_URL,
  // Ajoutez vos domaines Vercel ici si nécessaire
  // 'https://votre-app.vercel.app',
  // 'https://koumale.com'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Autoriser les requêtes sans origine (comme les apps mobiles ou Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Vérifier si l'origine est dans la liste ou si c'est un domaine Vercel
    const isVercelDomain = origin.includes('.vercel.app');
    const isAllowed = allowedOrigins.includes(origin) || isVercelDomain;

    if (isAllowed) {
      console.log(`[CORS] ✅ Origine autorisée: ${origin}`);
      callback(null, true);
    } else {
      console.log(`[CORS] ❌ Origine refusée: ${origin}`);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200
};

export default corsOptions;
