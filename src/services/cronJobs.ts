import cron from 'node-cron';
import {
  notifyPromotionalProducts,
  notifyTrendingProducts,
  notifyPopularVendors,
  notifyVendorToPublishProducts,
  notifyVendorToPromoteProducts,
  notifyAdminVendorsWithFewProducts,
  notifyAdminProductsWithLowViews
} from './pushNotificationService';

// Tâche cron pour notifier les produits promotionnels (tous les jours à 10h00)
cron.schedule('0 10 * * *', async () => {
  console.log('Exécution de la tâche cron: Notification produits promotionnels');
  try {
    await notifyPromotionalProducts();
  } catch (error) {
    console.error('Erreur lors de la tâche cron produits promotionnels:', error);
  }
});

// Tâche cron pour notifier les produits tendances (tous les 2 jours à 14h00)
cron.schedule('0 14 */2 * *', async () => {
  console.log('Exécution de la tâche cron: Notification produits tendances');
  try {
    await notifyTrendingProducts();
  } catch (error) {
    console.error('Erreur lors de la tâche cron produits tendances:', error);
  }
});

// Tâche cron pour notifier les boutiques populaires (tous les 3 jours à 16h00)
cron.schedule('0 16 */3 * *', async () => {
  console.log('Exécution de la tâche cron: Notification boutiques populaires');
  try {
    await notifyPopularVendors();
  } catch (error) {
    console.error('Erreur lors de la tâche cron boutiques populaires:', error);
  }
});

// Tâche cron pour rappeler aux vendeurs de publier des produits (toutes les semaines, lundi à 9h00)
cron.schedule('0 9 * * 1', async () => {
  console.log('Exécution de la tâche cron: Rappel vendeurs pour publier des produits');
  try {
    await notifyVendorToPublishProducts();
  } catch (error) {
    console.error('Erreur lors de la tâche cron rappel publier produits:', error);
  }
});

// Tâche cron pour rappeler aux vendeurs de mettre des produits en promotion (toutes les semaines, mercredi à 11h00)
cron.schedule('0 11 * * 3', async () => {
  console.log('Exécution de la tâche cron: Rappel vendeurs pour promouvoir des produits');
  try {
    await notifyVendorToPromoteProducts();
  } catch (error) {
    console.error('Erreur lors de la tâche cron rappel promouvoir produits:', error);
  }
});

// Tâche cron pour notifier les admins des boutiques avec peu de produits (toutes les semaines, mardi à 10h00)
cron.schedule('0 10 * * 2', async () => {
  console.log('Exécution de la tâche cron: Notification admins boutiques avec peu de produits');
  try {
    await notifyAdminVendorsWithFewProducts();
  } catch (error) {
    console.error('Erreur lors de la tâche cron admins boutiques peu de produits:', error);
  }
});

// Tâche cron pour notifier les admins des produits avec peu de vues (toutes les semaines, jeudi à 10h00)
cron.schedule('0 10 * * 4', async () => {
  console.log('Exécution de la tâche cron: Notification admins produits avec peu de vues');
  try {
    await notifyAdminProductsWithLowViews();
  } catch (error) {
    console.error('Erreur lors de la tâche cron admins produits peu de vues:', error);
  }
});

console.log('Tâches cron configurées avec succès');
