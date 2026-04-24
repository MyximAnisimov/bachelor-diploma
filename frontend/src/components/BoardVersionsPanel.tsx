import { useEffect, useState } from 'react';
import {
  fetchBoardVersions,
  createBoardVersion,
  restoreBoardVersion,
  type BoardVersionDto,
} from '../api/boardVersions';

interface Props {
  boardUuid: string;
}

export function BoardVersionsPanel({ boardUuid }: Props) {
  const [versions, setVersions] = useState<BoardVersionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  async function load() {
    console.log('Loading versions for', boardUuid);
    setLoading(true);
    try {
      const data = await fetchBoardVersions(boardUuid);
      setVersions(data);
    } catch (e) {
      console.error('Failed to load versions', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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

  async function handleRestore(id: number) {
    if (!window.confirm('Откатиться к этой версии? Текущее состояние будет перезаписано.')) {
      return;
    }
    setRestoringId(id);
    try {
      await restoreBoardVersion(boardUuid, id);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div>
      <button onClick={handleCreate} disabled={creating}>
        {creating ? 'Создание…' : 'Сохранить версию'}
      </button>

      {loading ? (
        <p>Загрузка версий…</p>
      ) : versions.length === 0 ? (
        <p>Версий пока нет</p>
      ) : (
        <ul>
          {versions.map((v) => (
            <li key={v.id}>
              <span>
                {v.label || `Версия #${v.id}`} —{' '}
                {new Date(v.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleRestore(v.id)}
                disabled={restoringId === v.id}
              >
                {restoringId === v.id ? 'Откат…' : 'Откатиться'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}