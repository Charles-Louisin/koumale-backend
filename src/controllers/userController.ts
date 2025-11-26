import { Request, Response } from 'express';
import User, { UserRole, UserStatus } from '../models/User';

// GET /api/users
// Réservé aux super admins
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const q = (req.query.q as string | undefined)?.trim();

    const filter: Record<string, unknown> = {};
    if (role && Object.values<string>(UserRole as unknown as Record<string, string>).includes(role)) {
      filter.role = role;
    }
    if (status && Object.values<string>(UserStatus as unknown as Record<string, string>).includes(status)) {
      filter.status = status;
    }

    // Par défaut, exclure les super admins dans la liste
    if (!filter.role) {
      filter.role = { $ne: UserRole.SUPER_ADMIN };
    }

    const search: Record<string, unknown> = q ? {
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
      ]
    } : {};

    const finalFilter = Object.keys(search).length ? { $and: [filter, search] } : filter;

    const [users, total] = await Promise.all([
      User.find(finalFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('email firstName lastName role status createdAt'),
      User.countDocuments(finalFilter),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) },
      data: users,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Une erreur est survenue' });
  }
};


