import Vendor from '../models/Vendor';

// Fonction pour générer un slug unique à partir d'une chaîne
export const generateSlug = async (text: string): Promise<string> => {
  // Convertir en minuscules et remplacer les espaces par des tirets
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
    .replace(/[\s_-]+/g, '-') // Remplacer les espaces et underscores par des tirets
    .replace(/^-+|-+$/g, ''); // Supprimer les tirets au début et à la fin

  // Vérifier si le slug existe déjà
  const existingVendor = await Vendor.findOne({ vendorSlug: slug });

  // Si le slug existe déjà, ajouter un nombre aléatoire
  if (existingVendor) {
    const randomNum = Math.floor(Math.random() * 10000);
    slug = `${slug}-${randomNum}`;
  }

  return slug;
};

// Fonction pour formater les prix
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

// Fonction pour limiter la longueur d'une chaîne
export const truncateString = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

// Fonction pour calculer le pourcentage de réduction
export const calculateDiscountPercentage = (originalPrice: number, promotionalPrice: number): number => {
  if (originalPrice <= 0 || promotionalPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100);
};
