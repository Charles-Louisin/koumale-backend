import { Request, Response } from 'express';
import Cart from '../models/Cart';
import CartItem from '../models/CartItem';
import Product from '../models/Product';

// Récupérer le panier de l'utilisateur
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString() || (req.user as any)?.id;

    let cart = await Cart.findOne({ user: userId }).populate({
      path: 'items',
      populate: {
        path: 'product',
        populate: {
          path: 'vendor',
          select: 'businessName vendorSlug contactPhone whatsappLink telegramLink address'
        }
      }
    });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Calculer le total et le nombre d'articles
    const items = cart.items as any[];
    let totalPrice = 0;
    let totalItems = 0;

    items.forEach((item: any) => {
      if (item.product) {
        const price = item.product.promotionalPrice || item.product.price;
        totalPrice += price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({
      success: true,
      data: {
        _id: cart._id,
        items: items,
        totalPrice,
        totalItems
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Ajouter un article au panier
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString() || (req.user as any)?.id;
    const { productId, quantity, selectedAttributes, note } = req.body;

    // Vérifier que le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    // Récupérer ou créer le panier
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Vérifier si l'article existe déjà dans le panier avec les mêmes attributs
    const existingItems = await CartItem.find({ _id: { $in: cart.items } });
    const existingItem = existingItems.find(
      (item: any) =>
        item.product.toString() === productId &&
        JSON.stringify(item.selectedAttributes || {}) === JSON.stringify(selectedAttributes || {})
    );

    if (existingItem) {
      // Mettre à jour la quantité
      existingItem.quantity += quantity || 1;
      if (note) existingItem.note = note;
      await existingItem.save();
    } else {
      // Créer un nouvel article
      const newItem = await CartItem.create({
        product: productId,
        quantity: quantity || 1,
        selectedAttributes: selectedAttributes || {},
        note: note || ''
      });
      cart.items.push(newItem._id);
      await cart.save();
    }

    // Récupérer le panier mis à jour
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items',
      populate: {
        path: 'product',
        populate: {
          path: 'vendor',
          select: 'businessName vendorSlug contactPhone whatsappLink telegramLink address'
        }
      }
    });

    const items = updatedCart?.items as any[] || [];
    let totalPrice = 0;
    let totalItems = 0;

    items.forEach((item: any) => {
      if (item.product) {
        const price = item.product.promotionalPrice || item.product.price;
        totalPrice += price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({
      success: true,
      data: {
        _id: updatedCart?._id,
        items: items,
        totalPrice,
        totalItems
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Mettre à jour un article du panier
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString() || (req.user as any)?.id;
    const { itemId } = req.params;
    const { quantity, note, selectedAttributes } = req.body;

    // Vérifier que l'article appartient au panier de l'utilisateur
    const cart = await Cart.findOne({ user: userId });
    if (!cart || !cart.items.includes(itemId as any)) {
      res.status(404).json({ success: false, message: 'Article non trouvé dans le panier' });
      return;
    }

    // Mettre à jour l'article
    const item = await CartItem.findById(itemId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Article non trouvé' });
      return;
    }

    if (quantity !== undefined) {
      if (quantity <= 0) {
        // Supprimer l'article si la quantité est 0 ou négative
        cart.items = cart.items.filter((id: any) => id.toString() !== itemId);
        await cart.save();
        await CartItem.findByIdAndDelete(itemId);
      } else {
        item.quantity = quantity;
      }
    }

    if (note !== undefined) item.note = note;
    if (selectedAttributes !== undefined) item.selectedAttributes = selectedAttributes;

    await item.save();

    // Récupérer le panier mis à jour
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items',
      populate: {
        path: 'product',
        populate: {
          path: 'vendor',
          select: 'businessName vendorSlug contactPhone whatsappLink telegramLink address'
        }
      }
    });

    const items = updatedCart?.items as any[] || [];
    let totalPrice = 0;
    let totalItems = 0;

    items.forEach((item: any) => {
      if (item.product) {
        const price = item.product.promotionalPrice || item.product.price;
        totalPrice += price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({
      success: true,
      data: {
        _id: updatedCart?._id,
        items: items,
        totalPrice,
        totalItems
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Supprimer un article du panier
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString() || (req.user as any)?.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      res.status(404).json({ success: false, message: 'Panier non trouvé' });
      return;
    }

    // Vérifier que l'article appartient au panier
    if (!cart.items.includes(itemId as any)) {
      res.status(404).json({ success: false, message: 'Article non trouvé dans le panier' });
      return;
    }

    // Supprimer l'article du panier
    cart.items = cart.items.filter((id: any) => id.toString() !== itemId);
    await cart.save();

    // Supprimer l'article de la base de données
    await CartItem.findByIdAndDelete(itemId);

    // Récupérer le panier mis à jour
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items',
      populate: {
        path: 'product',
        populate: {
          path: 'vendor',
          select: 'businessName vendorSlug contactPhone whatsappLink telegramLink address'
        }
      }
    });

    const items = updatedCart?.items as any[] || [];
    let totalPrice = 0;
    let totalItems = 0;

    items.forEach((item: any) => {
      if (item.product) {
        const price = item.product.promotionalPrice || item.product.price;
        totalPrice += price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({
      success: true,
      data: {
        _id: updatedCart?._id,
        items: items,
        totalPrice,
        totalItems
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Vider le panier
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString() || (req.user as any)?.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      res.json({
        success: true,
        data: {
          _id: null,
          items: [],
          totalPrice: 0,
          totalItems: 0
        }
      });
      return;
    }

    // Supprimer tous les articles
    await CartItem.deleteMany({ _id: { $in: cart.items } });

    // Vider le panier
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      data: {
        _id: cart._id,
        items: [],
        totalPrice: 0,
        totalItems: 0
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
};

// Validation pour ajouter au panier
export const addToCartValidation = (req: Request, res: Response, next: any): void => {
  const { productId, quantity } = req.body;

  if (!productId) {
    res.status(400).json({ success: false, message: 'ID du produit requis' });
    return;
  }

  if (quantity !== undefined && (quantity < 1 || !Number.isInteger(quantity))) {
    res.status(400).json({ success: false, message: 'La quantité doit être un entier positif' });
    return;
  }

  next();
};

// Validation pour mettre à jour un article
export const updateCartItemValidation = (req: Request, res: Response, next: any): void => {
  const { quantity } = req.body;

  if (quantity !== undefined && (quantity < 0 || !Number.isInteger(quantity))) {
    res.status(400).json({ success: false, message: 'La quantité doit être un entier positif ou zéro' });
    return;
  }

  next();
};

