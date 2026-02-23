import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { dailyLogExtractionSchema, DailyLogExtraction } from '../schemas/daily-log-extraction.schema';
import { CONSTRUCTION_SYSTEM_PROMPT } from '../schemas/construction-vocabulary';

@Injectable()
export class LlmExtractionService {
  private readonly logger = new Logger(LlmExtractionService.name);

  constructor(private configService: ConfigService) {}

  async extract(transcript: string): Promise<DailyLogExtraction> {
    const primaryModel = this.configService.get<string>('AI_PRIMARY_MODEL') || 'claude-sonnet-4-20250514';

    try {
      return await this.extractWithModel(transcript, primaryModel);
    } catch (error) {
      this.logger.warn(`Primary model (${primaryModel}) failed, trying fallback: ${error}`);
      const fallbackModel = this.configService.get<string>('AI_FALLBACK_MODEL') || 'gpt-4o-mini';
      return await this.extractWithModel(transcript, fallbackModel);
    }
  }

  private async extractWithModel(transcript: string, modelId: string): Promise<DailyLogExtraction> {
    this.logger.log(`Extracting with model: ${modelId}`);

    const model = this.createModel(modelId);

    const result = await generateObject({
      model,
      schema: dailyLogExtractionSchema,
      system: CONSTRUCTION_SYSTEM_PROMPT,
      prompt: `Extract structured daily log data from this field voice recording transcript:\n\n${transcript}`,
    });

    this.logger.log('Extraction complete');
    return result.object;
  }

  private createModel(modelId: string) {
    if (modelId.startsWith('claude') || modelId.startsWith('anthropic')) {
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
    }

    if (modelId.startsWith('llama') || modelId.startsWith('groq/')) {
      const groq = createOpenAI({
        apiKey: this.configService.get<string>('GROQ_API_KEY'),
        baseURL: 'https://api.groq.com/openai/v1',
      });
      return groq(modelId.replace('groq/', ''));
    }

    const openai = createOpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    return openai(modelId);
  }
}
