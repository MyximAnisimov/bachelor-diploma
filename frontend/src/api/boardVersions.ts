import { api } from './http';

export interface BoardVersionDto {
  id: number;
  boardUuid: string;
  createdAt: string;
  createdById: number | null;
  label: string | null;
}

export async function fetchBoardVersions(boardUuid: string): Promise<BoardVersionDto[]> {
  const { data } = await api.get(`/api/boards/${boardUuid}/versions`);
  return data;
}

export async function createBoardVersion(
  boardUuid: string,
  label?: string,
): Promise<BoardVersionDto> {
  const body = label ? { label } : {};
  const { data } = await api.post(`/api/boards/${boardUuid}/versions`, body);
  return data;
}

export async function restoreBoardVersion(
  boardUuid: string,
  versionId: number,
): Promise<void> {
  await api.post(`/api/boards/${boardUuid}/versions/${versionId}/restore`);
}

export async function fetchBoardVersionPreview(
  boardUuid: string,
  versionId: number,
): Promise<BoardElementDto[]> {
  const { data } = await api.get(`/api/boards/${boardUuid}/versions/${versionId}/preview`);
  return data;
}