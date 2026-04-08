import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http'

interface Board {
  uuid: string;
  title: string;
}

export const MyBoardsPage: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await api.get<Board[]>('/api/boards');
        setBoards(resp.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleOpenBoard = (uuid: string) => {
    navigate(`/boards/${uuid}`);
  };

const handleCreateBoard = async () => {
  try {
    const resp = await api.post('/api/boards', {
      title: newTitle || undefined,
    });
    setBoards((prev) => [...prev, resp.data]);
    setNewTitle('');
  } catch (e) {
    console.error(e);
    alert('Не удалось создать доску');
  }
};

  if (loading) return <div>Загрузка досок...</div>;

  return (
    <div>
      <h1>Мои доски</h1>

      <div>
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

      <ul>
        {boards.map((b) => (
          <li key={b.uuid}>
            <button type="button" onClick={() => handleOpenBoard(b.uuid)}>
              {b.title} ({b.uuid})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};