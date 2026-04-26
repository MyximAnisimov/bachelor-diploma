import React, { useEffect, useState } from 'react';
import {
  fetchBoardVersions,
  createBoardVersion,
  fetchBoardVersionPreview,
} from '../api/boardVersions';
import type { BoardElementDto } from '../api/types';

interface Props {
  boardUuid: string;
  onPreviewVersion?: (elements: BoardElementDto[] | null) => void;
  isOwner?: boolean;
  sendState?: (msg: any) => void;
  currentUserName?: string;
}

export const BoardVersionsPanel: React.FC<Props> = ({
  boardUuid,
  onPreviewVersion,
  isOwner,
  sendState,
  currentUserName,
}) => {
  const [versions, setVersions] = useState<BoardVersionDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchBoardVersions(boardUuid);
      setVersions(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!boardUuid) return;
    load();
  }, [boardUuid]);

  async function handleCreate() {
    const label = window.prompt('Название версии (опционально):') || undefined;
    setCreating(true);
    try {
      await createBoardVersion(boardUuid, label);
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function handlePreview() {
    if (!onPreviewVersion || selectedId == null) return;
    const data = await fetchBoardVersionPreview(boardUuid, selectedId);
    onPreviewVersion(data);
    setPreviewActive(true);
  }

  function handleExitPreview() {
    if (!onPreviewVersion) return;
    onPreviewVersion(null);
    setPreviewActive(false);
  }

  async function handleRestore() {
    if (selectedId == null) return;

    if (!sendState) {
      alert('Невозможно отправить запрос на откат (нет соединения с сервером)');
      return;
    }

    const version = versions.find((v) => v.id === selectedId);

    console.log('SEND VERSION_RESTORE_REQUEST', {
      versionId: selectedId,
      label: version?.label,
      requestedBy: currentUserName,
    });

    sendState({
      type: 'VERSION_RESTORE_REQUEST',
      payload: {
        versionId: selectedId,
        label: version?.label ?? `#${selectedId}`,
        requestedBy: {
          name: currentUserName || 'Пользователь',
        },
      },
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select
        value={selectedId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          setSelectedId(val ? Number(val) : null);
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

      <button onClick={handleCreate} disabled={creating || loading}>
        {creating ? 'Сохраняю…' : 'Сохранить версию'}
      </button>

      {onPreviewVersion && (
        <>
          <button
            onClick={handlePreview}
            disabled={selectedId == null || previewActive}
          >
            Просмотреть
          </button>
          <button
            onClick={handleExitPreview}
            disabled={!previewActive}
          >
            Выйти из превью
          </button>
        </>
      )}

      <button
        onClick={handleRestore}
        disabled={selectedId == null}
      >
        {isOwner ? 'Запросить откат (решает владелец)' : 'Запросить откат'}
      </button>
    </div>
  );
};