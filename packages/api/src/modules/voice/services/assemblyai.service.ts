import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssemblyAI } from 'assemblyai';

@Injectable()
export class AssemblyAiService {
  private client: AssemblyAI;
  private readonly logger = new Logger(AssemblyAiService.name);

  constructor(private configService: ConfigService) {
    this.client = new AssemblyAI({
      apiKey: this.configService.get<string>('ASSEMBLYAI_API_KEY')!,
    });
  }

  async transcribe(audioUrl: string): Promise<{ transcript: string; id: string }> {
    this.logger.log(`Starting transcription for: ${audioUrl}`);

    const transcript = await this.client.transcripts.transcribe({
      audio: audioUrl,
      language_detection: true,
      word_boost: [
        'CMU', 'SOG', 'RFI', 'OSHA', 'GC', 'T&M',
        'rough in', 'trim out', 'top out', 'dry in',
        'rebar', 'conduit', 'drywall', 'framing',
        'excavator', 'backhoe', 'bobcat', 'skid steer',
        'scaffolding', 'harness', 'hard hat', 'PPE',
      ],
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    this.logger.log(`Transcription complete: ${transcript.id}`);
    return {
      transcript: transcript.text || '',
      id: transcript.id,
    };
  }
}
