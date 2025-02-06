import { Router } from 'express';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Global task filtering endpoint
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, assignedUserId } = req.query;
    const userId = req.user!.userId;

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { project: { userId } }, // Tasks from user's projects
          { assignedUserId: userId } // Tasks assigned to user
        ],
        ...(status ? { status: status as TaskStatus } : {}),
        ...(assignedUserId ? { assignedUserId: assignedUserId as string } : {})
      },
      include: {
        project: {
          select: {
            name: true,
            description: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

router.post('/:projectId/tasks', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignedUserId } = req.body;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: 'TODO',
        projectId,
        assignedUserId,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task' });
  }
});

router.get('/:projectId/tasks', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(status ? { status: status as TaskStatus } : {}),
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is either the project owner or the assigned user
    if (task.project.userId !== userId && task.assignedUserId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { title, description, status },
      include: {
        project: {
          select: {
            name: true,
            description: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is either the project owner or the assigned user
    if (task.project.userId !== userId && task.assignedUserId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.task.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task' });
  }
});

export default router;