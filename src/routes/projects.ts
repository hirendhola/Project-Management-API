import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import type { PaginationParams, SearchParams, PaginatedResponse } from '../types/index.js';

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_PAGE_SIZE = 10;

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user!.userId;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: 'PLANNED',
        userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query as PaginationParams;
    const { query } = req.query as SearchParams;

    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      userId,
      ...(query
        ? {
            OR: [
              {
                name: {
                  contains: query,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                description: {
                  contains: query,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          tasks: {
            include: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    const response: PaginatedResponse<typeof projects[0]> = {
      data: projects,
      meta: {
        total,
        page,
        lastPage,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { name, description, status },
      include: {
        tasks: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create notification for status change
    if (status && status !== project.status) {
      await prisma.notification.create({
        data: {
          userId,
          message: `Project "${name}" status updated to ${status}`,
        },
      });
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            assignedUserId: true,
          },
        },
      },
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Create notifications for assigned users
    const assignedUserIds = new Set(project.tasks.map(task => task.assignedUserId));
    if (assignedUserIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(assignedUserIds).map(assignedUserId => ({
          userId: assignedUserId,
          message: `Project "${project.name}" has been deleted`,
        })),
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project' });
  }
});

export default router;