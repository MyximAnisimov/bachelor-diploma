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
import { deleteElement as apiDeleteElement } from '../api/elements';
import {
  fetchBoardVersions,
  createBoardVersion,
  fetchBoardVersionPreview,
  restoreBoardVersion,
} from '../api/boardVersions';
type Tool = 'SELECT' | 'HAND' | 'BRUSH' | 'TEXT' | 'STICKER' | 'ARROW' | 'MEDIA' | 'EXPORT';
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
  | 'CYLINDER'
  | 'CIRCLE'
  | 'OVAL';

type CreateElementRequest = {
  type: BoardElementDto['type'];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  groupId?: number | null;
  mediaId?: number | null;
  properties: BoardElementDto['properties'];
};

type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};
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
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiDialogMessages, setAiDialogMessages] = useState<AiMessage[]>([]);
  const [aiDialogPosition, setAiDialogPosition] = useState({ x: 100, y: 100 });
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiPosition, setAiPosition] = useState({ x: 100, y: 100 });
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [previewElements, setPreviewElements] = useState<BoardElementDto[] | null>(null);
  const isPreviewMode = previewElements !== null;
  const elementsToRender = isPreviewMode ? previewElements! : elements;
  const sendStateRef = useRef<(msg: any) => void>(() => {});
  const [brushPanelOpen, setBrushPanelOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [leftToolsOpen, setLeftToolsOpen] = useState(true);
  const [rightToolsOpen, setRightToolsOpen] = useState(true);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [versionRequestSent, setVersionRequestSent] = useState(false);
  const [versions, setVersions] = useState<BoardVersionDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [showUuidNotice, setShowUuidNotice] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [aiSize, setAiSize] = useState({ width: 520, height: 520 });
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedStatus, setAccessDeniedStatus] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const getUserName = (id: string) =>
    remoteCursors[id]?.displayName || 'Гость';
    const selectedVersion = versions.find(v => v.id === selectedVersionId);
    const label = selectedVersion?.label || `версия #${selectedVersionId}`;
    const historyRef = useRef<HistoryEntry[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const elementsRef = useRef<BoardElementDto[]>([]);
      const [history, setHistory] = useState<HistoryEntry[]>([]);
      const [historyIndex, setHistoryIndex] = useState<number>(-1);
      const canUndo = historyIndex >= 0;
      const canRedo = historyIndex < history.length - 1;
      const showHistoryControls = !!board;
      const [copied, setCopied] = useState(false);
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
const cursorColors = [
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#eab308',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];
const readyForCall = !!board && !mediaError;
async function syncUndoEntryToServer(entry: HistoryEntry) {
  const beforeIds = Object.keys(entry.before || {});
  const afterIds = Object.keys(entry.after || {});


  console.log('[syncUndo] beforeIds', beforeIds, 'afterIds', afterIds);
  if (beforeIds.length === 0 && afterIds.length > 0) {
    await Promise.all(
      afterIds.map((idStr) => {
        const id = Number(idStr);
        return apiDeleteElement(board.uuid, id).catch((err) => {
          console.error('Failed to sync undo ADD (delete)', id, err);
        });
      }),
    );
    return;
  }

  if (beforeIds.length > 0 && afterIds.length === 0) {
    const elementsToRestore = Object.values(entry.before);
    await Promise.all(
      elementsToRestore.map((el) =>
        createElement(board.uuid, toCreatePayload(el)).catch((err) => {
          console.error('Failed to sync undo DELETE (restore)', el.id, err);
        }),
      ),
    );
    return;
  }

  if (beforeIds.length > 0 && afterIds.length > 0) {
    const elementsToRevert = Object.values(entry.before);
    await Promise.all(
      elementsToRevert.map((el) =>
        transformElement(board.uuid, el.id, toUpdatePayload(el)).catch(
          (err) => {
            console.error('Failed to sync undo UPDATE', el.id, err);
          },
        ),
      ),
    );
  }
}
function getUserColor(clientId: string) {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % cursorColors.length;
  return cursorColors[idx];
}
useEffect(() => {
  let canceled = false;

  const loadBoard = async () => {
    try {
      setLoading(true);
      const data = await getBoard(boardUuid);
      if (canceled) return;
      setBoard(data);
    } catch (err: any) {
              if (canceled) return;

              const status = err?.response?.status;
              console.error('loadBoard error', status, err);

              if (status === 401 || status === 403) {
                console.log('ACCESS DENIED: setting accessDenied = true');
                setAccessDenied(true);
                 setAccessDeniedStatus(status ?? null);
              } else {
                setLoadError('Не удалось загрузить доску');
              }
    } finally {
      if (!canceled) {
        setLoading(false);
      }
    }
  };

  loadBoard();
  return () => {
    canceled = true;
  };
}, [boardUuid]);

useEffect(() => {
  if (!boardUuid) return;
  (async () => {
    setVersionsLoading(true);
    try {
      const data = await fetchBoardVersions(boardUuid);
      setVersions(data);
    } finally {
      setVersionsLoading(false);
    }
  })();
}, [boardUuid]);
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
    const beforeIds = Object.keys(entry.before);
    const afterIds = Object.keys(entry.after);

    if (beforeIds.length === 0 && afterIds.length > 0) {
      for (const idStr of afterIds) {
        const id = Number(idStr);
        map.delete(id);
      }
    } else if (beforeIds.length > 0 && afterIds.length === 0) {
      for (const el of Object.values(entry.before)) {
        map.set(el.id, cloneElement(el));
      }
    } else {
      for (const el of Object.values(entry.before)) {
        map.set(el.id, cloneElement(el));
      }
    }

    return Array.from(map.values());
  });

  syncUndoEntryToServer(entry).catch((err) =>
    console.error('Failed to sync undo', err),
  );

  setHistoryIndex((idx) => idx - 1);
}

function redo() {
  if (!canRedo) return;
  const entry = history[historyIndex + 1];
  if (!entry) return;

  setElements((prev) => {
    const map = new Map(prev.map((e) => [e.id, e]));
    const beforeIds = Object.keys(entry.before);
    const afterIds = Object.keys(entry.after);

    if (beforeIds.length === 0 && afterIds.length > 0) {
      for (const el of Object.values(entry.after)) {
        map.set(el.id, cloneElement(el));
      }
    } else if (beforeIds.length > 0 && afterIds.length === 0) {
      for (const idStr of beforeIds) {
        const id = Number(idStr);
        map.delete(id);
      }
    } else {
      for (const el of Object.values(entry.after)) {
        map.set(el.id, cloneElement(el));
      }
    }

    return Array.from(map.values());
  });

  syncRedoEntryToServer(entry).catch((err) =>
    console.error('Failed to sync redo', err),
  );

  setHistoryIndex((idx) => idx + 1);
}
async function syncRedoEntryToServer(entry: HistoryEntry) {
  const beforeIds = Object.keys(entry.before || {});
  const afterIds = Object.keys(entry.after || {});

  if (beforeIds.length === 0 && afterIds.length > 0) {
    const elementsToAdd = Object.values(entry.after);
    await Promise.all(
      elementsToAdd.map((el) =>
        createElement(board.uuid, toCreatePayload(el)).catch((err) => {
          console.error('Failed to sync redo ADD (create)', el.id, err);
        }),
      ),
    );
    return;
  }

  if (beforeIds.length > 0 && afterIds.length === 0) {
    await Promise.all(
      beforeIds.map((idStr) => {
        const id = Number(idStr);
        return apiDeleteElement(board.uuid, id).catch((err) => {
          console.error('Failed to sync redo DELETE', id, err);
        });
      }),
    );
    return;
  }

  if (beforeIds.length > 0 && afterIds.length > 0) {
    const elementsToApply = Object.values(entry.after);
    await Promise.all(
      elementsToApply.map((el) =>
        transformElement(board.uuid, el.id, toUpdatePayload(el)).catch(
          (err) => {
            console.error('Failed to sync redo UPDATE', el.id, err);
          },
        ),
      ),
    );
  }
}

async function handlePreviewVersion() {
  if (!boardUuid || selectedId == null) return;
  const data = await fetchBoardVersionPreview(boardUuid, selectedId);
  setPreviewElements(data);
  setPreviewActive(true);
}

function handleExitPreviewVersion() {
  setPreviewElements(null);
  setPreviewActive(false);
}

async function handleSaveCurrentVersion() {
  if (!boardUuid) return;

  const raw = window.prompt('Название версии (опционально):');
  if (raw === null) return;

  const label = raw.trim() || undefined;

  setCreatingVersion(true);
  try {
    await createBoardVersion(boardUuid, label);
    const data = await fetchBoardVersions(boardUuid);
    setVersions(Array.isArray(data) ? data : []);
  } catch (e: any) {
    console.error('Failed to save board version', e);

    const status = e?.response?.status ?? e?.status;
    if (status === 401) {
      alert('Для сохранения глобальной версии доски нужно войти в аккаунт.');
      return;
    }

    alert('Не удалось сохранить версию доски');
  } finally {
    setCreatingVersion(false);
  }
}

function toCreatePayload(el: BoardElementDto): CreateElementRequest {
  return {
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    zIndex: el.zIndex,
    groupId: el.groupId ?? null,
    mediaId: el.mediaId ?? null,
    properties: el.properties,
  };
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
  if (!boardUuid) return;
  if (accessDenied) return;

  let canceled = false;

  const loadElements = async () => {
    try {
      console.log('Loading elements for board', boardUuid);
      const els = await getBoardElements(boardUuid);
      if (canceled) return;
      setElements(els);
      console.log('Loaded elements', els.length);
    } catch (err) {
      console.error('Failed to load elements', err);
    }
  };

  loadElements();

  return () => {
    canceled = true;
  };
}, [boardUuid, accessDenied]);
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
  changes: { id: number; patch: Partial<BoardElementDto> }[],
  options?: { recordHistory?: boolean },
) {
  const prev = elementsRef.current;
  const map = new Map(prev.map(e => [e.id, e]));

  const before: ElementsState = {};
  const after: ElementsState = {};

  for (const { id, patch } of changes) {
    const current = map.get(id);
    if (!current) continue;

    before[id] = cloneElement(current);
    const updated: BoardElementDto = { ...current, ...patch };
    map.set(id, updated);
    after[id] = cloneElement(updated);
  }

  const next = Array.from(map.values());
  setElements(next);
  elementsRef.current = next;

  if (options?.recordHistory && Object.keys(before).length > 0) {
    pushHistoryEntry({ before, after });
  }
}
    useEffect(() => {
      historyRef.current = history;
    }, [history]);

    useEffect(() => {
      historyIndexRef.current = historyIndex;
    }, [historyIndex]);

    useEffect(() => {
      elementsRef.current = elements;
    }, [elements]);
function pushHistoryEntry(entry: HistoryEntry) {
  setHistory(prevHistory => {
    const trimmed = prevHistory.slice(0, historyIndexRef.current + 1);
    const newHistory = [...trimmed, entry];
    historyIndexRef.current = newHistory.length - 1;
    setHistoryIndex(newHistory.length - 1);
    return newHistory;
  });
}
function applyRemoteUpsert(newElements: BoardElementDto[]) {
  setElements(prev => {
    const map = new Map<number, BoardElementDto>();
    for (const el of prev) {
      map.set(el.id, el);
    }
    for (const el of newElements) {
      map.set(el.id, cloneElement(el));
    }
    return Array.from(map.values());
  });
}

function applyRemoteDelete(ids: number[]) {
  setElements(prev => prev.filter(el => !ids.includes(el.id)));
}

function addElements(
  newElements: BoardElementDto[],
  options?: { recordHistory?: boolean },
) {
  const prev = elementsRef.current;

  const map = new Map<number, BoardElementDto>();
  for (const el of prev) {
    map.set(el.id, el);
  }

  const before: ElementsState = {};
  const after: ElementsState = {};

  for (const el of newElements) {
    const existing = map.get(el.id);

    if (existing) {
      continue;
    }

    const cloned = cloneElement(el);
    map.set(el.id, cloned);
    after[el.id] = cloneElement(cloned);
  }

  const next = Array.from(map.values());
  setElements(next);
  elementsRef.current = next;

  if (options?.recordHistory && Object.keys(after).length > 0) {
    console.log('[addElements] push history entry', {
      before: Object.keys(before),
      after: Object.keys(after),
    });
    pushHistoryEntry({ before, after });
  }
}
function deleteElements(ids: number[], options?: { recordHistory?: boolean }) {
  if (!boardUuid) return;

  const prev = elementsRef.current;
  const before: ElementsState = {};
  const after: ElementsState = {};

  for (const el of prev) {
    if (ids.includes(el.id)) {
      before[el.id] = cloneElement(el);
    }
  }

  const next = prev.filter(el => !ids.includes(el.id));
  setElements(next);
  elementsRef.current = next;

  if (options?.recordHistory && Object.keys(before).length > 0) {
    pushHistoryEntry({ before, after });
  }

  ids.forEach(id => {
    apiDeleteElement(board.uuid, id).catch(err => {
      console.error('Failed to delete element on server', id, err);
    });
  });
}
function handleStartVideoConference() {
  if (!board) return;
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
function replaceAllElementsAndResetHistory(newElements: BoardElementDto[]) {
  setElements(newElements);
  setHistory([]);
  setHistoryIndex(-1);
}
async function transformElementOnServer(
  boardUuid: string,
  elementId: number,
  el: BoardElementDto,
): Promise<BoardElementDto> {
  const payload = toUpdatePayload(el);
  return transformElement(boardUuid, elementId, payload);
}
const handleExportBoardFile = () => {
  if (!board) return;
  const snapshot: BoardSnapshot = {
    version: 1,
    board: {
      uuid: board.uuid,
      title: board.title,
      createdAt: board.createdAt,
    },
    elements,
  };
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${board.title || 'board'}.board.json`;
  link.click();
  URL.revokeObjectURL(url);
};
const exportCrop = (format: 'png' | 'jpeg' | 'webp' = 'png') => {
  if (!stageRef.current || !cropRect) return;
  const x = Math.min(cropRect.x, cropRect.x + cropRect.width);
  const y = Math.min(cropRect.y, cropRect.y + cropRect.height);
  const width = Math.abs(cropRect.width);
  const height = Math.abs(cropRect.height);
  if (width < 5 || height < 5) {
    return;
  }
  const mimeType =
    format === 'jpeg'
      ? 'image/jpeg'
      : format === 'webp'
      ? 'image/webp'
      : 'image/png';
  const dataUrl = stageRef.current.toDataURL({
    x,
    y,
    width,
    height,
    mimeType,
    quality: 1,
    pixelRatio: 2,
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `board-fragment.${format}`;
  link.click();
};
function cloneElement(el: BoardElementDto): BoardElementDto {
  return {
    ...el,
    properties: el.properties ? JSON.parse(JSON.stringify(el.properties)) : undefined,
  };
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
addElements([el], { recordHistory: true });
  } catch (err) {
    console.error('Failed to upload media', err);
  }
};
  const [locks, setLocks] = useState<Record<number, string>>({});
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { x: number; y: number; displayName?: string }>
  >({});
  const [displayName, setDisplayName] = useState('');
  const [needName, setNeedName] = useState(false);
  useEffect(() => {

    if (currentUser) {
      const nameFromAccount =
        (currentUser.fullName as string | undefined) ||
        (currentUser.name as string | undefined) ||
        (currentUser.email as string | undefined) ||
        '';

      if (nameFromAccount) {
        setDisplayName(nameFromAccount);
        localStorage.setItem('displayName', nameFromAccount);
        setNeedName(false);
        return;
      }
    }

    const stored = localStorage.getItem('displayName') || '';

    if (stored) {
      setDisplayName(stored);
      setNeedName(false);
    } else {
      setDisplayName('');
      setNeedName(true);
    }
  }, [currentUser]);

  const handleSaveName = () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;

    localStorage.setItem('displayName', trimmed);
    setDisplayName(trimmed);
    setNeedName(false);

    if (!currentUser && board) {
      setShowUuidNotice(true);
    }
  };

const handleRequestRestore = () => {
  if (!selectedVersionId) {
    alert('Версия не выбрана');
    return;
  }

  const version = versions.find((v) => v.id === selectedVersionId);
  const label = version?.label || `версия #${selectedVersionId}`;

  const payload = {
    versionId: selectedVersionId,
    label,
    requestedBy: currentUser
      ? { id: currentUser.id, name: currentUser.name }
      : { id: null, name: 'Гость' },
    requestedByClientId: clientId,
  };

  console.log('handleRequestRestore payload', payload);

  sendStateRef.current?.({
    type: 'VERSION_RESTORE_REQUEST',
    payload,
  });

  setVersionRequestSent(true);
};

const toolbarButtonStyle = (active: boolean): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  border: 'none',
  background: active ? '#2563eb' : '#f3f4f6',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  boxSizing: 'border-box',
});
useBoardWs({
    boardUuid,
    onLockMessage: (msg) => {
      const { elementIds, clientId, action, displayName } = msg;

      if (displayName) {
        setUserNames((prev) => ({
          ...prev,
          [clientId]: displayName,
        }));
      }

      setLocks((prev) => {
        const copy: Record<number, string> = { ...prev };
        const ids: number[] = elementIds ?? [];

        if (action === 'LOCK') {
          ids.forEach((id) => {
            copy[id] = clientId;
          });
        } else if (action === 'UNLOCK') {
          ids.forEach((id) => {
            delete copy[id];
          });
        }

        return copy;
      });
    },
  onVersionRestoreRejected: (payload) => {
    const { versionId, label, requestedByClientId } = payload;
    console.log('REJECTED payload', payload, 'my clientId', clientId);

    if (requestedByClientId !== clientId) {
      return;
    }

    alert(
      `Владелец доски отклонил запрос на откат к версии ${
        label || ('#' + versionId)
      }.`,
    );
  },
  onCursorMessage: (msg) => {
    const { clientId, x, y, displayName } = msg;
    setRemoteCursors((prev) => ({
      ...prev,
      [clientId]: { x, y, displayName },
    }));
  },
    onElementMessage: (msg) => {
      if (msg.action === 'UPSERT') {
        applyRemoteUpsert([msg.element]);
      } else if (msg.action === 'DELETE') {
        applyRemoteDelete([msg.element.id]);
      }
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
     onVersionRestoreRequest: (payload) => {
         console.log('OWNER onVersionRestoreRequest payload', payload);
       const { versionId, requestedBy, label, requestedByClientId } = payload;
       if (!isOwner) return;

       const ok = window.confirm(
         `${requestedBy?.name || 'Пользователь'} хочет откатиться к версии ${
           label || ('#' + versionId)
         }. Выполнить откат для всех?`,
       );

       if (!ok) {
         sendStateRef.current?.({
           type: 'VERSION_RESTORE_REJECTED',
           payload: {
             versionId,
             label,
             requestedByClientId,
           },
         });
         return;
       }

       restoreBoardVersion(board.uuid, versionId)
         .catch((e) => {
           console.error('Failed to restore version', e);
           alert('Не удалось откатиться к версии');
         });
     },
  setSendState: (fn) => {
    sendStateRef.current = fn;
  },
  onBoardResetMessage: (elementsFromServer) => {
    replaceAllElementsAndResetHistory(elementsFromServer);
    setSelectedIds([]);
  },
});
  const isOwner =
    !!currentUser && board && board.ownerId === currentUser.id;
    const boardCanEdit = useMemo(() => {
      if (!board) return false;
      if (currentUser && board.ownerId && currentUser.id === board.ownerId) return true;
      return board.accessMode === 'LINK_EDIT';
    }, [board, currentUser]);
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
  const handleCopyLink = async () => {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/boards/${board.uuid}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Failed to copy link', e);
      alert('Не удалось скопировать ссылку');
    }
  };

  const ShapeMenuItem: React.FC<{
    label: string;
    kind: ShapeKind;
    current: ShapeKind;
    onSelect: (k: ShapeKind) => void;
  }> = ({ label, kind, current, onSelect }) => {
    const isActive = current === kind;

    return (
      <button
        type="button"
        onClick={() => onSelect(kind)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '6px 10px',
          border: 'none',
          background: isActive ? '#eff6ff' : 'transparent',
          cursor: 'pointer',
          fontSize: 13,
          color: '#111827',
        }}
      >
        <svg
          width="22"
          height="18"
          viewBox="0 0 44 36"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          {/* фон */}
          <rect
            x="0"
            y="0"
            width="44"
            height="36"
            rx="6"
            fill="#f9fafb"
            stroke="#e5e7eb"
          />

          {kind === 'RECT' && (
            <rect
              x="10"
              y="8"
              width="24"
              height="20"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}

          {kind === 'ROUND_RECT' && (
            <rect
              x="10"
              y="8"
              width="24"
              height="20"
              rx="5"
              ry="5"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}

          {kind === 'DIAMOND' && (
            <polygon
              points="22,6 34,18 22,30 10,18"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}

          {kind === 'TRAPEZOID' && (
            <polygon
              points="12,10 32,10 28,26 16,26"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}

          {kind === 'TRIANGLE' && (
            <polygon
              points="22,8 34,26 10,26"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}

          {kind === 'CYLINDER' && (
            <>
              <ellipse
                cx="22"
                cy="10"
                rx="10"
                ry="4"
                fill="#e5e7eb"
                stroke="#4b5563"
              />
              <rect
                x="12"
                y="10"
                width="20"
                height="14"
                fill="#e5e7eb"
                stroke="#4b5563"
              />
              <ellipse
                cx="22"
                cy="24"
                rx="10"
                ry="4"
                fill="#e5e7eb"
                stroke="#4b5563"
              />
            </>
          )}

          {kind === 'CIRCLE' && (
            <circle
              cx="22"
              cy="18"
              r="9"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}

          {kind === 'OVAL' && (
            <ellipse
              cx="22"
              cy="18"
              rx="12"
              ry="7"
              fill="#e5e7eb"
              stroke="#4b5563"
            />
          )}
        </svg>

        <span>{label}</span>
      </button>
    );
  };

   if (accessDenied) {
     return (
       <div
         style={{
           display: 'flex',
           width: '100vw',
           height: '100vh',
           alignItems: 'center',
           justifyContent: 'center',
           flexDirection: 'column',
           background: '#f5f5f5',
           color: '#111827',
           fontFamily:
             'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
         }}
       >
         <div
           style={{
             padding: '24px 32px',
             background: '#ffffff',
             borderRadius: 12,
             boxShadow: '0 10px 40px rgba(15,23,42,0.12)',
             maxWidth: 480,
             textAlign: 'center',
           }}
         >
           <h1 style={{ fontSize: 24, marginBottom: 8 }}>Доступ запрещён</h1>
           <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
             Владелец ограничил доступ к этой доске. Сейчас режим доступа — только для владельца.
           </p>
           <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
             Код ошибки: {accessDeniedStatus ?? '—'}
           </p>
           <p style={{ fontSize: 13, color: '#9ca3af' }}>
             Если вы считаете, что это ошибка, обратитесь к владельцу доски и попросите выдать вам доступ.
           </p>
         </div>
       </div>
     );
   }
  if (loading || !board) return <div>Загрузка...</div>;

  return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f5f5',
          overflow: 'hidden',
        }}
      >
      <div
        style={{
          position: 'fixed',
          top: 8,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={() => setTopMenuOpen((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 0,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
            }}
            title="Меню"
          >
            <span
              style={{
                width: 16,
                height: 2,
                background: '#4b5563',
                borderRadius: 999,
                marginBottom: 3,
              }}
            />
            <span
              style={{
                width: 16,
                height: 2,
                background: '#4b5563',
                borderRadius: 999,
                marginBottom: 3,
              }}
            />
            <span
              style={{
                width: 16,
                height: 2,
                background: '#4b5563',
                borderRadius: 999,
              }}
            />
          </button>

              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: 420,
                  boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
                }}
              >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {board.title || 'Без названия'}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(board.uuid)
                  .catch((err) => console.error('Copy UUID failed', err));
              }}
              style={{
                marginTop: 2,
                border: 'none',
                background: 'transparent',
                padding: 0,
                fontSize: 11,
                color: '#6b7280',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              title="Скопировать UUID"
            >
              ({board.uuid})
            </button>
          </div>
        </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
              }}
            >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ display: 'block' }}
            >
              <path
                d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0-2.83 2H12l-3.17 1.83M9 14.17 12.17 16"
                fill="none"
                stroke="#4b5563"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="6"
                cy="12"
                r="3"
                fill="none"
                stroke="#4b5563"
                strokeWidth="1.7"
              />
              <circle
                cx="18"
                cy="18"
                r="3"
                fill="none"
                stroke="#4b5563"
                strokeWidth="1.7"
              />
            </svg>
            <span>Поделиться</span>
          </button>
        </div>
      </div>
{shapeMenuOpen && (
  <div
    style={{
      position: 'fixed',
      top: 64 + 40,
      left: 64,
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      boxShadow: '0 8px 20px rgba(15,23,42,0.15)',
      borderRadius: 8,
      zIndex: 70,
      minWidth: 200,
      padding: 4,
    }}
  >
    <ShapeMenuItem
      label="Прямоугольник"
      kind="RECT"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
    <ShapeMenuItem
      label="Скруглённый прямоугольник"
      kind="ROUND_RECT"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
    <ShapeMenuItem
      label="Ромб"
      kind="DIAMOND"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
    <ShapeMenuItem
      label="Трапеция"
      kind="TRAPEZOID"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
    <ShapeMenuItem
      label="Треугольник"
      kind="TRIANGLE"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
    <ShapeMenuItem
      label="Цилиндр"
      kind="CYLINDER"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />

    <div
      style={{
        height: 1,
        background: '#e5e7eb',
        margin: '4px 0',
      }}
    />

    <ShapeMenuItem
      label="Круг"
      kind="CIRCLE"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
    <ShapeMenuItem
      label="Овал"
      kind="OVAL"
      current={shapeKind}
      onSelect={(k) => {
        setShapeKind(k);
        setShapeMenuOpen(false);
        setTool('SHAPE' as any);
      }}
    />
  </div>
)}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: 16,
          transform: 'translateY(-50%)',
          width: 52,
          padding: 8,
          borderRadius: 14,
          background: '#ffffff',
          boxShadow: '0 6px 18px rgba(15,23,42,0.2)',
          display: leftToolsOpen ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 6,
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setTool('HAND');
            setIsEraser(false);
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'HAND')}
          title="Рука (перемещение доски)"
        >
          <span
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: tool === 'HAND' ? '#ffffff' : '#4b5563',
            }}
          >
            ✋
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTool('SELECT');
            setIsEraser(false);
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'SELECT')}
          title="Выделение"
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              color: tool === 'SELECT' ? '#ffffff' : '#4b5563',
            }}
          >
            ⌖
          </span>
        </button>

        {/* BRUSH */}
        <button
          type="button"
          onClick={() => {
            setBrushPanelOpen((v) => !v);
            setTool('BRUSH');
            setIsEraser(false);
          }}
          style={toolbarButtonStyle(tool === 'BRUSH')}
          title="Кисть / Ластик"
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              color: tool === 'BRUSH' ? '#ffffff' : '#4b5563',
            }}
          >
            🖌
          </span>
        </button>

        {/* SHAPE */}
        <button
          type="button"
          onClick={() => {
            setTool('SHAPE' as any);
            setShapeMenuOpen((v) => !v);
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'SHAPE')}
          title="Фигуры"
        >
          <span
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: tool === 'SHAPE' ? '#ffffff' : '#4b5563',
            }}
          >
            ▢
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTool('TEXT');
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'TEXT')}
          title="Текст"
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              color: tool === 'TEXT' ? '#ffffff' : '#4b5563',
            }}
          >
            A
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTool('STICKER');
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'STICKER')}
          title="Стикер"
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              color: tool === 'STICKER' ? '#ffffff' : '#4b5563',
            }}
          >
            🗒
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTool('ARROW');
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'ARROW')}
          title="Стрелка"
        >
          <span
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: tool === 'ARROW' ? '#ffffff' : '#4b5563',
            }}
          >
            ➝
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTool('MEDIA');
            setIsMediaDialogOpen(true);
            setBrushPanelOpen(false);
          }}
          style={toolbarButtonStyle(tool === 'MEDIA')}
          title="Медиа"
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              color: tool === 'MEDIA' ? '#ffffff' : '#4b5563',
            }}
          >
            🖼
          </span>
        </button>
      </div>
      {brushPanelOpen && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 64,
            padding: 8,
            borderRadius: 10,
            background: '#ffffff',
            boxShadow: '0 8px 20px rgba(15,23,42,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 60,
            minWidth: 180,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setTool('BRUSH');
                setIsEraser(false);
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: !isEraser ? '#2563eb' : '#f9fafb',
                color: !isEraser ? '#ffffff' : '#111827',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Кисть
            </button>
            <button
              type="button"
              onClick={() => {
                setTool('BRUSH');
                setIsEraser(true);
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: isEraser ? '#2563eb' : '#f9fafb',
                color: isEraser ? '#ffffff' : '#111827',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Ластик
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#4b5563',
            }}
          >
            Размер
            <input
              type="range"
              min={1}
              max={40}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 24, textAlign: 'right' }}>{brushSize}</span>
          </div>
          {!isEraser && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#4b5563',
              }}
            >
              Цвет
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                style={{
                  width: 28,
                  height: 20,
                  border: 'none',
                  padding: 0,
                  background: 'transparent',
                }}
              />
            </div>
          )}
        </div>
      )}
  <div
    style={{
      position: 'fixed',
      top: '50%',
      right: 16,
      transform: 'translateY(-50%)',
      width: 52,
      padding: 8,
      borderRadius: 14,
      background: '#ffffff',
      boxShadow: '0 6px 18px rgba(15,23,42,0.2)',
      display: rightToolsOpen ? 'flex' : 'none',
      flexDirection: 'column',
      gap: 6,
      zIndex: 50,
    }}
  >
    <button
      type="button"
      onClick={handleStartVideoConference}
      disabled={!readyForCall}
      style={{
        ...toolbarButtonStyle(!!activeCall),
        cursor: readyForCall ? 'pointer' : 'not-allowed',
        opacity: readyForCall ? 1 : 0.4,
      }}
      title="Видеоконференция"
    >
      <span
        style={{
          fontSize: 20,
          lineHeight: 1,
          color: activeCall ? '#ffffff' : '#4b5563',
        }}
      >
        📷
      </span>
    </button>

    <button
      type="button"
      onClick={() => setAiMenuOpen((v) => !v)}
      style={toolbarButtonStyle(aiChatOpen)}
      title="ИИ‑ассистент"
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1,
          color: aiChatOpen ? '#ffffff' : '#4b5563',
        }}
      >
        AI
      </span>
    </button>

    <button
      type="button"
      onClick={() => setSaveMenuOpen((v) => !v)}
      style={toolbarButtonStyle(saveMenuOpen)}
      title="Сохранить / экспорт"
    >
      <span
        style={{
          fontSize: 18,
          lineHeight: 1,
          color: saveMenuOpen ? '#ffffff' : '#4b5563',
        }}
      >
        💾
      </span>
    </button>
  </div>
  {aiMenuOpen && (
    <div
      style={{
        position: 'fixed',
        top: 64,
        right: 64,
        padding: 8,
        borderRadius: 10,
        background: '#ffffff',
        boxShadow: '0 8px 20px rgba(15,23,42,0.25)',
        zIndex: 60,
        minWidth: 220,
      }}
    >
      {assistants.length === 0 && (
        <div style={{ fontSize: 13, color: '#6b7280', padding: '4px 6px' }}>
          Ассистенты не найдены
        </div>
      )}
      {assistants.map((assistant) => (
        <button
          key={assistant.id}
          type="button"
          onClick={() => {
            setSelectedAssistant(assistant);
            setAiChatOpen(true);
            setAiMenuOpen(false);
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '6px 8px',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            color: '#000000',
          }}
        >
          {assistant.name}
        </button>
      ))}
    </div>
  )}
{aiChatOpen && board && (
  <AiChatDialog
    boardUuid={board.uuid}
    assistants={assistants}
    initialAssistant={selectedAssistant}
    context={{
      selectedElements: elements.filter((el) => selectedIds.includes(el.id)),
      boardTitle: board.title,
    }}
    messages={aiMessages}
    setMessages={setAiMessages}
    onClose={() => setAiChatOpen(false)}
        position={aiDialogPosition}
        setPosition={setAiDialogPosition}
          size={aiSize}
          setSize={setAiSize}
  />
)}
  {saveMenuOpen && (
    <div
      style={{
        position: 'fixed',
        top: 64,
        right: 64,
        padding: 8,
        borderRadius: 10,
        background: '#ffffff',
        boxShadow: '0 8px 20px rgba(15,23,42,0.25)',
        zIndex: 60,
        minWidth: 200,
      }}
    >
      <button
        type="button"
        onClick={() => {
          setTool('EXPORT');
          setSaveMenuOpen(false);
        }}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '6px 8px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 13,
          color: '#000000',
        }}
      >
        Экспорт фрагмента доски
      </button>
      <button
        type="button"
        onClick={() => {
          handleExportBoardFile();
          setSaveMenuOpen(false);
        }}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '6px 8px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 13,
          color: '#000000',
        }}
      >
        Экспорт всей доски в файл
      </button>
    </div>
  )}
              <div className="board-wrapper"
                         style={{
                           position: 'relative',
                           flex: 1,
                           minHeight: 0,
                         }}>
        <BoardCanvas
          boardUuid={board.uuid}
          elements={elementsToRender}
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
          displayName={displayName}
          getUserColor={getUserColor}
          getUserName={getUserName}
        />
      </div>
        {needName && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4000,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 20,
                minWidth: 320,
                maxWidth: 400,
                boxShadow: '0 10px 30px rgba(15,23,42,0.4)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Как вас называть?
              </h2>
              <p
                style={{
                  margin: 0,
                  marginBottom: 12,
                  fontSize: 13,
                  color: '#4b5563',
                }}
              >
                Введите имя или псевдоним. Его будут видеть другие участники на доске.
              </p>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  marginBottom: 12,
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                }}
              />
              <button
                type="button"
                onClick={handleSaveName}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Продолжить
              </button>
            </div>
          </div>
        )}

        {showUuidNotice && board && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4000,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 20,
                minWidth: 340,
                maxWidth: 440,
                boxShadow: '0 10px 30px rgba(15,23,42,0.4)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#b91c1c',
                }}
              >
                ВНИМАНИЕ!
              </h2>
              <p
                style={{
                  margin: 0,
                  marginBottom: 12,
                  fontSize: 13,
                  color: '#4b5563',
                }}
              >
                Вы создали анонимную доску. Чтобы вернуться к ней позже, сохраните её
                UUID. Без этого идентификатора вы не сможете открыть доску в будущем.
              </p>

              <div
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                UUID доски:
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <input
                  readOnly
                  value={board.uuid}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 12,
                    color: '#111827',
                    backgroundColor: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/boards/${board.uuid}`;
                    navigator.clipboard
                      .writeText(link)
                      .then(() => {
                        setShowCopyToast(true);
                        setTimeout(() => setShowCopyToast(false), 2000);
                      })
                      .catch((err) => console.error('Copy link failed', err));
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Скопировать
                </button>
              </div>

              <p
                style={{
                  margin: 0,
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                Ссылку на доску также можно скопировать, нажав на форму с названием
                доски и её UUID в левом верхнем углу экрана.
              </p>

              <button
                type="button"
                onClick={() => setShowUuidNotice(false)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  color: '#111827',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Понятно
              </button>
            </div>
          </div>
        )}
        {showHistoryControls && (
          <div
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 32, // было 16
                    transform: 'translateX(-50%)',
                    padding: 8,
                    borderRadius: 12,
                    background: '#ffffff',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    zIndex: 2000,
            }}
          >
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: canUndo ? '#f9fafb' : '#f3f4f6',
                cursor: canUndo ? 'pointer' : 'not-allowed',
                fontSize: 14,
                color: '#000000',
              }}
              title="Отменить"
            >
              ←
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: canRedo ? '#f9fafb' : '#f3f4f6',
                cursor: canRedo ? 'pointer' : 'not-allowed',
                fontSize: 14,
                color: '#000000',
              }}
              title="Повторить"
            >
              →
            </button>
            <span
              style={{
                fontSize: 13,
                color: '#000000',
                marginLeft: 4,
                marginRight: 4,
              }}
            >
              {isPreviewMode
                ? 'Просмотр сохранённой версии'
                : 'Текущая версия доски'}
            </span>
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const newId = val ? Number(val) : null;
                  setSelectedId(newId);
                  setSelectedVersionId(newId);
                }}
                style={{
                  fontSize: 11,
                  padding: '2px 4px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  maxWidth: 220,
                }}
              >
                <option value="">Версии доски…</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {(v.label || `Версия #${v.id}`) +
                      ' — ' +
                      new Date(v.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handlePreviewVersion}
                disabled={selectedId == null || previewActive}
                style={{
                  padding: '3px 8px',
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  background: selectedId != null && !previewActive ? '#f9fafb' : '#f3f4f6',
                  fontSize: 11,
                  cursor:
                    selectedId != null && !previewActive ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                  color: '#111827',
                }}
              >
                Просмотреть
              </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentVersion}
                  disabled={creatingVersion || versionsLoading}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background:
                      creatingVersion || versionsLoading ? '#f3f4f6' : '#f9fafb',
                    fontSize: 11,
                    lineHeight: 1.2,
                    cursor:
                      creatingVersion || versionsLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    color: '#111827',
                  }}
                  title="Сохранить текущую версию доски"
                >
                  {creatingVersion ? 'Сохраняю…' : 'Сохранить версию'}
                </button>
            {isPreviewMode && (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewElements(null)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: '#000000',
                  }}
                >
                  Выйти из превью
                </button>
                <button
                    type="button"
                    onClick={handleRequestRestore}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #f97316',
                    background: '#fff7ed',
                    color: '#c2410c',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Запросить откат для всех
                </button>
              </>
            )}
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
{shareOpen && board && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
    }}
    onClick={() => setShareOpen(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: '#ffffff',
        borderRadius: 10,
        padding: 16,
        minWidth: 360,
        boxShadow: '0 8px 24px rgba(15,23,42,0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>Доступ к доске</h3>
        <button
          type="button"
          onClick={() => setShareOpen(false)}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 4,
          }}
        >
          Ссылка на доску
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            readOnly
            value={`${window.location.origin}/boards/${board.uuid}`}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 12,
              color: '#111827',
            }}
          />
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 4,
          }}
        >
          Доступ по ссылке
        </div>

        {isOwner ? (
          <select
            disabled={updatingAccess}
            value={board.accessMode}
            onChange={(e) =>
              handleChangeAccess(
                e.target.value as 'PRIVATE' | 'LINK_VIEW' | 'LINK_EDIT',
              )
            }
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
            }}
          >
            <option value="PRIVATE">Только владелец</option>
            <option value="LINK_VIEW">По ссылке — только просмотр</option>
            <option value="LINK_EDIT">По ссылке — редактирование</option>
          </select>
        ) : (
          <div style={{ fontSize: 13, color: '#374151' }}>
            {board.accessMode === 'PRIVATE'
              ? 'Только владелец'
              : board.accessMode === 'LINK_VIEW'
              ? 'По ссылке — только просмотр'
              : 'По ссылке — редактирование'}
          </div>
        )}

        {!isOwner && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            Только владелец доски может изменять права доступа.
          </div>
        )}
      </div>
    </div>
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