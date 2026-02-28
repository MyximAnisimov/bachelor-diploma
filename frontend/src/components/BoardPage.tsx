import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBoard } from '../api/boards';
import { getBoardElements, createElement } from '../api/elements';
import type { BoardDto, BoardElementDto } from '../api/types';
import { BoardCanvas } from './BoardCanvas';

type Tool = 'SELECT' | 'HAND';

export const BoardPage: React.FC = () => {
  const { boardUuid } = useParams<{ boardUuid: string }>();
  const [board, setBoard] = useState<BoardDto | null>(null);
  const [elements, setElements] = useState<BoardElementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<Tool>('SELECT');

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
    setElements((prev) => [...prev, el]);
  };

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
          onClick={handleAddRect}
          style={{ marginLeft: 'auto', padding: '4px 8px' }}
        >
          Добавить прямоугольник
        </button>
      </header>

      <div style={{ flex: 1 }}>
        <BoardCanvas
          boardUuid={board.uuid}
          elements={elements}
          onElementsChange={setElements}
          tool={tool}
        />
      </div>
    </div>
  );
};