import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private prisma: PrismaService) {}

  // ─── OSHA Incidents ──────────────────────────────────────────────

  async createIncident(organizationId: string, dto: CreateIncidentDto) {
    return this.prisma.oshaIncident.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        employeeName: dto.employeeName,
        employeeJobTitle: dto.employeeJobTitle,
        employeeDateOfBirth: dto.employeeDateOfBirth
          ? new Date(dto.employeeDateOfBirth)
          : null,
        employeeHireDate: dto.employeeHireDate
          ? new Date(dto.employeeHireDate)
          : null,
        incidentDate: new Date(dto.incidentDate),
        incidentTime: dto.incidentTime,
        location: dto.location,
        description: dto.description,
        injuryType: dto.injuryType,
        bodyPart: dto.bodyPart,
        objectOrSubstance: dto.objectOrSubstance,
        deathDate: dto.deathDate ? new Date(dto.deathDate) : null,
        daysAwayFromWork: dto.daysAwayFromWork,
        daysRestricted: dto.daysRestricted,
        isRecordable: dto.isRecordable ?? false,
        caseType: dto.caseType,
        dailyLogId: dto.dailyLogId,
        safetyEntryId: dto.safetyEntryId,
        status: dto.status ?? 'DRAFT',
      },
    });
  }

  async findAllIncidents(
    organizationId: string,
    filters?: {
      projectId?: string;
      isRecordable?: boolean;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    return this.prisma.oshaIncident.findMany({
      where: {
        organizationId,
        ...(filters?.projectId ? { projectId: filters.projectId } : {}),
        ...(filters?.isRecordable !== undefined
          ? { isRecordable: filters.isRecordable }
          : {}),
        ...(filters?.dateFrom || filters?.dateTo
          ? {
              incidentDate: {
                ...(filters?.dateFrom
                  ? { gte: new Date(filters.dateFrom) }
                  : {}),
                ...(filters?.dateTo
                  ? { lte: new Date(filters.dateTo) }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async findOneIncident(id: string, organizationId: string) {
    const incident = await this.prisma.oshaIncident.findFirst({
      where: { id, organizationId },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async updateIncident(
    id: string,
    organizationId: string,
    dto: UpdateIncidentDto,
  ) {
    await this.findOneIncident(id, organizationId);
    const data: any = { ...dto };
    if (dto.incidentDate) data.incidentDate = new Date(dto.incidentDate);
    if (dto.employeeDateOfBirth)
      data.employeeDateOfBirth = new Date(dto.employeeDateOfBirth);
    if (dto.employeeHireDate)
      data.employeeHireDate = new Date(dto.employeeHireDate);
    if (dto.deathDate) data.deathDate = new Date(dto.deathDate);
    return this.prisma.oshaIncident.update({ where: { id }, data });
  }

  // ─── OSHA Form Generation ───────────────────────────────────────

  async generateForm300(organizationId: string, year: number) {
    const incidents = await this.prisma.oshaIncident.findMany({
      where: {
        organizationId,
        isRecordable: true,
        incidentDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      orderBy: { incidentDate: 'asc' },
    });

    return {
      form: 'OSHA-300',
      title: 'Log of Work-Related Injuries and Illnesses',
      year,
      entries: incidents.map((inc, idx) => ({
        caseNumber: `${year}-${String(idx + 1).padStart(3, '0')}`,
        employeeName: inc.employeeName,
        jobTitle: inc.employeeJobTitle,
        incidentDate: inc.incidentDate,
        location: inc.location,
        description: inc.description,
        injuryType: inc.injuryType,
        bodyPart: inc.bodyPart,
        caseType: inc.caseType,
        daysAwayFromWork: inc.daysAwayFromWork ?? 0,
        daysRestricted: inc.daysRestricted ?? 0,
        death: inc.deathDate !== null,
      })),
      totals: {
        totalCases: incidents.length,
        deaths: incidents.filter((i) => i.deathDate !== null).length,
        daysAwayCases: incidents.filter((i) => i.caseType === 'DAYS_AWAY')
          .length,
        restrictedCases: incidents.filter((i) => i.caseType === 'RESTRICTED')
          .length,
        otherRecordableCases: incidents.filter(
          (i) =>
            i.caseType === 'MEDICAL_TREATMENT' ||
            i.caseType === 'OTHER_RECORDABLE',
        ).length,
        totalDaysAway: incidents.reduce(
          (sum, i) => sum + (i.daysAwayFromWork ?? 0),
          0,
        ),
        totalDaysRestricted: incidents.reduce(
          (sum, i) => sum + (i.daysRestricted ?? 0),
          0,
        ),
      },
    };
  }

  async generateForm300A(organizationId: string, year: number) {
    const form300 = await this.generateForm300(organizationId, year);

    // Calculate total hours from approved daily logs
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        project: { organizationId },
        logDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
        status: 'APPROVED',
      },
      include: {
        workforce: { select: { workerCount: true, hoursWorked: true } },
      },
    });

    const totalHoursWorked = logs.reduce(
      (sum, log) =>
        sum +
        log.workforce.reduce((s, w) => s + w.workerCount * w.hoursWorked, 0),
      0,
    );

    const totalRecordable = form300.totals.totalCases;

    return {
      form: 'OSHA-300A',
      title: 'Summary of Work-Related Injuries and Illnesses',
      year,
      totalHoursWorked: Math.round(totalHoursWorked),
      annualAverageEmployees: null, // must be entered manually
      ...form300.totals,
      incidentRate:
        totalHoursWorked > 0
          ? parseFloat(
              ((totalRecordable / totalHoursWorked) * 200000).toFixed(2),
            )
          : 0,
    };
  }

  async generateForm301(incidentId: string, organizationId: string) {
    const incident = await this.findOneIncident(incidentId, organizationId);

    return {
      form: 'OSHA-301',
      title: 'Injury and Illness Incident Report',
      incidentId: incident.id,
      employee: {
        name: incident.employeeName,
        jobTitle: incident.employeeJobTitle,
        dateOfBirth: incident.employeeDateOfBirth,
        hireDate: incident.employeeHireDate,
      },
      incident: {
        date: incident.incidentDate,
        time: incident.incidentTime,
        location: incident.location,
        description: incident.description,
        injuryType: incident.injuryType,
        bodyPart: incident.bodyPart,
        objectOrSubstance: incident.objectOrSubstance,
      },
      outcome: {
        deathDate: incident.deathDate,
        daysAwayFromWork: incident.daysAwayFromWork,
        daysRestricted: incident.daysRestricted,
        caseType: incident.caseType,
      },
      status: incident.status,
    };
  }

  // ─── Compliance Documents ───────────────────────────────────────

  async createDocument(organizationId: string, dto: CreateDocumentDto) {
    return this.prisma.complianceDocument.create({
      data: {
        organizationId,
        documentType: dto.documentType,
        name: dto.name,
        description: dto.description,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : null,
        alertDays: dto.alertDays,
        licenseNumber: dto.licenseNumber,
        issuingAuthority: dto.issuingAuthority,
        state: dto.state,
        fileUrl: dto.fileUrl,
        projectId: dto.projectId,
      },
    });
  }

  async findAllDocuments(
    organizationId: string,
    filters?: { type?: string; status?: string },
  ) {
    return this.prisma.complianceDocument.findMany({
      where: {
        organizationId,
        ...(filters?.type ? { documentType: filters.type as any } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async findOneDocument(id: string, organizationId: string) {
    const doc = await this.prisma.complianceDocument.findFirst({
      where: { id, organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async updateDocument(
    id: string,
    organizationId: string,
    dto: UpdateDocumentDto,
  ) {
    await this.findOneDocument(id, organizationId);
    const data: any = { ...dto };
    if (dto.issueDate) data.issueDate = new Date(dto.issueDate);
    if (dto.expirationDate) data.expirationDate = new Date(dto.expirationDate);
    return this.prisma.complianceDocument.update({ where: { id }, data });
  }

  async deleteDocument(id: string, organizationId: string) {
    await this.findOneDocument(id, organizationId);
    await this.prisma.complianceDocument.delete({ where: { id } });
    return { message: 'Document deleted' };
  }

  async getDashboard(organizationId: string) {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);

    const [expired, expiringSoon, upcomingRenewals] = await Promise.all([
      this.prisma.complianceDocument.findMany({
        where: { organizationId, expirationDate: { lt: now } },
        orderBy: { expirationDate: 'desc' },
      }),
      this.prisma.complianceDocument.findMany({
        where: {
          organizationId,
          expirationDate: { gte: now, lte: in30 },
        },
        orderBy: { expirationDate: 'asc' },
      }),
      this.prisma.complianceDocument.findMany({
        where: {
          organizationId,
          expirationDate: { gt: in30, lte: in90 },
        },
        orderBy: { expirationDate: 'asc' },
      }),
    ]);

    return {
      summary: {
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        upcomingRenewals: upcomingRenewals.length,
      },
      expired,
      expiringSoon: expiringSoon.map((d) => ({
        ...d,
        daysUntilExpiration: Math.ceil(
          (d.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      upcomingRenewals,
    };
  }

  async getAlerts(organizationId: string) {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const [expired, expiringSoon] = await Promise.all([
      this.prisma.complianceDocument.findMany({
        where: { organizationId, expirationDate: { lt: now } },
        orderBy: { expirationDate: 'asc' },
      }),
      this.prisma.complianceDocument.findMany({
        where: {
          organizationId,
          expirationDate: { gte: now, lte: in30 },
        },
        orderBy: { expirationDate: 'asc' },
      }),
    ]);

    return [
      ...expired.map((d) => ({
        ...d,
        alertType: 'EXPIRED' as const,
        daysUntilExpiration: Math.ceil(
          (d.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      ...expiringSoon.map((d) => ({
        ...d,
        alertType: 'EXPIRING_SOON' as const,
        daysUntilExpiration: Math.ceil(
          (d.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    ];
  }

  // ─── Training Records ──────────────────────────────────────────

  async createTraining(organizationId: string, dto: CreateTrainingDto) {
    return this.prisma.trainingRecord.create({
      data: {
        organizationId,
        employeeName: dto.employeeName,
        employeeId: dto.employeeId,
        trainingType: dto.trainingType,
        topic: dto.topic,
        description: dto.description,
        completedDate: new Date(dto.completedDate),
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : null,
        trainer: dto.trainer,
        certificationId: dto.certificationId,
        dailyLogId: dto.dailyLogId,
        projectId: dto.projectId,
      },
    });
  }

  async findAllTraining(
    organizationId: string,
    filters?: { employeeName?: string; trainingType?: string },
  ) {
    return this.prisma.trainingRecord.findMany({
      where: {
        organizationId,
        ...(filters?.employeeName
          ? { employeeName: { contains: filters.employeeName, mode: 'insensitive' as const } }
          : {}),
        ...(filters?.trainingType
          ? { trainingType: filters.trainingType }
          : {}),
      },
      orderBy: { completedDate: 'desc' },
    });
  }

  async findOneTraining(id: string, organizationId: string) {
    const record = await this.prisma.trainingRecord.findFirst({
      where: { id, organizationId },
    });
    if (!record) throw new NotFoundException('Training record not found');
    return record;
  }

  async updateTraining(
    id: string,
    organizationId: string,
    dto: UpdateTrainingDto,
  ) {
    await this.findOneTraining(id, organizationId);
    const data: any = { ...dto };
    if (dto.completedDate) data.completedDate = new Date(dto.completedDate);
    if (dto.expirationDate) data.expirationDate = new Date(dto.expirationDate);
    return this.prisma.trainingRecord.update({ where: { id }, data });
  }

  async getExpiringTraining(organizationId: string, days: number) {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    return this.prisma.trainingRecord.findMany({
      where: {
        organizationId,
        expirationDate: { gte: now, lte: cutoff },
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  // ─── Internal: called by ReviewService after safety entry approval ───

  async handleSafetyEntryApproved(safetyEntryId: string) {
    try {
      const safety = await this.prisma.safetyEntry.findUnique({
        where: { id: safetyEntryId },
        include: {
          dailyLog: {
            select: {
              id: true,
              projectId: true,
              logDate: true,
              project: { select: { organizationId: true } },
            },
          },
        },
      });

      if (!safety) return;

      const organizationId = safety.dailyLog.project.organizationId;
      const projectId = safety.dailyLog.projectId;

      // Auto-create OshaIncident draft if oshaRecordable
      if (safety.oshaRecordable) {
        const existing = await this.prisma.oshaIncident.findFirst({
          where: { safetyEntryId, organizationId },
        });
        if (!existing) {
          await this.prisma.oshaIncident.create({
            data: {
              organizationId,
              projectId,
              safetyEntryId,
              dailyLogId: safety.dailyLog.id,
              status: 'DRAFT',
              incidentDate: safety.dailyLog.logDate,
              employeeName: 'Unknown — please update',
              description:
                safety.incidents.length > 0
                  ? safety.incidents.join('; ')
                  : safety.notes ?? 'OSHA recordable incident from daily log',
              isRecordable: true,
            },
          });
          this.logger.log(
            `Auto-created OshaIncident draft from SafetyEntry ${safetyEntryId}`,
          );
        }
      }

      // Auto-create TrainingRecord for each toolbox talk
      if (safety.toolboxTalks.length > 0) {
        for (const topic of safety.toolboxTalks) {
          const existing = await this.prisma.trainingRecord.findFirst({
            where: { dailyLogId: safety.dailyLog.id, topic, organizationId },
          });
          if (!existing) {
            await this.prisma.trainingRecord.create({
              data: {
                organizationId,
                projectId,
                dailyLogId: safety.dailyLog.id,
                employeeName: 'All attendees',
                trainingType: 'TOOLBOX_TALK',
                topic,
                completedDate: safety.dailyLog.logDate,
              },
            });
            this.logger.log(
              `Auto-created TrainingRecord "${topic}" from SafetyEntry ${safetyEntryId}`,
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.error(
        `handleSafetyEntryApproved failed for ${safetyEntryId}: ${err.message}`,
      );
    }
  }
}
