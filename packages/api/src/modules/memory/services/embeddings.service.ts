import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private embeddingModel: any;
  private available = true;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey || apiKey === 'your-openai-api-key') {
      this.logger.warn(
        'OPENAI_API_KEY not configured. Chunks will be stored without embeddings. ' +
          'Set OPENAI_API_KEY and call POST /memory/re-embed to generate embeddings later.',
      );
      this.available = false;
      return;
    }
    const openai = createOpenAI({ apiKey });
    this.embeddingModel = openai.embedding('text-embedding-3-small');
  }

  isAvailable(): boolean {
    return this.available;
  }

  async embedOne(text: string): Promise<number[] | null> {
    if (!this.available) return null;
    try {
      const { embedding: vec } = await embed({
        model: this.embeddingModel,
        value: text,
      });
      return vec;
    } catch (error: any) {
      this.logger.error(`Embedding failed: ${error.message}`);
      if (
        error.message?.includes('429') ||
        error.message?.includes('insufficient_quota')
      ) {
        this.logger.warn(
          'OpenAI quota exhausted. Disabling embeddings for this session.',
        );
        this.available = false;
      }
      return null;
    }
  }

  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.available || texts.length === 0) return texts.map(() => null);
    try {
      const { embeddings } = await embedMany({
        model: this.embeddingModel,
        values: texts,
      });
      return embeddings;
    } catch (error: any) {
      this.logger.error(`Batch embedding failed: ${error.message}`);
      if (
        error.message?.includes('429') ||
        error.message?.includes('insufficient_quota')
      ) {
        this.available = false;
      }
      return texts.map(() => null);
    }
  }
}
