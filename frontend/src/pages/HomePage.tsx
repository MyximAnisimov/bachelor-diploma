import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBoard, getBoard } from '../api/boards';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [newTitle, setNewTitle] = useState('');
  const [joinUuid, setJoinUuid] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const board = await createBoard(newTitle || 'Новая доска');
      navigate(`/boards/${board.uuid}`);
    } catch (err) {
      setError('Не удалось создать доску');
      console.error(err);
    }
  };

  const handleJoinBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = joinUuid.trim();
    if (!trimmed) {
      setError('Введите UUID доски');
      return;
    }

    try {
      await getBoard(trimmed);
      navigate(`/boards/${trimmed}`);
    } catch (err) {
      setError('Доска с таким UUID не найдена');
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <h1>Онлайн‑доска</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Создать новую доску</h2>
        <form onSubmit={handleCreateBoard}>
          <input
            type="text"
            placeholder="Название доски"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit">Создать</button>
        </form>
      </section>

      <section>
        <h2>Войти по UUID</h2>
        <form onSubmit={handleJoinBoard}>
          <input
            type="text"
            placeholder="UUID доски"
            value={joinUuid}
            onChange={(e) => setJoinUuid(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit">Открыть доску</button>
        </form>
      </section>

      {error && (
        <div style={{ marginTop: 16, color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  );
};