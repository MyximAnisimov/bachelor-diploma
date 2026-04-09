export type ElementType = 'SHAPE' | 'TEXT' | 'STICKY' | 'ARROW' | 'BRUSH' | 'MEDIA';

export type BoardAccessMode = 'PRIVATE' | 'LINK_VIEW' | 'LINK_EDIT';

export type Tool =
  | 'SELECT'
  | 'HAND'
  | 'BRUSH'
  | 'ERASER'
  | 'TEXT'
  | 'STICKY'
  | 'SHAPE_RECT'
  | 'SHAPE_CIRCLE'
  | 'SHAPE_ELLIPSE'
  | 'SHAPE_RHOMBUS'
  | 'SHAPE_TRAPEZOID'
  | 'SHAPE_CYLINDER'
  | 'ARROW';

export interface BoardDto {
  uuid: string;
  title: string;
  temporary: boolean;
  createdAt: string;
  updatedAt: string;
  accessMode: BoardAccessMode;
  ownerId: number | null;
}

export interface BoardElementDto {
  id: number;
  type: ElementType;

  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  zIndex: number;

  groupId?: string | null;

  lockedPosition: boolean;
  lockedEditing: boolean;

  mediaId?: number | null;

  properties: any;
}

export interface CreateBoardRequest {
  title: string;
  temporary?: boolean;
}

export interface UpdateBoardRequest {
  title?: string;
  temporary?: boolean;
}

export interface BoardElementCreateRequest {
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  groupId?: string | null;
  mediaId?: number | null;
  properties?: any;
}

export interface BoardElementUpdateRequest {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  groupId?: string | null;
  lockedPosition?: boolean;
  lockedEditing?: boolean;
  mediaId?: number | null;
  properties?: any;
}

export interface ElementTransformRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface UserDto {
  id: number;
  email: string;
  name?: string;
  avatarUrl?: string;
}