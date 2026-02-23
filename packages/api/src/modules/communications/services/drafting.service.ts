import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface DraftInput {
  type: string;
  recipient: string;
  subject: string;
  urgency: string;
  context: string;
  projectName: string;
  senderName: string;
  senderCompany: string;
  recentLogSummary?: string;
}

export interface DraftOutput {
  subject: string;
  body: string;
  tokensUsed: number;
}

@Injectable()
export class DraftingService {
  private readonly logger = new Logger(DraftingService.name);

  constructor(private configService: ConfigService) {}

  async draftMessage(input: DraftInput): Promise<DraftOutput> {
    const model = this.createModel('claude-sonnet-4-20250514');

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = result.text;
    let subject = input.subject;
    let body = text;

    const subjectMatch = text.match(/^Subject:\s*(.+?)$/m);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = text.replace(/^Subject:\s*.+?\n+/m, '').trim();
    }

    return {
      subject,
      body,
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

  private buildSystemPrompt(input: DraftInput): string {
    const base = `You are a professional construction communications assistant for ${input.senderCompany}. You draft clear, professional messages on behalf of ${input.senderName}.

RULES:
- Be professional but not stiff. Construction communications are direct.
- Include specific details from the context provided — dates, quantities, locations, trade names.
- Keep it concise. Nobody reads long emails on a jobsite.
- Use proper construction terminology.
- Include a clear call to action or request in every message.
- Sign off with the sender's name and company.`;

    switch (input.type) {
      case 'EMAIL':
        return `${base}

EMAIL FORMAT:
- Write a professional email with a clear subject line.
- Open with context, state the issue/request, close with action needed.
- Keep under 200 words unless the situation requires more detail.
- Start with "Subject: [subject line]" on the first line, then a blank line, then the email body.`;

      case 'TEXT':
        return `${base}

TEXT MESSAGE FORMAT:
- Write a brief, professional text message.
- Maximum 2-3 sentences.
- Get straight to the point.
- No formal greeting needed — just the key info and action item.
- Do NOT include a Subject line.`;

      case 'RFI':
        return `${base}

RFI (REQUEST FOR INFORMATION) FORMAT:
- This is a formal request for information to the architect/engineer/design team.
- Start with "Subject: RFI - [descriptive title]"
- Include: reference to specific drawing/spec section if mentioned, clear description of the question or discrepancy, why you need this information (impact on work), requested response date based on urgency.
- Use formal but direct language.
- Reference specific locations (building, floor, grid line) if known.`;

      case 'CHANGE_ORDER':
        return `${base}

CHANGE ORDER REQUEST FORMAT:
- This is a formal notification of a potential change to the contract scope.
- Start with "Subject: Change Order Request - [descriptive title]"
- Include: description of the changed condition or additional work, reference to original contract scope, reason for the change, request for written authorization before proceeding.
- Note that cost impact will be provided separately (do NOT make up numbers).
- This is a contractual document — be precise and factual.`;

      case 'CALL':
        return `${base}

CALL TALKING POINTS FORMAT:
- Write brief talking points for a phone call.
- Bullet point format with 3-5 key points to cover.
- Include the purpose of the call at the top.
- End with "Action items to confirm" section.
- Do NOT include a Subject line.`;

      default:
        return base;
    }
  }

  private buildUserPrompt(input: DraftInput): string {
    let prompt = `Draft a ${input.type.toLowerCase()} to ${input.recipient}.

Topic: ${input.subject}
Urgency: ${input.urgency}
Context: ${input.context}

Project: ${input.projectName}
From: ${input.senderName}, ${input.senderCompany}`;

    if (input.recentLogSummary) {
      prompt += `\n\nRecent project activity for context:\n${input.recentLogSummary}`;
    }

    return prompt;
  }
}
