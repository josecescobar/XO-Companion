import { Injectable } from '@nestjs/common';

export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
}

@Injectable()
export class ChunkingService {
  private readonly TARGET_CHARS = 2048; // ~512 tokens at 4 chars/token
  private readonly OVERLAP_CHARS = 256; // ~64 tokens overlap

  chunk(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) return [];

    const sentences = text.match(/[^.!?\n]+[.!?\n]?\s*/g) || [text];
    const chunks: TextChunk[] = [];
    let current = '';
    let idx = 0;

    for (const sentence of sentences) {
      if (current.length + sentence.length > this.TARGET_CHARS && current.length > 0) {
        chunks.push({
          content: current.trim(),
          index: idx++,
          tokenCount: Math.ceil(current.trim().length / 4),
        });
        const overlapStart = Math.max(0, current.length - this.OVERLAP_CHARS);
        current = current.slice(overlapStart) + sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim().length > 0) {
      chunks.push({
        content: current.trim(),
        index: idx,
        tokenCount: Math.ceil(current.trim().length / 4),
      });
    }

    return chunks;
  }
}
