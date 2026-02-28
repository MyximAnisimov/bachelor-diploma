import { api } from './http';
import type {
  BoardElementDto,
  BoardElementCreateRequest,
  BoardElementUpdateRequest,
  ElementTransformRequest,
} from './types';

export async function getBoardElements(boardUuid: string): Promise<BoardElementDto[]> {
  const res = await api.get<BoardElementDto[]>(`/api/boards/${boardUuid}/elements`);
  return res.data;
}

export async function createElement(
  boardUuid: string,
  req: BoardElementCreateRequest,
): Promise<BoardElementDto> {
  const res = await api.post<BoardElementDto>(`/api/boards/${boardUuid}/elements`, req);
  return res.data;
}

export async function updateElement(
  boardUuid: string,
  elementId: number,
  req: BoardElementUpdateRequest,
): Promise<BoardElementDto> {
  const res = await api.put<BoardElementDto>(
    `/api/boards/${boardUuid}/elements/${elementId}`,
    req,
  );
  return res.data;
}

export async function transformElement(
  boardUuid: string,
  elementId: number,
  req: ElementTransformRequest,
): Promise<BoardElementDto> {
  const res = await api.patch<BoardElementDto>(
    `/api/boards/${boardUuid}/elements/${elementId}/transform`,
    req,
  );
  return res.data;
}

export async function deleteElement(boardUuid: string, elementId: number): Promise<void> {
  await api.delete(`/api/boards/${boardUuid}/elements/${elementId}`);
}