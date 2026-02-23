import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailParams {
  to: string;
  from?: string;
  subject: string;
  body: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly defaultFrom: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM_ADDRESS') || 'XO Companion <noreply@xo-companion.com>';

    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not set — emails will be skipped');
    }
  }

  /**
   * Send an email via Resend API. Returns the Resend message ID on success.
   * If RESEND_API_KEY is not configured, logs a warning and returns null.
   */
  async sendEmail(params: SendEmailParams): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn(`Email skipped (no API key): "${params.subject}" to ${params.to}`);
      return null;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from || this.defaultFrom,
        to: [params.to],
        subject: params.subject,
        html: params.body,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const message = `Resend API error ${response.status}: ${errorBody}`;
      this.logger.error(message);
      throw new Error(message);
    }

    const data = (await response.json()) as ResendResponse;
    this.logger.log(`Email sent: "${params.subject}" to ${params.to} (id: ${data.id})`);
    return data.id;
  }
}
