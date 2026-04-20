import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';

interface Board {
  uuid: string;
  title: string;
  createdAt: string;
}

export const MyBoardsPage: React.FC = () => {
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
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Название новой доски"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="button" onClick={handleCreateBoard}>
          Создать
        </button>
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