import React, {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
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

  messages: AiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;

  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;

  size: { width: number; height: number };
  setSize: (size: { width: number; height: number }) => void;
}

export const AiChatDialog: React.FC<Props> = ({
  boardUuid,
  assistants,
  initialAssistant,
  context,
  onClose,
  messages,
  setMessages,
  position,
  setPosition,
  size,
  setSize,
}) => {
  const [selectedAssistant, setSelectedAssistant] = useState<AiAssistant | null>(
    initialAssistant && initialAssistant.available ? initialAssistant : null,
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 320;
  const MAX_WIDTH = 900;
  const MAX_HEIGHT = 800;

  type DragOffset = { dx: number; dy: number } | null;
  type ResizeStart = {
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
  } | null;

  const [dragOffset, _setDragOffset] = useState<DragOffset>(null);
  const [resizeStart, _setResizeStart] = useState<ResizeStart>(null);

  const dragOffsetRef = useRef<DragOffset>(null);
  const resizeStartRef = useRef<ResizeStart>(null);

  const setDragOffset = (val: DragOffset) => {
    dragOffsetRef.current = val;
    _setDragOffset(val);
  };

  const setResizeStart = (val: ResizeStart) => {
    resizeStartRef.current = val;
    _setResizeStart(val);
  };

  const positionRef = useRef(position);
  const sizeRef = useRef(size);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOffset({
      dx: e.clientX - positionRef.current.x,
      dy: e.clientY - positionRef.current.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: sizeRef.current.width,
      height: sizeRef.current.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragOffsetRef.current;
      const resize = resizeStartRef.current;

      if (!drag && !resize) return;

      if (drag) {
        const newX = e.clientX - drag.dx;
        const newY = e.clientY - drag.dy;
        setPosition({ x: newX, y: newY });
      }

      if (resize) {
        const dx = e.clientX - resize.mouseX;
        const dy = e.clientY - resize.mouseY;

        let newWidth = resize.width + dx;
        let newHeight = resize.height + dy;

        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (dragOffsetRef.current) {
        setDragOffset(null);
      }
      if (resizeStartRef.current) {
        setResizeStart(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setPosition, setSize]);

  const currentModelLabel = selectedAssistant
    ? `${selectedAssistant.name}${selectedAssistant.local ? ' (локальная модель)' : ''}`
    : 'Модель не выбрана';

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedAssistant || loading) return;

    const userMsg: AiMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
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
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error('AI chat error', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ошибка при запросе к ИИ‑ассистенту.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  const safeMessages = messages ?? [];

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        background: '#f3f3f5',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        overflow: 'hidden',
        border: '1px solid #ddd',
        color: '#000',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#2563eb',
          color: '#fff',
          cursor: 'move',
          userSelect: 'none',
        }}
        onMouseDown={handleDragMouseDown}
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
            color: '#fff',
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
        <span style={{ fontSize: 12, color: '#333' }}>Модель:</span>
        <select
          value={selectedAssistant?.id || ''}
          onChange={(e) => {
            const id = e.target.value;
            const found = assistants.find((a) => a.id === id && a.available);
            setSelectedAssistant(found || null);
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
          {assistants.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.available}>
              {a.name}
              {a.local ? ' (лок.)' : ''}
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
          background: '#fafafa',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'rgba(0,0,0,0.6)',
            marginBottom: safeMessages.length ? 4 : 12,
          }}
        >
          {currentModelLabel}
        </div>

        {safeMessages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
            }}
          >
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                background: m.role === 'user' ? '#dbeafe' : '#ffffff',
                fontSize: 13,
                color: '#000',
                border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
              }}
            >
              <ReactMarkdown
                components={{
                  code({ inline, children, ...props }) {
                    return (
                      <code
                        style={{
                          background: '#f3f4f6',
                          padding: inline ? '2px 4px' : '6px 8px',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          display: inline ? 'inline' : 'block',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  ul({ children, ...props }) {
                    return (
                      <ul
                        style={{ paddingLeft: 18, margin: '4px 0' }}
                        {...props}
                      >
                        {children}
                      </ul>
                    );
                  },
                  ol({ children, ...props }) {
                    return (
                      <ol
                        style={{ paddingLeft: 18, margin: '4px 0' }}
                        {...props}
                      >
                        {children}
                      </ol>
                    );
                  },
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {!safeMessages.length && (
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

        {loading && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: 'rgba(0,0,0,0.6)',
            }}
          >
            Модель думает…
          </div>
        )}
      </div>

      <div
        style={{
          padding: '8px 10px',
          borderTop: '1px solid #e0e0e0',
          background: '#f9fafb',
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
              color: '#000',
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
              cursor:
                !input.trim() || !selectedAssistant || loading
                  ? 'default'
                  : 'pointer',
              background:
                !input.trim() || !selectedAssistant || loading
                  ? '#e5e7eb'
                  : '#2563eb',
              color:
                !input.trim() || !selectedAssistant || loading
                  ? '#9ca3af'
                  : '#ffffff',
            }}
          >
            Отправить
          </button>
        </div>
      </div>

      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'se-resize',
          background: 'transparent',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: 3,
            bottom: 3,
            width: 10,
            height: 10,
            borderRight: '2px solid #9ca3af',
            borderBottom: '2px solid #9ca3af',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
};