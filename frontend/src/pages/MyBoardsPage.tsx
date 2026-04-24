import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';
import { createElement } from '../api/elements';
import type { BoardDto, BoardElementDto } from '../api/types';

interface Board {
  uuid: string;
  title: string;
  createdAt: string;
}

interface BoardSnapshot {
  version: number;
  board: {
    uuid: string;
    title: string;
    createdAt?: string;
  };
  elements: BoardElementDto[];
}

export const MyBoardsPage: React.FC = () => {
    console.log('RENDER BoardListPage');
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'title'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await api.get<Board[]>('/api/boards/my', {
          params: { sortBy, order },
        });
        setBoards(resp.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sortBy, order]);

  const handleOpenBoard = (uuid: string) => {
    navigate(`/boards/${uuid}`);
  };

  const handleCreateBoard = async () => {
    try {
      const resp = await api.post<Board>('/api/boards', {
        title: newTitle || undefined,
      });
      setBoards((prev) => [...prev, resp.data]);
      setNewTitle('');
    } catch (e) {
      console.error(e);
      alert('Не удалось создать доску');
    }
  };

  const handleDeleteBoard = async (uuid: string) => {
    if (!window.confirm('Удалить эту доску?')) return;
    try {
      await api.delete(`/api/boards/${uuid}`);
      setBoards((prev) => prev.filter((b) => b.uuid !== uuid));
    } catch (e) {
      console.error(e);
      alert('Не удалось удалить доску');
    }
  };

  if (loading) return <div>Загрузка досок...</div>;

return (
  <div>
    <h1>Мои доски</h1>

    <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Название новой доски"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />
      <button type="button" onClick={handleCreateBoard}>
        Создать
      </button>

      <label
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Импортировать доску из файла
        <input
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
              const text = await file.text();
              const snapshot: BoardSnapshot = JSON.parse(text);

              const resp = await api.post<Board>('/api/boards', {
                title: snapshot.board.title + ' (импорт)',
              });
              const newBoard = resp.data;

              for (const el of snapshot.elements) {
                await createElement(newBoard.uuid, {
                  type: el.type,
                  x: el.x,
                  y: el.y,
                  width: el.width,
                  height: el.height,
                  rotation: el.rotation,
                  zIndex: el.zIndex,
                  groupId: (el as any).groupId ?? undefined,
                  mediaId: (el as any).mediaId ?? undefined,
                  properties: el.properties,
                });
              }

              navigate(`/boards/${newBoard.uuid}`);
            } catch (err) {
              console.error('Ошибка импорта доски', err);
              alert('Не удалось импортировать доску');
            } finally {
              if (e.target) {
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
      </label>
    </div>

    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
      <span>Сортировать по:</span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'title')}
      >
        <option value="createdAt">дате создания</option>
        <option value="title">названию</option>
      </select>
      <button
        type="button"
        onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
      >
        {order === 'asc' ? '↑' : '↓'}
      </button>
    </div>

    <ul>
      {boards.map((b) => (
        <li
          key={b.uuid}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
        >
          <button type="button" onClick={() => handleOpenBoard(b.uuid)}>
            {b.title || 'Без названия'}
          </button>
          <span style={{ color: '#666', fontSize: 12 }}>
            {b.createdAt && new Date(b.createdAt).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => handleDeleteBoard(b.uuid)}
            style={{ marginLeft: 'auto', color: 'red' }}
          >
            Удалить
          </button>
        </li>
      ))}
    </ul>
  </div>
);
};