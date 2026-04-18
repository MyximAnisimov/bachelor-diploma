import React, { useState } from 'react';
import type { AiAssistant, AiChatRequest, AiChatResponse } from '../types/ai';
import { sendAiMessage } from '../api/ai';

type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface Props {
  boardUuid: string;
  assistants: AiAssistant[];
  initialAssistant: AiAssistant | null;
  context?: Record<string, any>;
  onClose: () => void;
}

export const AiChatDialog: React.FC<Props> = ({
  boardUuid,
  assistants,
  initialAssistant,
  context,
  onClose,
}) => {
  const [selectedAssistant, setSelectedAssistant] = useState<AiAssistant | null>(
    initialAssistant && initialAssistant.available ? initialAssistant : null,
  );
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedAssistant) return;

    const userMsg: AiMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const req: AiChatRequest = {
        assistantId: selectedAssistant.id,
        boardUuid,
        message: text,
        context,
      };

      const res: AiChatResponse = await sendAiMessage(req);

      const aiMsg: AiMessage = {
        role: 'assistant',
        content: res.response,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error('AI chat error', e);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Ошибка при запросе к ИИ‑ассистенту.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter' && !loading) {
    e.preventDefault();
    handleSend();
  }
};

  const currentModelLabel = selectedAssistant
    ? `${selectedAssistant.name}${selectedAssistant.local ? ' (локальная модель)' : ''}`
    : 'Модель не выбрана';

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 420,
        height: 320,
        background: '#f3f3f5',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        overflow: 'hidden',
        border: '1px solid #ddd',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>ИИ‑ассистент</span>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

     <div
       style={{
         padding: '8px 12px 4px',
         display: 'flex',
         alignItems: 'center',
         gap: 8,
       }}
     >
       <span style={{ fontSize: 12, color: '#555' }}>Модель:</span>
       <select
         value={selectedAssistant?.id || ''}
         onChange={(e) => {
           const id = e.target.value;
           const found = assistants.find(a => a.id === id && a.available);
           setSelectedAssistant(found || null);
           setMessages([]);
         }}
         style={{
           flex: 1,
           fontSize: 12,
           padding: '4px 6px',
           borderRadius: 6,
           border: '1px solid #ccc',
           background: '#fff',
         }}
       >
         <option value="">Выберите модель…</option>
         {assistants.map(a => (
           <option key={a.id} value={a.id} disabled={!a.available}>
             {a.name}{a.local ? ' (лок.)' : ''}
           </option>
         ))}
       </select>
     </div>

      <div
        style={{
          flex: 1,
          padding: '4px 12px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'rgba(0,0,0,0.5)',
            marginBottom: messages.length ? 4 : 12,
          }}
        >
          {currentModelLabel}
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
            }}
          >
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                background: m.role === 'user' ? '#dbeafe' : '#e5e7eb',
                fontSize: 13,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {!messages.length && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: 'rgba(0,0,0,0.4)',
            }}
          >
            Выберите ИИ‑модель сверху и задайте свой вопрос в поле снизу.
          </div>
        )}
      </div>

      {/* Нижнее поле ввода */}
      <div
        style={{
          padding: '8px 10px',
          borderTop: '1px solid #e0e0e0',
          background: 'transparent',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            borderRadius: 999,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            padding: '4px 8px',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задайте свой вопрос"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              background: 'transparent',
            }}
            disabled={!selectedAssistant || loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !selectedAssistant || loading}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              cursor: (!input.trim() || !selectedAssistant || loading)
                ? 'default'
                : 'pointer',
              background: (!input.trim() || !selectedAssistant || loading)
                ? '#e5e7eb'
                : '#2563eb',
              color: (!input.trim() || !selectedAssistant || loading)
                ? '#9ca3af'
                : '#ffffff',
            }}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
};