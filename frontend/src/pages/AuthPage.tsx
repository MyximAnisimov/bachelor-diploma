import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http'

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();

  const [publicTitle, setPublicTitle] = useState('');
  const [joinUuid, setJoinUuid] = useState('');

  const handleYandexLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/yandex';
  };

  const handleCreatePublicBoard = async () => {
    try {
      const resp = await api.post('/api/boards/public', {
        title: publicTitle || undefined,
      });
      const uuid = resp.data.uuid;
      navigate(`/boards/${uuid}`);
    } catch (e) {
      console.error(e);
      alert('Не удалось создать доску');
    }
  };

  const handleJoinBoard = () => {
    if (!joinUuid.trim()) return;
    navigate(`/boards/${joinUuid.trim()}`);
  };

  return (
    <div>
      <h1>Добро пожаловать</h1>

      <button type="button" onClick={handleYandexLogin}>
        Войти через Яндекс ID
      </button>

      <hr />

      <h2>Создать доску без регистрации</h2>
      <input
        type="text"
        placeholder="Название доски"
        value={publicTitle}
        onChange={(e) => setPublicTitle(e.target.value)}
      />
      <button type="button" onClick={handleCreatePublicBoard}>
        Создать доску
      </button>

      <hr />

      <h2>Зайти на доску по ссылке</h2>
      <input
        type="text"
        placeholder="UUID доски"
        value={joinUuid}
        onChange={(e) => setJoinUuid(e.target.value)}
      />
      <button type="button" onClick={handleJoinBoard}>
        Перейти
      </button>
    </div>
  );
};