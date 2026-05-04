import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';

type FieldErrors = {
  loginEmail?: string;
  loginPassword?: string;
  regName?: string;
  regEmail?: string;
  regPassword?: string;
  publicTitle?: string;
};

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();

  const [publicTitle, setPublicTitle] = useState('');
  const [joinUuid, setJoinUuid] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});

  const handleYandexLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/yandex';
  };

  const handleCreatePublicBoard = async () => {
    setErrors((prev) => ({ ...prev, publicTitle: undefined }));

    const trimmedTitle = publicTitle.trim();
    if (!trimmedTitle) {
      setErrors((prev) => ({
        ...prev,
        publicTitle: 'Введите название доски',
      }));
      return;
    }

    try {
      const resp = await api.post('/api/boards', {
        title: trimmedTitle,
      });
      const uuid = resp.data.uuid;
      navigate(`/boards/${uuid}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinBoard = () => {
    const raw = joinUuid.trim();
    if (!raw) return;

    const uuidMatch = raw.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
    const uuid = uuidMatch ? uuidMatch[0] : raw;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        uuid
      );

    if (!isUuid) {
      alert('Введите корректный UUID или ссылку на доску');
      return;
    }

    navigate(`/boards/${uuid}`);
  };

  const validateLogin = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!loginEmail.trim()) {
      newErrors.loginEmail = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      newErrors.loginEmail = 'Некорректный формат email';
    }

    if (!loginPassword) {
      newErrors.loginPassword = 'Введите пароль';
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setErrors((prev) => ({
      ...prev,
      loginEmail: undefined,
      loginPassword: undefined,
    }));

    if (!validateLogin()) {
      return;
    }

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
      const message =
        e?.response?.data?.message || 'Неверный email или пароль';
      setErrors((prev) => ({
        ...prev,
        loginPassword: message,
      }));
    }
  };

  const validateRegister = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!regEmail.trim()) {
      newErrors.regEmail = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      newErrors.regEmail = 'Некорректный формат email';
    }

    if (!regPassword) {
      newErrors.regPassword = 'Введите пароль';
    } else if (regPassword.length < 6) {
      newErrors.regPassword = 'Пароль должен содержать не менее 6 символов';
    }

    if (regName && regName.length > 64) {
      newErrors.regName = 'Имя слишком длинное';
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));

    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setErrors((prev) => ({
      ...prev,
      regName: undefined,
      regEmail: undefined,
      regPassword: undefined,
    }));

    if (!validateRegister()) {
      return;
    }

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
      const serverError = e?.response?.data;

      const message =
        serverError?.error ||
        serverError?.message ||
        'Не удалось зарегистрироваться';

      setErrors((prev) => ({
        ...prev,
        regEmail: message,
      }));
    }
  };

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const errorTextStyle: React.CSSProperties = {
    marginTop: '4px',
    marginBottom: 0,
    fontSize: '12px',
    color: '#dc2626',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 14px 45px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          padding: '32px 32px 28px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Вход в аккаунт
          </h1>
          <p
            style={{
              marginTop: '8px',
              marginBottom: 0,
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            Используйте почту и пароль или войдите через Яндекс ID
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4b5563',
              marginBottom: '4px',
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => {
              setLoginEmail(e.target.value);
              setErrors((prev) => ({ ...prev, loginEmail: undefined }));
            }}
            placeholder="you@example.com"
            style={{
              ...baseInputStyle,
              marginBottom: errors.loginEmail ? 0 : 10,
              borderColor: errors.loginEmail ? '#dc2626' : '#d1d5db',
            }}
          />
          {errors.loginEmail && (
            <p style={errorTextStyle}>{errors.loginEmail}</p>
          )}

          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4b5563',
              marginTop: '10px',
              marginBottom: '4px',
            }}
          >
            Пароль
          </label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => {
              setLoginPassword(e.target.value);
              setErrors((prev) => ({ ...prev, loginPassword: undefined }));
            }}
            placeholder="••••••••"
            style={{
              ...baseInputStyle,
              marginBottom: errors.loginPassword ? 0 : 16,
              borderColor: errors.loginPassword ? '#dc2626' : '#d1d5db',
            }}
          />
          {errors.loginPassword && (
            <p style={errorTextStyle}>{errors.loginPassword}</p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: '12px',
            }}
          >
            Войти
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showRegister ? 8 : 20,
            marginTop: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setShowRegister((v) => !v)}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Регистрация
          </button>

          <button
            type="button"
            onClick={handleYandexLogin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              border: 'none',
              background: 'none',
              fontSize: '13px',
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background:
                  'linear-gradient(135deg, #FFCC00 0%, #FFCC00 60%, #FF3333 60%, #FF3333 100%)',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000000',
                  lineHeight: 1,
                }}
              >
                Я
              </span>
            </span>
            <span>Войти через Яндекс ID</span>
          </button>
        </div>

        {showRegister && (
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              padding: '12px 12px 10px',
              marginBottom: '16px',
              backgroundColor: '#f9fafb',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Создать новый аккаунт
              </span>
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '16px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: '#9ca3af',
                }}
                aria-label="Закрыть регистрацию"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Имя (необязательно)"
              value={regName}
              onChange={(e) => {
                setRegName(e.target.value);
                setErrors((prev) => ({ ...prev, regName: undefined }));
              }}
              style={{
                ...baseInputStyle,
                padding: '7px 10px',
                marginBottom: errors.regName ? 0 : 6,
                borderColor: errors.regName ? '#dc2626' : '#d1d5db',
              }}
            />
            {errors.regName && <p style={errorTextStyle}>{errors.regName}</p>}

            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => {
                setRegEmail(e.target.value);
                setErrors((prev) => ({ ...prev, regEmail: undefined }));
              }}
              style={{
                ...baseInputStyle,
                padding: '7px 10px',
                marginTop: '6px',
                marginBottom: errors.regEmail ? 0 : 6,
                borderColor: errors.regEmail ? '#dc2626' : '#d1d5db',
              }}
            />
            {errors.regEmail && <p style={errorTextStyle}>{errors.regEmail}</p>}

            <input
              type="password"
              placeholder="Пароль"
              value={regPassword}
              onChange={(e) => {
                setRegPassword(e.target.value);
                setErrors((prev) => ({ ...prev, regPassword: undefined }));
              }}
              style={{
                ...baseInputStyle,
                padding: '7px 10px',
                marginTop: '6px',
                marginBottom: errors.regPassword ? 0 : 8,
                borderColor: errors.regPassword ? '#dc2626' : '#d1d5db',
              }}
            />
            {errors.regPassword && (
              <p style={errorTextStyle}>{errors.regPassword}</p>
            )}

            <button
              type="button"
              onClick={handleRegister}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#111827',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              Зарегистрироваться
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '4px 0 16px',
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              backgroundColor: '#e5e7eb',
            }}
          />
          <span
            style={{
              padding: '0 8px',
              fontSize: '12px',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            или
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              backgroundColor: '#e5e7eb',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                minHeight: 72,
                marginBottom: 8,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 6,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Создать доску без регистрации
              </h2>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: '12px',
                  color: '#6b7280',
                }}
              >
                Мы создадим временную доску, к которой вы сможете вернуться по ссылке.
              </p>
              {errors.publicTitle && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#dc2626',
                  }}
                >
                  {errors.publicTitle}
                </p>
              )}
            </div>

            <input
              type="text"
              placeholder="Название доски"
              value={publicTitle}
              onChange={(e) => {
                setPublicTitle(e.target.value);
                setErrors((prev) => ({ ...prev, publicTitle: undefined }));
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: errors.publicTitle ? '#dc2626' : '#d1d5db',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: 8,
              }}
            />
            <button
              type="button"
              onClick={handleCreatePublicBoard}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                fontSize: '13px',
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              Создать доску
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                minHeight: 72,
                marginBottom: 8,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 6,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Зайти на существующую доску
              </h2>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: '12px',
                  color: '#6b7280',
                }}
              >
                Вставьте UUID доски или полную ссылку, которую вам отправили.
              </p>
            </div>

            <input
              type="text"
              placeholder="UUID доски или ссылка"
              value={joinUuid}
              onChange={(e) => setJoinUuid(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: 8,
              }}
            />
            <button
              type="button"
              onClick={handleJoinBoard}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                fontSize: '13px',
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              Перейти к доске
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};