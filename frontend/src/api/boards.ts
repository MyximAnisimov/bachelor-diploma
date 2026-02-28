import { api } from './http';
import type { BoardDto, CreateBoardRequest, UpdateBoardRequest } from './types';

export async function getMyBoards(): Promise<BoardDto[]> {
  const res = await api.get<BoardDto[]>('/api/boards');
  return res.data;
}

export async function createBoard(req: CreateBoardRequest): Promise<BoardDto> {
  const res = await api.post<BoardDto>('/api/boards/temporary', req);
  return res.data;
}

export async function getBoard(boardUuid: string): Promise<BoardDto> {
  const res = await api.get<BoardDto>(`/api/boards/${boardUuid}`);
  return res.data;
}

export async function updateBoard(boardUuid: string, req: UpdateBoardRequest): Promise<BoardDto> {
  const res = await api.put<BoardDto>(`/api/boards/${boardUuid}`, req);
  return res.data;
}

export async function deleteBoard(boardUuid: string): Promise<void> {
  await api.delete(`/api/boards/${boardUuid}`);
}