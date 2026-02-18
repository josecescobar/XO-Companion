import { z } from 'zod';

export const dailyLogExtractionSchema = z.object({
  weather: z
    .object({
      conditions: z.array(z.string()).describe('Weather conditions: CLEAR, RAIN, SNOW, etc.'),
      tempHigh: z.number().nullable().describe('High temperature in Fahrenheit'),
      tempLow: z.number().nullable().describe('Low temperature in Fahrenheit'),
      precipitation: z.string().nullable(),
      windSpeed: z.number().nullable(),
      delayMinutes: z.number().default(0),
      confidence: z.number().min(0).max(1),
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
      foreman: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),

  equipment: z.array(
    z.object({
      equipmentType: z.string(),
      operatingHours: z.number(),
      idleHours: z.number().default(0),
      condition: z.enum(['OPERATIONAL', 'NEEDS_MAINTENANCE', 'DOWN_FOR_REPAIR', 'IDLE']),
      confidence: z.number().min(0).max(1),
    }),
  ),

  workCompleted: z.array(
    z.object({
      location: z.string().describe('Location on site, e.g., Building A Floor 3'),
      csiCode: z.string().nullable().describe('CSI MasterFormat 6-digit code if identifiable'),
      description: z.string(),
      percentComplete: z.number().min(0).max(100).nullable(),
      quantity: z.number().nullable(),
      unit: z.string().nullable().describe('Unit of measure: LF, SF, CY, EA, etc.'),
      confidence: z.number().min(0).max(1),
    }),
  ),

  materials: z.array(
    z.object({
      material: z.string(),
      quantity: z.number(),
      unit: z.string(),
      supplier: z.string().nullable(),
      ticketNumber: z.string().nullable(),
      condition: z.enum(['GOOD', 'DAMAGED', 'PARTIAL_DELIVERY', 'REJECTED']).default('GOOD'),
      confidence: z.number().min(0).max(1),
    }),
  ),

  safety: z
    .object({
      toolboxTalks: z.array(z.string()),
      inspections: z.array(z.string()),
      incidents: z.array(z.string()),
      oshaRecordable: z.boolean().default(false),
      nearMisses: z.number().int().default(0),
      confidence: z.number().min(0).max(1),
    })
    .nullable(),

  delays: z.array(
    z.object({
      cause: z.enum([
        'WEATHER', 'MATERIAL_SHORTAGE', 'EQUIPMENT_FAILURE', 'LABOR_SHORTAGE',
        'DESIGN_CHANGE', 'OWNER_DIRECTED', 'PERMIT_ISSUE', 'INSPECTION_HOLD',
        'UTILITY_CONFLICT', 'SUBCONTRACTOR', 'SAFETY_STOP', 'OTHER',
      ]),
      description: z.string(),
      durationMinutes: z.number().int().positive(),
      impactedTrades: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type DailyLogExtraction = z.infer<typeof dailyLogExtractionSchema>;
