import { api } from '../client';

export interface AskXOSource {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string;
  sourceDate: string | null;
  similarity: number;
  timeWeightedScore: number;
  metadata: Record<string, unknown> | null;
}

export interface AskXOResponse {
  answer: string;
  sources: AskXOSource[];
  tokensUsed?: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function askXO(
  projectId: string,
  question: string,
  conversationHistory?: ConversationMessage[],
): Promise<AskXOResponse> {
  return api<AskXOResponse>(`/projects/${projectId}/memory/ask`, {
    method: 'POST',
    body: { question, conversationHistory },
  });
}
