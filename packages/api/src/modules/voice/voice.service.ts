import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogsService } from '../daily-logs/daily-logs.service';
import { DailyLogExtraction } from './schemas/daily-log-extraction.schema';
import { VoiceProcessingJobData } from './voice.processor';
import {
  WeatherCondition,
  EquipmentCondition,
  MaterialCondition,
  DelayCause,
} from '@prisma/client';

@Injectable()
export class VoiceService {
  constructor(
    private prisma: PrismaService,
    private dailyLogsService: DailyLogsService,
    @InjectQueue('voice-processing') private voiceQueue: Queue<VoiceProcessingJobData>,
  ) {}

  async upload(
    dailyLogId: string,
    projectId: string,
    userId: string,
    file: { path: string; size: number; mimetype: string },
  ) {
    // Verify the daily log exists and resolve organizationId
    await this.dailyLogsService.findOne(dailyLogId, projectId);
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { organizationId: true },
    });

    const voiceNote = await this.prisma.voiceNote.create({
      data: {
        dailyLogId,
        userId,
        audioUrl: file.path,
        audioSize: file.size,
        mimeType: file.mimetype,
        status: 'UPLOADING',
      },
    });

    // Enqueue for processing
    await this.voiceQueue.add('process', {
      voiceNoteId: voiceNote.id,
      audioUrl: file.path,
      organizationId: project.organizationId,
    });

    // Update status to indicate it's queued
    await this.prisma.voiceNote.update({
      where: { id: voiceNote.id },
      data: { status: 'TRANSCRIBING' },
    });

    return voiceNote;
  }

  async findAll(dailyLogId: string, projectId: string) {
    await this.dailyLogsService.findOne(dailyLogId, projectId);
    return this.prisma.voiceNote.findMany({
      where: { dailyLogId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        durationSeconds: true,
        aiProcessed: true,
        processingError: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const note = await this.prisma.voiceNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Voice note not found');
    return note;
  }

  async getExtracted(id: string) {
    const note = await this.findOne(id);
    if (!note.extractedData) {
      throw new BadRequestException('No extracted data available yet');
    }
    return {
      voiceNoteId: note.id,
      status: note.status,
      transcript: note.transcript,
      extractedData: note.extractedData,
    };
  }

  async apply(id: string, projectId: string) {
    const note = await this.findOne(id);
    if (!note.extractedData) {
      throw new BadRequestException('No extracted data to apply');
    }

    const data = note.extractedData as unknown as DailyLogExtraction;
    const dailyLogId = note.dailyLogId;

    // Apply weather
    if (data.weather) {
      await this.prisma.weatherEntry.upsert({
        where: { dailyLogId },
        create: {
          dailyLogId,
          conditions: data.weather.conditions as WeatherCondition[],
          tempHigh: data.weather.tempHigh,
          tempLow: data.weather.tempLow,
          precipitation: data.weather.precipitation,
          windSpeed: data.weather.windSpeed,
          delayMinutes: data.weather.delayMinutes,
          aiGenerated: true,
          aiConfidence: data.weather.confidence,
        },
        update: {
          conditions: data.weather.conditions as WeatherCondition[],
          tempHigh: data.weather.tempHigh,
          tempLow: data.weather.tempLow,
          precipitation: data.weather.precipitation,
          windSpeed: data.weather.windSpeed,
          delayMinutes: data.weather.delayMinutes,
          aiGenerated: true,
          aiConfidence: data.weather.confidence,
        },
      });
    }

    // Apply workforce
    for (const wf of data.workforce) {
      await this.prisma.workforceEntry.create({
        data: {
          dailyLogId,
          trade: wf.trade,
          company: wf.company,
          workerCount: wf.workerCount,
          hoursWorked: wf.hoursWorked,
          overtimeHours: wf.overtimeHours,
          foreman: wf.foreman,
          aiGenerated: true,
          aiConfidence: wf.confidence,
        },
      });
    }

    // Apply equipment
    for (const eq of data.equipment) {
      await this.prisma.equipmentEntry.create({
        data: {
          dailyLogId,
          equipmentType: eq.equipmentType,
          operatingHours: eq.operatingHours,
          idleHours: eq.idleHours,
          condition: eq.condition as EquipmentCondition,
          aiGenerated: true,
          aiConfidence: eq.confidence,
        },
      });
    }

    // Apply work completed
    for (const wc of data.workCompleted) {
      await this.prisma.workCompletedEntry.create({
        data: {
          dailyLogId,
          location: wc.location,
          csiCode: wc.csiCode,
          description: wc.description,
          percentComplete: wc.percentComplete,
          quantity: wc.quantity,
          unit: wc.unit,
          aiGenerated: true,
          aiConfidence: wc.confidence,
        },
      });
    }

    // Apply materials
    for (const mat of data.materials) {
      await this.prisma.materialEntry.create({
        data: {
          dailyLogId,
          material: mat.material,
          quantity: mat.quantity,
          unit: mat.unit,
          supplier: mat.supplier,
          ticketNumber: mat.ticketNumber,
          condition: mat.condition as MaterialCondition,
          aiGenerated: true,
          aiConfidence: mat.confidence,
        },
      });
    }

    // Apply safety
    if (data.safety) {
      await this.prisma.safetyEntry.upsert({
        where: { dailyLogId },
        create: {
          dailyLogId,
          toolboxTalks: data.safety.toolboxTalks,
          inspections: data.safety.inspections,
          incidents: data.safety.incidents,
          oshaRecordable: data.safety.oshaRecordable,
          nearMisses: data.safety.nearMisses,
          aiGenerated: true,
          aiConfidence: data.safety.confidence,
        },
        update: {
          toolboxTalks: data.safety.toolboxTalks,
          inspections: data.safety.inspections,
          incidents: data.safety.incidents,
          oshaRecordable: data.safety.oshaRecordable,
          nearMisses: data.safety.nearMisses,
          aiGenerated: true,
          aiConfidence: data.safety.confidence,
        },
      });
    }

    // Apply delays
    for (const delay of data.delays) {
      await this.prisma.delayEntry.create({
        data: {
          dailyLogId,
          cause: delay.cause as DelayCause,
          description: delay.description,
          durationMinutes: delay.durationMinutes,
          impactedTrades: delay.impactedTrades,
          aiGenerated: true,
          aiConfidence: delay.confidence,
        },
      });
    }

    // Mark voice note as processed
    await this.prisma.voiceNote.update({
      where: { id },
      data: { status: 'PROCESSED' },
    });

    return this.dailyLogsService.findOne(dailyLogId, projectId);
  }

  async reprocess(id: string) {
    const note = await this.findOne(id);
    if (!note.transcript) {
      throw new BadRequestException('No transcript available for reprocessing');
    }

    await this.prisma.voiceNote.update({
      where: { id },
      data: { status: 'EXTRACTING', processingError: null },
    });

    await this.voiceQueue.add('process', {
      voiceNoteId: note.id,
      audioUrl: note.audioUrl,
    });

    return { message: 'Reprocessing queued', voiceNoteId: id };
  }
}
