import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [publicTitle, setPublicTitle] = useState('');
  const [joinUuid, setJoinUuid] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleYandexLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/yandex';
  };

  const handleCreatePublicBoard = async () => {
    try {
      const resp = await api.post('/api/boards', {
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
    const raw = joinUuid.trim();
    if (!raw) return;
    const uuidMatch = raw.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
    const uuid = uuidMatch ? uuidMatch[0] : raw;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid
    );
    if (!isUuid) {
      alert('Введите корректный UUID или ссылку на доску');
      return;
    }
    navigate(`/boards/${uuid}`);
  };

  const handleRegister = async () => {
    try {
      const resp = await api.post('/api/auth/register', {
        email: regEmail,
        password: regPassword,
        name: regName || undefined,
      });
      const token = resp.data.token;
      localStorage.setItem('token', token);
      navigate('/me/boards');
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'Не удалось зарегистрироваться');
    }
  };

  const handleLogin = async () => {
    try {
      const resp = await api.post('/api/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });
      const token = resp.data.token;
      localStorage.setItem('token', token);
      navigate('/me/boards');
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || 'Неверный email или пароль');
    }
  };

  return (
    <div>
      <h1>Добро пожаловать</h1>

      <div>
        <button type="button" onClick={handleYandexLogin}>
          Войти через Яндекс ID
        </button>
      </div>

      <hr />

      <div>
        <h2>Регистрация</h2>
        <input
          type="text"
          placeholder="Имя (необязательно)"
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
        />
        <br />
        <input
          type="email"
          placeholder="Email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Пароль"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
        />
        <br />
        <button type="button" onClick={handleRegister}>
          Зарегистрироваться
        </button>
      </div>

      <hr />

      <div>
        <h2>Вход</h2>
        <input
          type="email"
          placeholder="Email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Пароль"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />
        <br />
        <button type="button" onClick={handleLogin}>
          Войти
        </button>
      </div>

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
        placeholder="UUID доски или ссылка"
        value={joinUuid}
        onChange={(e) => setJoinUuid(e.target.value)}
      />
      <button type="button" onClick={handleJoinBoard}>
        Перейти
      </button>
    </div>
  );
};