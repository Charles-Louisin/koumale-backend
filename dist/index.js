"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const passport_1 = __importDefault(require("passport"));
const auth_1 = __importDefault(require("./routes/auth"));
const product_1 = __importDefault(require("./routes/product"));
const vendor_1 = __importDefault(require("./routes/vendor"));
const user_1 = __importDefault(require("./routes/user"));
const categories_1 = __importDefault(require("./routes/categories"));
const imageProxy_1 = __importDefault(require("./routes/imageProxy"));
const corsOptions_1 = __importDefault(require("./utils/corsOptions"));
// Configuration des variables d'environnement
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)(corsOptions_1.default));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Initialiser Passport
app.use(passport_1.default.initialize());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', product_1.default);
app.use('/api/vendors', vendor_1.default);
app.use('/api/users', user_1.default);
app.use('/api/categories', categories_1.default);
// Route pour le proxy d'images : permet de servir une URL locale avec extension
// Le front enregistre l'URL distante via POST /api/image/register, puis récupère
// une URL locale du type /api/image/:id.:ext. Cette route proxy récupère le flux
// distant et renvoie le contenu avec le bon Content-Type pour que Next/Image fonctionne.
app.use('/api/image', imageProxy_1.default);
// Route de test
app.get('/', (req, res) => {
    res.send('API Vendtout fonctionne correctement');
});
app.get("/env", (req, res) => {
    res.send({ node_env: process.env.NODE_ENV });
});
// Connexion à MongoDB
mongoose_1.default
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
exports.default = app;
