import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';
import { createElement } from '../api/elements';
import type { BoardElementDto } from '../api/types';

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

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#6b7280',
        }}
      >
        Загрузка досок…
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#ffffff',
    display: 'flex',
    boxSizing: 'border-box',
  };

  const sidebarStyle: React.CSSProperties = {
    width: '260px',
    borderRight: '1px solid #e5e7eb',
    padding: '20px 18px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    padding: '20px 24px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={containerStyle}>
      <aside style={sidebarStyle}>
        <div>
          <h1
            style={{
              margin: 0,
              marginBottom: '8px',
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Мои доски
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            Создавайте новые доски или импортируйте существующие.
          </p>
        </div>

        <div
          style={{
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Новая доска
          </label>
          <input
            type="text"
            placeholder="Название доски"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
              marginBottom: '8px',
            }}
          />
          <button
            type="button"
            onClick={handleCreateBoard}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Создать доску
          </button>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px dashed #d1d5db',
            backgroundColor: '#ffffff',
          }}
        >
          <label
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              fontSize: '13px',
              color: '#111827',
              textAlign: 'center',
              cursor: 'pointer',
              boxSizing: 'border-box',
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
      </aside>

      <main style={mainStyle}>
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#374151',
            }}
          >
            Управление списком досок
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#6b7280' }}>Сортировать по:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'createdAt' | 'title')
              }
              style={{
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                padding: '6px 10px',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            >
              <option value="createdAt">дате создания</option>
              <option value="title">названию</option>
            </select>
            <button
              type="button"
              onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
              style={{
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                padding: '4px 8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              title={order === 'asc' ? 'По возрастанию' : 'По убыванию'}
            >
              {order === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {boards.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            У вас пока нет досок. Создайте первую доску с помощью панели слева.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {boards.map((b) => (
              <div
                key={b.uuid}
                style={{
                  position: 'relative',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow:
                    '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                }}
                onClick={() => handleOpenBoard(b.uuid)}
              >
                <div
                  style={{
                    position: 'relative',
                    height: '120px',
                    background:
                      'radial-gradient(circle at 0 0, #e5f0ff, #eff6ff 45%, #e5e7eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '72px',
                      height: '48px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      boxShadow: '0 4px 10px rgba(148,163,184,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '6px 8px',
                      boxSizing: 'border-box',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: '#d1d5db',
                        width: '70%',
                      }}
                    />
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: '#e5e7eb',
                        width: '100%',
                      }}
                    />
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: '#d1d5db',
                        width: '55%',
                      }}
                    />
                    <div
                      style={{
                        marginTop: '2px',
                        height: '4px',
                        borderRadius: '999px',
                        backgroundColor: '#bfdbfe',
                        width: '40%',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px 12px',
                    position: 'relative',
                    minHeight: '52px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#111827',
                      marginBottom: '4px',
                      marginRight: '28px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={b.title || 'Без названия'}
                  >
                    {b.title || 'Без названия'}
                  </div>
                  {b.createdAt && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        marginRight: '28px',
                      }}
                    >
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBoard(b.uuid);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      bottom: '8px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Удалить доску"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* корпус */}
                      <path
                        d="M8 9V18M12 9V18M16 9V18M5 6H19"
                        stroke="#6b7280"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9 6L9.5 4.8C9.7 4.3 10.1 4 10.7 4H13.3C13.9 4 14.3 4.3 14.5 4.8L15 6"
                        stroke="#6b7280"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 6H17V18.5C17 19.3 16.4 20 15.6 20H8.4C7.6 20 7 19.3 7 18.5V6Z"
                        stroke="#6b7280"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};