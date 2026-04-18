import { api } from './http';
import type { AiAssistant, AiChatRequest, AiChatResponse } from '../types/ai';

export async function fetchAssistants(): Promise<AiAssistant[]> {
  const res = await api.get<AiAssistant[]>('/api/ai/assistants');
  return res.data;
}

export async function sendAiMessage(req: AiChatRequest): Promise<AiChatResponse> {
  const res = await api.post<AiChatResponse>('/api/ai/chat', req);
  return res.data;
}