import { api } from './http';
import { clientId } from './clientId';
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
  dto: BoardElementDto,
) {
  const body = {
    x: dto.x,
    y: dto.y,
    width: dto.width,
    height: dto.height,
    rotation: dto.rotation,
    properties: dto.properties,
    clientId, // НОВОЕ
  };

  const res = await api.patch<BoardElementDto>(
    `/api/boards/${boardUuid}/elements/${elementId}/transform`,
    body,
  );
  return res.data;
}

export async function deleteElement(boardUuid: string, elementId: number): Promise<void> {
  await api.delete(`/api/boards/${boardUuid}/elements/${elementId}`);
}