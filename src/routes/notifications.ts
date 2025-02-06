import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import type { PaginationParams } from '../types/index.js';

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_PAGE_SIZE = 20;

// Get user notifications with pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query as PaginationParams;
    const skip = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({
        where: { userId },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    res.json({
      data: notifications,
      meta: {
        total,
        page,
        lastPage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notifications as read
router.put('/read', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { notificationIds } = req.body;

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        read: true,
      },
    });

    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Delete notifications
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { notificationIds } = req.body;

    await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notifications' });
  }
});

export default router;