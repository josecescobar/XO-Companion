import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, TaskPriority, TaskCategory } from '@prisma/client';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  category?: TaskCategory;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async list(projectId: string, filters: TaskFilters = {}) {
    const where: any = { projectId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignee) where.assignee = filters.assignee;
    if (filters.category) where.category = filters.category;

    return this.prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async summary(projectId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [pending, urgent, completedThisWeek, overdue] = await Promise.all([
      this.prisma.task.count({
        where: { projectId, status: TaskStatus.PENDING },
      }),
      this.prisma.task.count({
        where: { projectId, priority: TaskPriority.URGENT, status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] } },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: startOfWeek },
        },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      }),
    ]);

    return { pending, urgent, completedThisWeek, overdue };
  }

  async create(projectId: string, createdById: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        projectId,
        createdById,
        description: dto.description,
        assignee: dto.assignee || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority,
        category: dto.category,
        aiGenerated: dto.aiGenerated ?? false,
        aiConfidence: dto.aiConfidence ?? null,
        dailyLogId: dto.dailyLogId || null,
        voiceNoteId: dto.voiceNoteId || null,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async update(projectId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const data: any = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.status === TaskStatus.COMPLETED) data.completedAt = new Date();

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async delete(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.task.delete({ where: { id: taskId } });
  }
}
