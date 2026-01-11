# Configuration PWA et Notifications Push

## Configuration des clés VAPID

Pour activer les notifications push, vous devez générer des clés VAPID (Voluntary Application Server Identification).

### Générer les clés VAPID

Vous pouvez utiliser la bibliothèque `web-push` pour générer les clés :

```bash
cd backend
npx web-push generate-vapid-keys
```

Cela générera deux clés :
- Une clé publique (Public Key)
- Une clé privée (Private Key)

### Configurer les variables d'environnement

Ajoutez les clés générées dans votre fichier `.env` du backend :

```env
VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
VAPID_SUBJECT=mailto:contact@koumale.com
```

**Important** : La clé publique sera envoyée au client pour s'abonner aux notifications. La clé privée doit rester secrète et ne jamais être exposée.

## Notifications push selon les rôles

### Clients / Non connectés
- ✅ Nouvelle boutique créée
- ✅ Nouveau produit ajouté
- ✅ Rappels produits en promotion
- ✅ Rappels produits tendances
- ✅ Rappels boutiques populaires

### Vendeurs
- ✅ Toutes les notifications clients
- ✅ Nouvelle review sur un de leurs produits
- ✅ Rappel pour publier des produits
- ✅ Rappel pour mettre des produits en promotion
- ✅ Suggestions diverses

### Admins
- ✅ Toutes les notifications précédentes
- ✅ Nouvel utilisateur inscrit
- ✅ Boutique en attente de validation
- ✅ Rappel boutiques avec peu de produits
- ✅ Rappel produits avec peu de vues

## Tâches programmées (Cron Jobs)

Les notifications de rappel sont envoyées automatiquement selon le calendrier suivant :

- **Produits promotionnels** : Tous les jours à 10h00
- **Produits tendances** : Tous les 2 jours à 14h00
- **Boutiques populaires** : Tous les 3 jours à 16h00
- **Rappel vendeurs (publier produits)** : Tous les lundis à 9h00
- **Rappel vendeurs (promotions)** : Tous les mercredis à 11h00
- **Rappel admins (peu de produits)** : Tous les mardis à 10h00
- **Rappel admins (peu de vues)** : Tous les jeudis à 10h00

## Installation iOS

Sur iOS, les notifications push dans les PWA nécessitent :
- iOS 16.4 ou supérieur
- L'utilisateur doit ajouter le site à l'écran d'accueil
- HTTPS requis (production)

## Installation Android

Sur Android, les notifications push fonctionnent avec Chrome et d'autres navigateurs supportant Web Push API.

## Test des notifications

Pour tester les notifications push en développement :

1. Assurez-vous que les clés VAPID sont configurées
2. Démarrez le backend : `cd backend && npm run dev`
3. Démarrez le frontend : `npm run dev`
4. Ouvrez l'application dans Chrome/Edge (HTTPS requis pour la production)
5. Cliquez sur le bouton "Activer les notifications"
6. Autorisez les notifications dans le navigateur
7. Les notifications seront reçues automatiquement selon les événements
