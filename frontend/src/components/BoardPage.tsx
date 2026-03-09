import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBoard } from '../api/boards';
import { getBoardElements, createElement } from '../api/elements';
import { useBoardWs } from '../hooks/useBoardsWs';
import { clientId } from '../api/clientId';
import type { BoardDto, BoardElementDto } from '../api/types';
import { BoardCanvas } from './BoardCanvas';

type Tool = 'SELECT' | 'HAND' | 'BRUSH' | 'TEXT' | 'STICKER' | 'ARROW';

export const BoardPage: React.FC = () => {
  const { boardUuid } = useParams<{ boardUuid: string }>();
  const [board, setBoard] = useState<BoardDto | null>(null);
  const [elements, setElements] = useState<BoardElementDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [tool, setTool] = useState<Tool>('SELECT');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!boardUuid) return;
    (async () => {
      try {
        const [b, els] = await Promise.all([
          getBoard(boardUuid),
          getBoardElements(boardUuid),
        ]);
        setBoard(b);
        setElements(els);
      } finally {
        setLoading(false);
      }
    })();
  }, [boardUuid]);

  const handleAddRect = async () => {
    if (!boardUuid) return;
    const el = await createElement(boardUuid, {
      type: 'SHAPE',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      properties: {
        shapeType: 'RECT',
        fill: '#ffcc00',
        stroke: '#333',
      },
    });
    setElements(prev => [...prev, el]);
  };

  const [locks, setLocks] = useState<Record<number, string>>({});
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number }>>({});

useBoardWs({
  boardUuid,
  onLockMessage: (msg) => {
    console.log('LOCK MSG IN BoardPage', msg);
    const { elementIds, clientId: owner, action, success, error } = msg;

    if (success === false) {
      if (owner === clientId) {
        console.warn(
          'Не удалось захватить элементы, уже заняты другим пользователем:',
          elementIds,
          error ?? '',
        );
        setSelectedIds((prev) => prev.filter((id) => !elementIds.includes(id)));
      }
      return;
    }

    setLocks((prev) => {
      const copy: Record<number, string> = { ...prev };

      if (action === 'LOCK') {
        elementIds.forEach((id: number) => {
          copy[id] = owner;
        });
      } else if (action === 'UNLOCK') {
        elementIds.forEach((id: number) => {
          if (copy[id] === owner) {
            delete copy[id];
          }
        });
      }

      return copy;
    });
  },

  onCursorMessage: (msg) => {
    const { clientId: sender, x, y } = msg;
    if (sender === clientId) return;
    setRemoteCursors((prev) => ({
      ...prev,
      [sender]: { x, y },
    }));
  },

  onElementMessage: (msg) => {
    setElements((prev) => {
      if (msg.action === 'DELETE') {
        return prev.filter((el) => el.id !== msg.element.id);
      }
      const exists = prev.some((el) => el.id === msg.element.id);
      if (exists) {
        return prev.map((el) =>
          el.id === msg.element.id ? msg.element : el,
        );
      }
      return [...prev, msg.element];
    });
  },
});


  if (loading || !board) return <div>Загрузка...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          padding: 8,
          borderBottom: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <h2 style={{ marginRight: 16 }}>{board.title}</h2>

        <button
          onClick={() => setTool('SELECT')}
          style={{
            padding: '4px 8px',
            background: tool === 'SELECT' ? '#1976d2' : '#eee',
            color: tool === 'SELECT' ? '#fff' : '#000',
          }}
        >
          Выделение
        </button>

        <button
          onClick={() => setTool('HAND')}
          style={{
            padding: '4px 8px',
            background: tool === 'HAND' ? '#1976d2' : '#eee',
            color: tool === 'HAND' ? '#fff' : '#000',
          }}
        >
          Рука
        </button>

        <button
          onClick={() => setTool('BRUSH')}
          style={{
            padding: '4px 8px',
            background: tool === 'BRUSH' ? '#1976d2' : '#eee',
            color: tool === 'BRUSH' ? '#fff' : '#000',
          }}
        >
          Кисть
        </button>

        {tool === 'BRUSH' && (
          <div
            style={{
              marginLeft: 16,
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: 4,
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Размер кисти
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                  />
              <span>{brushSize}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={isEraser}
                onChange={(e) => setIsEraser(e.target.checked)}
              />
              Ластик
            </label>
          </div>
        )}

        <button
          onClick={handleAddRect}
          style={{ marginLeft: 'auto', padding: '4px 8px' }}
        >
          Добавить прямоугольник
        </button>

        <button
          onClick={() => setTool('TEXT')}
          style={{
            padding: '4px 8px',
            background: tool === 'TEXT' ? '#1976d2' : '#eee',
            color: tool === 'TEXT' ? '#fff' : '#000',
          }}
        >
          Текст
        </button>

        <button
          onClick={() => setTool('STICKER')}
          style={{
            padding: '4px 8px',
            background: tool === 'STICKER' ? '#1976d2' : '#eee',
            color: tool === 'STICKER' ? '#fff' : '#000',
          }}
        >
          Стикер
        </button>

        <button
          onClick={() => setTool('ARROW')}
          style={{
            padding: '4px 8px',
            background: tool === 'ARROW' ? '#1976d2' : '#eee',
            color: tool === 'ARROW' ? '#fff' : '#000',
          }}
        >
          Стрелка
        </button>
      </header>

      <div style={{ flex: 1 }}>
        <BoardCanvas
          boardUuid={board.uuid}
          elements={elements}
          onElementsChange={setElements}
          tool={tool}
          locks={locks}
          clientId={clientId}
          brushSize={brushSize}
          isEraser={isEraser}
          remoteCursors={remoteCursors}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
      </div>
    </div>
  );
};