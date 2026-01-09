import express from 'express';
import { getUsers, deleteUser } from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

router.get('/', protect, authorize(UserRole.SUPER_ADMIN), getUsers);
router.delete('/:userId', protect, authorize(UserRole.SUPER_ADMIN), deleteUser);

export default router;


