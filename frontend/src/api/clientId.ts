import { v4 as uuidv4 } from 'uuid';

export const clientId = (() => {
  const key = 'board-client-id';
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = uuidv4();
  localStorage.setItem(key, id);
  return id;
})();