export interface AiAssistant {
  id: string;
  name: string;
  description: string;
  local: boolean;
  available: boolean;
}

export interface AiChatRequest {
  assistantId: string;
  boardUuid: string;
  message: string;
  context?: Record<string, any>;
}

export interface AiChatResponse {
  assistantId: string;
  response: string;
}