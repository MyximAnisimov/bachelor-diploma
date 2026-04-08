import { api } from './http';

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post('/api/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data as {
    id: number | null;
    url: string;
    width?: number | null;
    height?: number | null;
    contentType?: string | null;
  };
}