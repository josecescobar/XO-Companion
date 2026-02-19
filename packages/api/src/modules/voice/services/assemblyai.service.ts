import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssemblyAI } from 'assemblyai';

@Injectable()
export class AssemblyAiService {
  private client: AssemblyAI;
  private readonly logger = new Logger(AssemblyAiService.name);

  private static readonly BASE_KEYTERMS = [
    'CMU', 'SOG', 'RFI', 'OSHA', 'GC', 'T&M',
    'rough in', 'trim out', 'top out', 'dry in',
    'rebar', 'conduit', 'drywall', 'framing',
    'excavator', 'backhoe', 'bobcat', 'skid steer',
    'scaffolding', 'harness', 'hard hat', 'PPE',
  ];

  constructor(private configService: ConfigService) {
    this.client = new AssemblyAI({
      apiKey: this.configService.get<string>('ASSEMBLYAI_API_KEY')!,
    });
  }

  async transcribe(
    audioPath: string,
    customVocabulary?: string[],
  ): Promise<{ transcript: string; id: string; durationMs: number }> {
    this.logger.log(`Starting transcription for: ${audioPath}`);

    // Merge base keyterms with custom vocabulary (deduplicated)
    const allTerms = [...new Set([
      ...AssemblyAiService.BASE_KEYTERMS,
      ...(customVocabulary || []),
    ])];

    const transcript = await this.client.transcripts.transcribe({
      audio: audioPath,
      speech_models: ['universal-3-pro'],
      language_detection: true,
      keyterms_prompt: allTerms,
      speaker_labels: true,
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    const durationMs = Math.round((transcript.audio_duration ?? 0) * 1000);

    this.logger.log(`Transcription complete: ${transcript.id} (${durationMs}ms)`);
    return {
      transcript: transcript.text || '',
      id: transcript.id,
      durationMs,
    };
  }
}
