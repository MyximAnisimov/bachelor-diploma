import React, { useEffect, useRef, useState, useMemo  } from 'react';
import { useParams } from 'react-router-dom';
import { getBoard, createBoardVideoRoom } from '../api/boards';
import { getBoardElements, createElement, updateElement, transformElement } from '../api/elements';
import { useBoardWs } from '../hooks/useBoardsWs';
import { clientId } from '../api/clientId';
import type { BoardDto, BoardElementDto } from '../api/types';
import { BoardCanvas } from './BoardCanvas';
import { AiChatDialog } from './AiChatDialog';
import { uploadFile } from '../api/files';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/http';
import { useBoardWebRTC } from '../webrtc/useBoardWebRtc';
import { WebRTCRoom } from '../webrtc/WebRTCRoom';
import { fetchAssistants } from '../api/ai';

type Tool = 'SELECT' | 'HAND' | 'BRUSH' | 'TEXT' | 'STICKER' | 'ARROW' | 'MEDIA';

type ActiveCall = {
  id: string;
  boardUuid: string;
  createdBy: string;
  createdAt: string;
};

type CallSignalMessage =
  | {
      type: 'CALL_STARTED';
      boardUuid: string;
      callId: string;
      createdBy: string;
      createdAt: string;
    };

type ShapeKind =
     | 'RECT'
     | 'ROUND_RECT'
     | 'DIAMOND'
     | 'TRAPEZOID'
     | 'TRIANGLE'
     | 'CYLINDER';

  interface ElementsState {
    [id: number]: ElementDto;
  }

  interface HistoryEntry {
    before: ElementsState;
    after: ElementsState;
  }

export const BoardPage: React.FC = () => {
  const { boardUuid } = useParams<{ boardUuid: string }>();
  const [board, setBoard] = useState<BoardDto | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [elements, setElements] = useState<BoardElementDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [tool, setTool] = useState<Tool>('SELECT');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('RECT');
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const { currentUser } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const sendRtcRef = useRef<(msg: RtcSignalMessage) => void>(() => {});
  const sendCallRef = useRef<(msg: CallSignalMessage) => void>(() => {});

  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [assistants, setAssistants] = useState<AiAssistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<AiAssistant | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const {
    localStream,
    remoteStreams,
    inCall,
    startCall,
    leaveCall,
    cameraEnabled,
    micEnabled,
    toggleCamera,
    toggleMic,
    mediaError,
  } = useBoardWebRTC(board?.uuid);

const readyForCall = !!board && !mediaError;

async function syncUndoEntryToServer(entry: HistoryEntry) {
  const elementsToSave = Object.values(entry.before ?? {});

  await Promise.all(
    elementsToSave.map((el) =>
      transformElement(board.uuid, el.id, toUpdatePayload(el)).catch((err) => {
        console.error('Failed to sync undo element', el.id, err);
      }),
    ),
  );
}

useEffect(() => {
  fetchAssistants()
    .then((data) => {
      console.log('assistants from backend', data);
      setAssistants(data);
    })
    .catch((e) => {
      console.error('Failed to load AI assistants', e);
    });
}, []);

function undo() {
  if (!canUndo) return;
  const entry = history[historyIndex];
  if (!entry) return;

  setElements((prev) => {
    const map = new Map(prev.map((e) => [e.id, e]));
    Object.values(entry.before ?? {}).forEach((el) => {
      map.set(el.id, el);
    });
    return Array.from(map.values());
  });

  syncUndoEntryToServer(entry);

  setHistoryIndex((idx) => idx - 1);
}

async function syncRedoEntryToServer(entry: HistoryEntry) {
  const elementsToSave = Object.values(entry.after ?? {});

  await Promise.all(
    elementsToSave.map((el) =>
      transformElement(board.uuid, el.id, toUpdatePayload(el)).catch((err) => {
        console.error('Failed to sync redo element', el.id, err);
      }),
    ),
  );
}

function redo() {
  if (!canRedo) return;
  const entry = history[historyIndex + 1];
  if (!entry) return;

  setElements((prev) => {
    const map = new Map(prev.map((e) => [e.id, e]));
    Object.values(entry.after ?? {}).forEach((el) => {
      map.set(el.id, el);
    });
    return Array.from(map.values());
  });

  syncRedoEntryToServer(entry);

  setHistoryIndex((idx) => idx + 1);
}

function toUpdatePayload(el: BoardElementDto) {
  return {
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    zIndex: el.zIndex,
    groupId: el.groupId ?? undefined,
    mediaId: el.mediaId ?? undefined,
    properties: el.properties,
  };
}

  useEffect(() => {
      console.log('BoardPage mount, boardUuid =', boardUuid);
      console.log('BoardPage user/board', { currentUser, ownerId: board?.ownerId });
    if (!boardUuid) return;
    (async () => {
      try {
          console.log('Fetching board and elements for', boardUuid);
        const [b, els] = await Promise.all([
          getBoard(boardUuid),
          getBoardElements(boardUuid),
        ]);
         console.log('Fetched board', b);
          console.log('Fetched elements', els.length);
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

  addElements([el], { recordHistory: true });
};

function applyElementChanges(
  changes: { id: number; patch: Partial<ElementDto> }[],
  options?: { recordHistory?: boolean },
) {
  setElements((prev) => {
    const map = new Map(prev.map((e) => [e.id, e]));
    const before: ElementsState = {};
    const after: ElementsState = {};

    for (const { id, patch } of changes) {
      const current = map.get(id);
      if (!current) continue;
      before[id] = current;
      const updated = { ...current, ...patch };
      map.set(id, updated);
      after[id] = updated;
    }

    const next = Array.from(map.values());

    if (options?.recordHistory) {
      setHistory((prevHistory) => {
        const trimmed = prevHistory.slice(0, historyIndex + 1);

        const newHistory = [...trimmed, { before, after }];

        setHistoryIndex(newHistory.length - 1);

        return newHistory;
      });
    }

    return next;
  });
}

function addElements(newElements: ElementDto[], options?: { recordHistory?: boolean }) {
  setElements(prev => {
    const before: ElementsState = {};
    const after: ElementsState = {};

    newElements.forEach(el => {
      after[el.id] = el;
    });

    const next = [...prev, ...newElements];

    if (options?.recordHistory) {
      setHistory(prevHistory => {
        const trimmed = prevHistory.slice(0, historyIndex + 1);
        const newHistory = [...trimmed, { before, after }];
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }

    return next;
  });
}

function deleteElements(
  ids: number[],
  options?: { recordHistory?: boolean },
) {
  setElements((prev) => {
    const before: ElementsState = {};
    const after: ElementsState = {};

    prev.forEach((el) => {
      if (ids.includes(el.id)) {
        before[el.id] = el;
      }
    });

    const next = prev.filter((el) => !ids.includes(el.id));

    if (options?.recordHistory && Object.keys(before).length > 0) {
      setHistory((prevHistory) => {
        const trimmed = prevHistory.slice(0, historyIndex + 1);
        const newHistory = [...trimmed, { before, after }];
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }

    return next;
  });
}

function handleStartVideoConference() {
  if (!board) return;

  if (!board || !localStream) {
    console.warn('Нельзя начать видеоконференцию: нет board или localStream');
    return;
  }

  const callId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const createdBy = currentUser?.id ?? clientId;
  const createdAt = new Date().toISOString();

  const msg: CallSignalMessage = {
    type: 'CALL_STARTED',
    boardUuid: board.uuid,
    callId,
    createdBy,
    createdAt,
  };

  const call: ActiveCall = { id: callId, boardUuid: board.uuid, createdBy, createdAt };
  setActiveCall(call);
  sendCallRef.current?.(msg);
  startCall();
}

async function transformElementOnServer(
  boardUuid: string,
  elementId: number,
  el: BoardElementDto,
): Promise<BoardElementDto> {
  const payload = toUpdatePayload(el);
  const saved = await transformElement(boardUuid, elementId, payload);
  return saved;
}

const handleUploadMedia = async (file: File) => {
  try {
    if (!boardUuid || !board) return;

    const data = await uploadFile(file);

    let width = data.width ?? 320;
    let height = data.height ?? 240;
    const maxW = 400;
    const maxH = 400;
    const scale = Math.min(1, maxW / width, maxH / height);
    width *= scale;
    height *= scale;

    const el = await createElement(boardUuid, {
      type: 'MEDIA',
      x: 100,
      y: 100,
      width,
      height,
      rotation: 0,
      properties: {
        mediaId: data.id,
        url: data.url,
        mediaType: data.contentType?.startsWith('video/')
          ? 'VIDEO'
          : 'IMAGE',
      },
    });

    setElements((prev) => [...prev, el]);
  } catch (err) {
    console.error('Failed to upload media', err);
  }
};

  const [locks, setLocks] = useState<Record<number, string>>({});
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number }>>({});

useBoardWs({
  boardUuid,
  onLockMessage: (msg) => {
    console.log('LOCK MSG IN BoardPage', msg);
    const { elementIds, clientId: owner, action, success, error } = msg;

    if (success === false) {
      if (owner === clientId) {
        console.warn(
          'Не удалось захватить элементы, уже заняты другим пользователем:',
          elementIds,
          error ?? '',
        );
        setSelectedIds((prev) => prev.filter((id) => !elementIds.includes(id)));
      }
      return;
    }

    setLocks((prev) => {
      const copy: Record<number, string> = { ...prev };
      const ids = elementIds ?? [];
      if (action === 'LOCK') {
        ids.forEach((id: number) => {
          copy[id] = owner;
        });
      } else if (action === 'UNLOCK') {
        ids.forEach((id: number) => {
          if (copy[id] === owner) {
            delete copy[id];
          }
        });
      }
      return copy;
    });
  },

  onCursorMessage: (msg) => {
    const { clientId: sender, x, y } = msg;
    if (sender === clientId) return;
    setRemoteCursors((prev) => ({
      ...prev,
      [sender]: { x, y },
    }));
  },

  onElementMessage: (msg) => {
    console.log('WS ELEMENT MSG', msg);
    setElements((prev) => {
      if (msg.action === 'DELETE') {
        return prev.filter((el) => el.id !== msg.element.id);
      }
      const exists = prev.some((el) => el.id === msg.element.id);
      if (exists) {
        return prev.map((el) =>
          el.id === msg.element.id ? msg.element : el,
        );
      }
      return [...prev, msg.element];
    });
  },

  onCallMessage: (msg: CallSignalMessage) => {
    if (msg.type === 'CALL_STARTED' && msg.boardUuid === board.uuid) {
      const call: ActiveCall = {
        id: msg.callId,
        boardUuid: msg.boardUuid,
        createdBy: msg.createdBy,
        createdAt: msg.createdAt,
      };

      setActiveCall(call);

      const me = currentUser?.id ?? clientId;
      if (msg.createdBy !== me) {
        setIncomingCall(call);
      }
    }
  },

  setSendRtc: (fn) => {
    sendRtcRef.current = fn;
  },

  setSendCall: (fn) => {
    sendCallRef.current = fn;
  },
});

  const isOwner =
    !!currentUser && board && board.ownerId === currentUser.id;

    const boardCanEdit = useMemo(() => {
      if (!board) return false;
      if (user && board.ownerId && user.id === board.ownerId) return true;
      return board.accessMode === 'LINK_EDIT';
    }, [board, user]);

  const handleChangeAccess = async (newMode: 'PRIVATE' | 'LINK_VIEW' | 'LINK_EDIT') => {
    if (!board) return;
    try {
      const res = await api.patch<BoardDto>(`/api/boards/${board.uuid}/access`, {
        accessMode: newMode,
      });
      setBoard(res.data);
    } catch (e) {
      console.error('Failed to update access mode', e);
    }
  };

  const handleCopyLink = () => {
    if (!board) return;
    const link = `${window.location.origin}/boards/${board.uuid}`;
    navigator.clipboard.writeText(link).catch(err => console.error('Copy failed', err));
  };

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const showHistoryControls = boardCanEdit;

   console.log('BoardPage user/board', { currentUser, ownerId: board?.ownerId });

  console.log('RENDER BoardPage', { loading, board });
  if (loading || !board) return <div>Загрузка...</div>;

console.log('HISTORY', historyIndex, history);
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
            {isOwner ? (
              <>
                <label style={{ fontSize: 12 }}>
                  Доступ для гостей:{' '}
                  <select
                    value={board.accessMode}
                    onChange={e =>
                      handleChangeAccess(e.target.value as 'PRIVATE' | 'LINK_VIEW' | 'LINK_EDIT')
                    }
                  >
                    <option value="PRIVATE">Только владелец</option>
                    <option value="LINK_VIEW">По ссылке — только просмотр</option>
                    <option value="LINK_EDIT">По ссылке — редактирование</option>
                  </select>
                </label>
                <button type="button" onClick={handleCopyLink}>
                  Скопировать ссылку
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleCopyLink}>
                  Скопировать ссылку
                </button>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  Доступ:{' '}
                  {board.accessMode === 'PRIVATE'
                    ? 'только владелец'
                    : board.accessMode === 'LINK_VIEW'
                    ? 'по ссылке (только просмотр)'
                    : 'по ссылке (редактирование)'}
                </span>
              </>
            )}
          </div>

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
          onClick={() => {
            setTool('BRUSH');
            setIsEraser(false);
          }}
          style={{
            padding: '4px 8px',
            background: tool === 'BRUSH' && !isEraser ? '#1976d2' : '#eee',
            color: tool === 'BRUSH' && !isEraser ? '#fff' : '#000',
          }}
        >
          Кисть
        </button>

        <button
          onClick={() => {
            setTool('BRUSH');
            setIsEraser(true);
          }}
          style={{
            padding: '4px 8px',
            background: tool === 'BRUSH' && isEraser ? '#1976d2' : '#eee',
            color: tool === 'BRUSH' && isEraser ? '#fff' : '#000',
          }}
        >
          Ластик
        </button>

        {tool === 'BRUSH' && (
          <div
            style={{
              marginLeft: 16,
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: 4,
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Размер кисти
              <input
                type="range"
                min={1}
                max={40}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
              <span>{brushSize}</span>
            </label>

            {!isEraser && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                Цвет
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                />
              </label>
            )}
          </div>
        )}

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => {
              setTool('SHAPE' as any);
              setShapeMenuOpen((v) => !v);
            }}
          >
            Фигура
          </button>

          {shapeMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                background: '#fff',
                border: '1px solid #ccc',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                zIndex: 50,
                minWidth: 160,
              }}
            >
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('RECT');
                  setShapeMenuOpen(false);
                }}
              >
                Прямоугольник
              </button>
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('CIRCLE');
                  setShapeMenuOpen(false);
                }}
              >
                Круг
              </button>
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('OVAL');
                  setShapeMenuOpen(false);
                }}
              >
                Овал
              </button>
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('DIAMOND');
                  setShapeMenuOpen(false);
                }}
              >
                Ромб
              </button>
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('TRAPEZOID');
                  setShapeMenuOpen(false);
                }}
              >
                Трапеция
              </button>
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('TRIANGLE');
                  setShapeMenuOpen(false);
                }}
              >
                Треугольник
              </button>
              <button
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setShapeKind('CYLINDER');
                  setShapeMenuOpen(false);
                }}
              >
                Цилиндр
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setTool('TEXT')}
          style={{
            padding: '4px 8px',
            background: tool === 'TEXT' ? '#1976d2' : '#eee',
            color: tool === 'TEXT' ? '#fff' : '#000',
          }}
        >
          Текст
        </button>

        <button
          onClick={() => setTool('STICKER')}
          style={{
            padding: '4px 8px',
            background: tool === 'STICKER' ? '#1976d2' : '#eee',
            color: tool === 'STICKER' ? '#fff' : '#000',
          }}
        >
          Стикер
        </button>

        <button
          onClick={() => setTool('ARROW')}
          style={{
            padding: '4px 8px',
            background: tool === 'ARROW' ? '#1976d2' : '#eee',
            color: tool === 'ARROW' ? '#fff' : '#000',
          }}
        >
          Стрелка
        </button>

        <button
          type="button"
          onClick={() => {
            setTool('MEDIA');
            setIsMediaDialogOpen(true);
          }}
        >
          Медиа
        </button>
        <button
          type="button"
          onClick={handleStartVideoConference}
          disabled={!readyForCall}
          style={{
            padding: '4px 8px',
            marginLeft: 8,
            background: readyForCall ? (activeCall ? '#1976d2' : '#eee') : '#ccc',
            color: readyForCall ? (activeCall ? '#fff' : '#777') : '#777',
            cursor: readyForCall ? 'pointer' : 'not-allowed',
          }}
        >
          Видеоконференция
        </button>

        <button
          type="button"
          onClick={() => setAiChatOpen(prev => !prev)}
          style={{
            padding: '4px 8px',
            marginLeft: 8,
          }}
        >
          ИИ‑ассистент
        </button>

        {aiMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 48,
              right: 16,
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: 8,
              zIndex: 1000,
              minWidth: 260,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Выберите ИИ‑ассистента
            </div>
            {assistants.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  if (!a.available) return;
                  setSelectedAssistant(a);
                  setAiChatOpen(true);
                  setAiMenuOpen(false);
                }}
                style={{
                  padding: '4px 8px',
                  cursor: a.available ? 'pointer' : 'not-allowed',
                  opacity: a.available ? 1 : 0.5,
                }}
              >
                <div>
                  {a.name} {a.local && ' (локально)'}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {a.description}
                </div>
              </div>
            ))}
          </div>
        )}
    {aiChatOpen && board && (
      <AiChatDialog
        boardUuid={board.uuid}
        assistants={assistants}
        initialAssistant={selectedAssistant}
        context={{
          selectedElements: elements.filter(el => selectedIds.includes(el.id)),
          boardTitle: board.title,
        }}
        onClose={() => setAiChatOpen(false)}
      />
    )}

{incomingCall && (
  <div
    style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#fff',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      padding: '8px 12px',
      borderRadius: 8,
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      zIndex: 2000,
    }}
  >
    <span style={{ fontSize: 14 }}>
      На этой доске начата видеоконференция.
    </span>
    <button
      style={{
        padding: '4px 8px',
        background: '#1976d2',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
      }}
      onClick={() => {
        if (!activeCall && incomingCall) {
          setActiveCall(incomingCall);
        }
        setIncomingCall(null);
        startCall();
      }}
    >
      Присоединиться
    </button>
    <button
      style={{
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: 4,
        background: '#fff',
      }}
      onClick={() => setIncomingCall(null)}
    >
      Закрыть
    </button>
  </div>
)}
      </header>

              <div className="board-wrapper" style={{ position: 'relative' }}>
        <BoardCanvas
          boardUuid={board.uuid}
          elements={elements}
          onElementsChange={setElements}
          tool={tool}
          locks={locks}
          clientId={clientId}
          brushColor={brushColor}
          brushSize={brushSize}
          isEraser={isEraser}
          remoteCursors={remoteCursors}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          shapeKind={shapeKind}
          setTool={setTool}
          boardCanEdit={boardCanEdit}
          applyElementChanges={applyElementChanges}
          addElements={addElements}
          deleteElements={deleteElements}
          transformElementOnServer={transformElementOnServer}
        />
      </div>

            {showHistoryControls && (
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  bottom: 16,
                  display: 'flex',
                  gap: 8,
                  zIndex: 10,
                }}
              >
                <button onClick={undo} disabled={!canUndo}>
                  ←
                </button>
                <button onClick={redo} disabled={!canRedo}>
                  →
                </button>
              </div>
            )}

{inCall && (
  <div
    style={{
      position: 'fixed',
      right: 0,
      bottom: 0,
      width: 400,
      height: 250,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 9999,
      color: '#fff',
    }}
  >
    <WebRTCRoom
      localStream={localStream}
      remoteStreams={remoteStreams}
      inCall={inCall}
      cameraEnabled={cameraEnabled}
      micEnabled={micEnabled}
      onToggleCamera={toggleCamera}
      onToggleMic={toggleMic}
      onLeave={() => {
        leaveCall();
        setActiveCall(null);
        setIncomingCall(null);
      }}
    />
  </div>
)}

{isMediaDialogOpen && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}
    onClick={() => {
      setIsMediaDialogOpen(false);
      setTool('SELECT');
    }}
  >
    <div
      style={{
        background: '#fff',
        padding: 24,
        borderRadius: 8,
        width: 420,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Загрузка медиафайла</h3>
      <p style={{ fontSize: 14, color: '#666' }}>
        Перетащите файл (изображение или видео) в область ниже
        или выберите его на вашем устройстве.
      </p>

      <div
        style={{
          border: '2px dashed #ccc',
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          marginTop: 16,
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          await handleUploadMedia(file);
          setIsMediaDialogOpen(false);
          setTool('SELECT');
        }}
      >
        Перетащите файл сюда
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <label style={{ cursor: 'pointer', color: '#1976d2' }}>
          выбрать медиафайл
          <input
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await handleUploadMedia(file);
              setIsMediaDialogOpen(false);
              setTool('SELECT');
            }}
          />
        </label>
      </div>
    </div>
  </div>
)}
    </div>
  );
};