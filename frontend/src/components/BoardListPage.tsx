import React, { useEffect, useState } from 'react';
import { getMyBoards, createBoard } from '../api/boards';
import type { BoardDto } from '../api/types';
import { useNavigate } from 'react-router-dom';

export const BoardListPage: React.FC = () => {
  const [boards, setBoards] = useState<BoardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyBoards();
        setBoards(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    const title = newTitle.trim() || 'Новая доска';
    const board = await createBoard({ title });
    setBoards(prev => [board, ...prev]);
    setNewTitle('');
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Мои доски</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Название новой доски"
        />
        <button onClick={handleCreate}>Создать</button>
      </div>

      <ul>
        {boards.map(b => (
          <li key={b.uuid}>
            <button onClick={() => navigate(`/boards/${b.uuid}`)}>
              {b.title} {b.temporary ? '(временная)' : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};