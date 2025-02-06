import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (req.user?.userId !== id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user?.userId !== id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

export default router;