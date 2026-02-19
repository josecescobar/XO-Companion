import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto, organizationId: string, creatorId: string) {
    const project = await this.prisma.project.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        organizationId,
        members: {
          create: {
            userId: creatorId,
            role: Role.PROJECT_MANAGER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });
    return project;
  }

  async findAll(userId: string, organizationId: string) {
    const userRole = await this.getUserOrgRole(userId, organizationId);

    const where: any = { organizationId };
    // SUPER_ADMIN sees all org projects; others see only their memberships
    if (userRole !== Role.SUPER_ADMIN) {
      where.members = { some: { userId } };
    }

    return this.prisma.project.findMany({
      where,
      include: {
        _count: { select: { members: true, dailyLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        _count: { select: { dailyLogs: true } },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    // Check membership (SUPER_ADMIN can see all)
    const userRole = await this.getUserOrgRole(userId, organizationId);
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Not a member of this project');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async addMember(projectId: string, dto: AddMemberDto, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Verify user belongs to same org
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId },
    });
    if (!user) throw new NotFoundException('User not found in organization');

    try {
      return await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: dto.userId,
          role: dto.role,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
      });
    } catch {
      throw new ConflictException('User is already a member of this project');
    }
  }

  async removeMember(projectId: string, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.projectMember.delete({
      where: { id: member.id },
    });
    return { message: 'Member removed' };
  }

  async getMembers(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });
  }

  // Helper: verify a user is a member of a project
  async verifyMembership(projectId: string, userId: string, organizationId: string) {
    const userRole = await this.getUserOrgRole(userId, organizationId);
    if (userRole === Role.SUPER_ADMIN) return true;

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this project');
    return true;
  }

  private async getUserOrgRole(userId: string, organizationId: string): Promise<Role | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { role: true },
    });
    return user?.role || null;
  }
}
