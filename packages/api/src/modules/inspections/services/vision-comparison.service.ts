import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Zod schema for structured inspection output
export const inspectionResultSchema = z.object({
  overallAssessment: z.enum(['PASS', 'FAIL', 'NEEDS_ATTENTION', 'INCONCLUSIVE']),
  overallScore: z.number().min(0).max(100).describe('Compliance score 0-100'),
  summary: z.string().describe('2-3 sentence executive summary of findings'),
  findings: z.array(
    z.object({
      category: z.enum([
        'DIMENSION', 'MATERIAL', 'PLACEMENT', 'FINISH',
        'SAFETY', 'CODE_COMPLIANCE', 'WORKMANSHIP', 'MISSING_ELEMENT', 'OTHER',
      ]),
      severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION']),
      description: z.string().describe('Specific finding — what was observed'),
      expectedCondition: z.string().optional().describe('What the spec/drawing requires'),
      actualCondition: z.string().describe('What the photo shows'),
      recommendation: z.string().describe('What to do about it'),
      confidence: z.number().min(0).max(1),
    }),
  ),
  specReferences: z.array(
    z.string().describe('Specific spec sections, drawing details, or code references that apply'),
  ).optional(),
  photoCoverage: z.string().describe('Assessment of what the photo shows and any limitations — angles, lighting, obstructions'),
});

export type InspectionResultData = z.infer<typeof inspectionResultSchema>;

@Injectable()
export class VisionComparisonService {
  private readonly logger = new Logger(VisionComparisonService.name);

  constructor(private configService: ConfigService) {}

  async analyzePhoto(params: {
    photoPath: string;
    photoMimeType: string;
    inspectionType: string;
    title: string;
    description?: string;
    documentContext?: string;
    ragContext?: string;
    projectName?: string;
  }): Promise<{ result: InspectionResultData; tokensUsed: number }> {
    const model = this.createModel('claude-sonnet-4-20250514');

    // Read photo as base64
    const absolutePath = path.resolve(params.photoPath);
    const photoBuffer = fs.readFileSync(absolutePath);
    const photoBase64 = photoBuffer.toString('base64');

    // Determine media type for the API
    const mediaType = params.photoMimeType === 'image/png' ? 'image/png' as const
      : params.photoMimeType === 'image/webp' ? 'image/webp' as const
      : 'image/jpeg' as const;

    // Build the system prompt based on inspection type
    const systemPrompt = this.buildSystemPrompt(params.inspectionType, params.projectName);

    // Build the user message with context
    let userMessage = `Inspection: ${params.title}`;
    if (params.description) userMessage += `\nDescription: ${params.description}`;

    if (params.documentContext) {
      userMessage += `\n\n--- REFERENCE DOCUMENT CONTEXT ---\n${params.documentContext}`;
    }

    if (params.ragContext) {
      userMessage += `\n\n--- ADDITIONAL PROJECT CONTEXT ---\n${params.ragContext}`;
    }

    userMessage += '\n\nAnalyze the attached photo against the reference context above. Provide your structured assessment.';

    const result = await generateObject({
      model,
      schema: inspectionResultSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: photoBase64,
              mimeType: mediaType,
            },
            {
              type: 'text',
              text: userMessage,
            },
          ],
        },
      ],
    });

    return {
      result: result.object,
      tokensUsed: result.usage?.totalTokens ?? 0,
    };
  }

  private createModel(modelId: string) {
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      return anthropic(modelId);
    }
    const openrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (openrouterKey) {
      const openrouter = createOpenAI({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter(`anthropic/${modelId}`);
    }
    throw new Error('No AI provider configured: set ANTHROPIC_API_KEY or OPENROUTER_API_KEY');
  }

  private buildSystemPrompt(inspectionType: string, projectName?: string): string {
    const base = `You are XO, an AI construction inspector for ${projectName || 'a construction project'}. You analyze jobsite photos and compare them against reference documents, drawings, specifications, and safety standards.

CORE RULES:
- Be specific and actionable. Field workers need to know EXACTLY what to fix.
- Reference specific spec sections, drawing details, or code requirements when possible.
- If the photo quality or angle makes it impossible to assess something, say so — don't guess.
- Distinguish between code/safety violations (CRITICAL/MAJOR) and cosmetic/quality issues (MINOR/OBSERVATION).
- Use construction terminology naturally: plumb, level, square, flush, proud, shy, etc.
- When in doubt, flag as NEEDS_ATTENTION rather than PASS — safety first.
- Consider the construction context: framing tolerances differ from finish work tolerances.`;

    switch (inspectionType) {
      case 'DRAWING_COMPARISON':
        return `${base}

DRAWING COMPARISON MODE:
- Compare the photo against the provided drawing details and dimensions.
- Check for: correct placement, proper dimensions (within tolerance), correct materials, proper orientation.
- Flag any deviations from the drawings even if they might be intentional field changes — those should go through the change order process.
- Note if key elements shown in the drawings are missing from the photo.`;

      case 'SPEC_COMPLIANCE':
        return `${base}

SPECIFICATION COMPLIANCE MODE:
- Compare the photo against the provided specification requirements.
- Check for: correct materials, proper installation methods, required clearances, proper finishes.
- Reference specific spec sections when noting compliance or non-compliance.
- Pay special attention to fire ratings, structural connections, and waterproofing details.`;

      case 'SAFETY_CHECK':
        return `${base}

SAFETY INSPECTION MODE:
- Evaluate the photo for OSHA compliance and general jobsite safety.
- Check for: fall protection (guardrails, covers, PPE), housekeeping, proper shoring/bracing, electrical safety, fire prevention, signage.
- Reference EM 385-1-1 sections when applicable (federal/Army Corps projects).
- Reference 29 CFR 1926 (OSHA Construction Standards) when applicable.
- CRITICAL findings = imminent danger or serious violation. MAJOR = other-than-serious violation. MINOR = general duty concern.
- If fall protection is missing above 6 feet, that is ALWAYS critical.`;

      case 'QUALITY_CHECK':
        return `${base}

QUALITY INSPECTION MODE:
- Assess workmanship quality in the photo.
- Check for: plumb/level/square, proper fastening, clean cuts, proper spacing, finish quality.
- Consider tolerances appropriate for the trade: rough framing (1/4"), finish carpentry (1/16"), concrete (1/8" in 10').
- Note any deficiencies that would fail a typical building inspection.`;

      case 'PROGRESS_PHOTO':
        return `${base}

PROGRESS DOCUMENTATION MODE:
- Document what work is visible in the photo.
- Identify trades, materials, and installation stages visible.
- Estimate percent complete if possible based on visible work.
- Note any obvious quality or safety concerns even though this is primarily a progress photo.
- Describe the photo clearly for project records — someone reading this months later should understand what they're seeing.`;

      default:
        return `${base}

GENERAL INSPECTION MODE:
- Analyze the photo for any construction-related observations.
- Note quality, safety, progress, and compliance observations.
- Flag anything that looks wrong or unusual.`;
    }
  }
}
