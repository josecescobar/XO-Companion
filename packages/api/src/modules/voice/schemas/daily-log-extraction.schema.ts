import { z } from 'zod';

export const dailyLogExtractionSchema = z.object({
  weather: z
    .object({
      conditions: z.array(z.string()).describe('Weather conditions: CLEAR, RAIN, SNOW, etc.'),
      tempHigh: z.number().nullable().optional().describe('High temperature in Fahrenheit'),
      tempLow: z.number().nullable().optional().describe('Low temperature in Fahrenheit'),
      precipitation: z.string().nullable().optional(),
      windSpeed: z.number().nullable().optional(),
      delayMinutes: z.number().default(0),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    })
    .nullable()
    .describe('Weather information from the transcript'),

  workforce: z.array(
    z.object({
      trade: z.string().describe('Trade or craft, e.g., Electrician, Carpenter'),
      company: z.string().describe('Subcontractor company name'),
      workerCount: z.number().int().positive(),
      hoursWorked: z.number().positive(),
      overtimeHours: z.number().default(0),
      foreman: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    }),
  ),

  equipment: z.array(
    z.object({
      equipmentType: z.string(),
      operatingHours: z.number(),
      idleHours: z.number().default(0),
      condition: z.enum(['OPERATIONAL', 'NEEDS_MAINTENANCE', 'DOWN_FOR_REPAIR', 'IDLE']).default('OPERATIONAL'),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    }),
  ),

  workCompleted: z.array(
    z.object({
      location: z.string().describe('Location on site, e.g., Building A Floor 3'),
      csiCode: z.string().nullable().optional().describe('CSI MasterFormat 6-digit code if identifiable'),
      description: z.string(),
      percentComplete: z.number().min(0).max(100).nullable().optional(),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional().describe('Unit of measure: LF, SF, CY, EA, etc.'),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    }),
  ),

  materials: z.array(
    z.object({
      material: z.string(),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
      supplier: z.string().nullable().optional(),
      ticketNumber: z.string().nullable().optional(),
      condition: z.enum(['GOOD', 'DAMAGED', 'PARTIAL_DELIVERY', 'REJECTED']).default('GOOD'),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    }),
  ),

  safety: z
    .object({
      toolboxTalks: z.array(z.string()).default([]),
      inspections: z.array(z.string()).default([]),
      incidents: z.array(z.string()).default([]),
      oshaRecordable: z.boolean().default(false),
      nearMisses: z.number().int().default(0),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    })
    .nullable(),

  delays: z.array(
    z.object({
      cause: z.enum([
        'WEATHER', 'MATERIAL_SHORTAGE', 'EQUIPMENT_FAILURE', 'LABOR_SHORTAGE',
        'DESIGN_CHANGE', 'OWNER_DIRECTED', 'PERMIT_ISSUE', 'INSPECTION_HOLD',
        'UTILITY_CONFLICT', 'SUBCONTRACTOR', 'SAFETY_STOP', 'OTHER',
      ]).default('OTHER'),
      description: z.string(),
      durationMinutes: z.number().int().positive(),
      impactedTrades: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional().describe('Brief reason for the confidence score'),
    }),
  ),

  nextActions: z.array(
    z.object({
      description: z.string().describe('What needs to be done'),
      assignee: z.string().nullable().optional().describe('Who should do it'),
      dueDate: z.string().nullable().optional().describe('When — "tomorrow", "Monday", specific date'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      category: z.enum([
        'INSPECTION', 'MATERIAL_ORDER', 'SUBCONTRACTOR',
        'CLIENT_COMMUNICATION', 'PERMIT', 'EQUIPMENT', 'SAFETY', 'OTHER',
      ]).default('OTHER'),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional(),
    }),
  ),

  communications: z.array(
    z.object({
      type: z.enum(['EMAIL', 'TEXT', 'CALL', 'RFI', 'CHANGE_ORDER']),
      recipient: z.string().describe('Who to contact — name, role, or company'),
      subject: z.string(),
      urgency: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
      context: z.string().describe('Why this communication is needed'),
      confidence: z.number().min(0).max(1),
      confidenceReason: z.string().optional(),
    }),
  ),
});

export type DailyLogExtraction = z.infer<typeof dailyLogExtractionSchema>;
