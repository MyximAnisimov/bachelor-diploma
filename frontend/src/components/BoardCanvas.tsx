import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Line, Group, Circle, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Dispatch, SetStateAction } from 'react';
import type { BoardElementDto } from '../api/types';
import { useBoardWs, sendLock, sendCursor } from '../hooks/useBoardsWs';
import { transformElement, deleteElement, createElement } from '../api/elements';
import { ShapeElement } from '../elements/ShapeElement';
import { BrushElement } from '../elements/BrushElement';
import { TextElement } from '../elements/TextElement';
import { StickerElement } from '../elements/StickerElement';
import { ArrowElement } from '../elements/ArrowElement';
import { MediaElement } from '../elements/MediaElement';

type Tool = 'SELECT' | 'HAND' | 'BRUSH' | 'TEXT' | 'STICKER' | 'ARROW' | 'EXPORT';

interface Props {
  boardUuid: string;
  elements: BoardElementDto[];
  tool: Tool;
  setTool: (tool: Tool) => void;
  shapeKind: ShapeKind;
  brushSize: number;
  brushColor: string;
  isEraser: boolean;
  clientId: string;
  locks: Record<number, string>;
  remoteCursors: Record<string, { x: number; y: number }>;
  selectedIds: number[];
  setSelectedIds: Dispatch<SetStateAction<number[]>>;
  boardCanEdit: boolean;
    applyElementChanges: (
      changes: { id: number; patch: Partial<BoardElementDto> }[],
      options?: { recordHistory?: boolean },
    ) => void;
  addElements: (
    newElements: BoardElementDto[],
    options?: { recordHistory?: boolean },
  ) => void;
  deleteElements: (
    ids: number[],
    options?: { recordHistory?: boolean },
  ) => void;
  transformElementOnServer: (
    boardUuid: string,
    elementId: number,
    payload: ReturnType<typeof toUpdatePayload>,
  ) => Promise<BoardElementDto>;
displayName: string;
getUserColor: (clientId: string) => string;
getUserName: (clientId: string) => string;
}

interface ArrowProperties {
  fromId?: number;
  toId?: number;
  fromAnchorIndex?: number;
  toAnchorIndex?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color: string;
  strokeWidth: number;
}

interface SelectionRectState {
  visible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

type RemoteCursor = {
  x: number;
  y: number;
  name?: string;
};

type ExportFormat = 'png' | 'jpeg' | 'webp';

function getStickerAnchors(el: BoardElementDto) {
  const w = el.width;
  const h = el.height;
  return [
    // углы
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
    // середины сторон
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ];
}

type InfiniteGridProps = {
  step?: number;
  extent?: number;
};

export function InfiniteGrid({ step = 20, extent = 10000 }: InfiniteGridProps) {
  const lines: JSX.Element[] = [];
  const from = -extent;
  const to = extent;

  for (let x = from; x <= to; x += step) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, from, x, to]}
        stroke="#ddd"
        strokeWidth={1}
        listening={false}
      />,
    );
  }

  for (let y = from; y <= to; y += step) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[from, y, to, y]}
        stroke="#ddd"
        strokeWidth={1}
        listening={false}
      />,
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
}

export const BoardCanvas: React.FC<Props> = ({
  boardUuid,
  elements,
  brushSize,
  brushColor,
  tool,
  setTool,
  isEraser,
  locks,
  clientId,
  remoteCursors,
  selectedIds,
  setSelectedIds,
  shapeKind,
  boardCanEdit,
  applyElementChanges,
  addElements,
  deleteElements,
  transformElementOnServer,
  displayName,
  getUserColor,
  getUserName,
}) => {
  const [selectionRect, setSelectionRect] = useState<SelectionRectState>({
    visible: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [clipboard, setClipboard] = useState<BoardElementDto[] | null>(null);
  const [clipboardMode, setClipboardMode] = useState<'copy' | 'cut' | null>(
    null,
  );

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  const transformerRef = useRef<any>(null);
  const nodeRefs = useRef<Record<number, any>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [brushPoints, setBrushPoints] = useState<number[] | null>(null)
const [shapeColorPicker, setShapeColorPicker] = useState<{
  elementId: number;
  mode: 'fill' | 'stroke';
} | null>(null);

const [freeArrowStart, setFreeArrowStart] = useState<{ x: number; y: number } | null>(null);
const [freeArrowEnd, setFreeArrowEnd] = useState<{ x: number; y: number } | null>(null);

    const [needName, setNeedName] = useState(!displayName);

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

const [hideDuringExport, setHideDuringExport] = useState(false);
const [exportBackgroundColor, setExportBackgroundColor] = useState<string | null>(null);

const selectedArrow = elements.find(
  (el) => el.type === 'ARROW' && selectedIds.includes(el.id),
);
const arrowIsSelected = !!selectedArrow;

const [size, setSize] = useState({ width: 0, height: 0 });

useLayoutEffect(() => {
  if (!containerRef.current) return;

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    setSize({ width, height });
  });

  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);

const { width, height } = size;

useEffect(() => {
  const transformer = transformerRef.current;
  if (!transformer) return;

  const nodes: Konva.Node[] = [];
  (selectedIds ?? []).forEach((id) => {
    const node = nodeRefs.current[id];
    if (node) nodes.push(node);
  });

  transformer.nodes(nodes);
  transformer.getLayer()?.batchDraw();
}, [selectedIds, elements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  useEffect(() => {
    if (!shapeColorPicker) return;

    if (!selectedIds.includes(shapeColorPicker.elementId)) {
      setShapeColorPicker(null);
    }
  }, [selectedIds, shapeColorPicker]);

const prevSelectedRef = useRef<number[]>([]);

useEffect(() => {
  const prev = prevSelectedRef.current;
  const curr = selectedIds;

  const added = (curr ?? []).filter((id) => !(prev ?? []).includes(id));
  const removed = (prev ?? []).filter((id) => !(curr ?? []).includes(id));

  if (added.length > 0) {
    sendLock(boardUuid, added, 'LOCK');
  }
  if (removed.length > 0) {
    sendLock(boardUuid, removed, 'UNLOCK');
  }

  prevSelectedRef.current = curr;
}, [selectedIds, boardUuid]);

const [textEditor, setTextEditor] = useState<{
  id: number;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
} | null>(null);

    useEffect(() => {
      if (textEditor && textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.select();
      }
    }, [textEditor?.id]);

  const [arrowDraft, setArrowDraft] = useState<{ fromId: number } | null>(null);

  useEffect(() => {
    if (tool !== 'ARROW') {
      setArrowDraft(null);
    }
  }, [tool]);

const handleElementChange = async (updated: BoardElementDto) => {
  applyElementChanges(
    [{ id: updated.id, patch: updated }],
    { recordHistory: true },
  );
  try {
    await transformElementOnServer(
      boardUuid,
      updated.id,
      updated,
    );
  } catch (err) {
    console.error('Failed to save element', err);
  }
};

const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
      if (tool === 'EXPORT' && isDrawingCrop && cropRect) {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        const logicalX = (pos.x - stagePos.x) / stageScale;
        const logicalY = (pos.y - stagePos.y) / stageScale;

        setCropRect({
          x: cropRect.x,
          y: cropRect.y,
          width: logicalX - cropRect.x,
          height: logicalY - cropRect.y,
        });
        return;
      }
  const stage = e.target.getStage();
  if (!stage) return;
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const logicalX = (pointerPos.x - stagePos.x) / stageScale;
  const logicalY = (pointerPos.y - stagePos.y) / stageScale;

  sendCursor(boardUuid, logicalX, logicalY, displayName);
};

const handleMouseUp = () => {
  if (tool === 'EXPORT' && isDrawingCrop) {
    setIsDrawingCrop(false);
  }
};

  const handleDeleteSelected = async () => {
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);

  deleteElements(idsToDelete, { recordHistory: true });

  try {
    await Promise.all(idsToDelete.map((id) => deleteElement(boardUuid, id)));
  } catch (e) {
    console.error('Failed to delete some elements', e);
  }
  };

  const openContextMenuAt = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const getPointerPositionLogical = (stage: any) => {
    const pos = stage.getPointerPosition();
    if (!pos) return null;

    return {
      x: (pos.x - stagePos.x) / stageScale,
      y: (pos.y - stagePos.y) / stageScale,
    };
  };

const exportCrop = async (format: 'png' | 'jpeg' | 'webp' = 'png') => {
  if (!stageRef.current || !cropRect) return;

  const x = Math.min(cropRect.x, cropRect.x + cropRect.width);
  const y = Math.min(cropRect.y, cropRect.y + cropRect.height);
  const width = Math.abs(cropRect.width);
  const height = Math.abs(cropRect.height);

  if (width < 5 || height < 5) return;

  const backgroundColor = format === 'png' ? null : '#ffffff';

  const mimeType =
    format === 'jpeg'
      ? 'image/jpeg'
      : format === 'webp'
      ? 'image/webp'
      : 'image/png';

  try {
    setHideDuringExport(true);
    setExportBackgroundColor(backgroundColor);

    await new Promise((resolve) => requestAnimationFrame(resolve));

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
  } finally {
    setHideDuringExport(false);
    setExportBackgroundColor(null);
  }
};

const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
  if (textEditor) {
    const stage = e.target.getStage();
    if (!stage) return;
    const isClickOnStage = e.target === stage;
    if (isClickOnStage) {
      commitTextEditor();
      return;
    }
  }

  closeContextMenu();
  if (tool !== 'SELECT') return;
  const stage = e.target.getStage();
  if (!stage) return;
  const isEmpty = e.target === stage;
  if (!isEmpty) return;
  const pos = getPointerPositionLogical(stage);
  if (!pos) return;
  setSelectedIds([]);
  setSelectionRect({
    visible: true,
    x1: pos.x,
    y1: pos.y,
    x2: pos.x,
    y2: pos.y,
  });
};

const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
  if (!selectionRect.visible || tool !== 'SELECT') return;

  const stage = e.target.getStage();
  if (!stage) return;
  const pos = getPointerPositionLogical(stage);
  if (!pos) return;

  setSelectionRect((prev) => ({
    ...prev,
    x2: pos.x,
    y2: pos.y,
  }));
};

const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
  if (!selectionRect.visible || tool !== 'SELECT') return;

  const { x1, y1, x2, y2 } = selectionRect;
  const rect = {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };

  const newlySelected = elements.filter((el) => {
    const ex = el.x;
    const ey = el.y;
    const ew = el.width;
    const eh = el.height;

    const intersect =
      ex < rect.x + rect.width &&
      ex + ew > rect.x &&
      ey < rect.y + rect.height &&
      ey + eh > rect.y;

    return intersect;
  });

  setSelectedIds(newlySelected.map((el) => el.id));

  setSelectionRect((prev) => ({
    ...prev,
    visible: false,
  }));
};

const handleBrushMouseDown = (e: KonvaEventObject<MouseEvent>) => {
  if (tool !== 'BRUSH') return;
  const stage = e.target.getStage();
  if (!stage) return;
  const pos = getPointerPositionLogical(stage);
  if (!pos) return;

  setBrushPoints([pos.x, pos.y]);
};

const handleBrushMouseMove = (e: KonvaEventObject<MouseEvent>) => {
  if (tool !== 'BRUSH' || !brushPoints) return;
  const stage = e.target.getStage();
  if (!stage) return;
  const pos = getPointerPositionLogical(stage);
  if (!pos) return;

  setBrushPoints((prev) => (prev ? [...prev, pos.x, pos.y] : prev));
};

const handleBrushMouseUp = async (e: KonvaEventObject<MouseEvent>) => {
  if (tool !== 'BRUSH' || !brushPoints || brushPoints.length < 4) {
    setBrushPoints(null);
    return;
  }

  const strokeColor = isEraser ? '#f5f5f5' : brushColor;
  const points = brushPoints;
  setBrushPoints(null);

  let minX = points[0];
  let minY = points[1];
  let maxX = points[0];
  let maxY = points[1];

  for (let i = 2; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  let width = maxX - minX;
  let height = maxY - minY;

  if (width <= 0) width = 1;
  if (height <= 0) height = 1;

  const localPoints: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    localPoints.push(points[i] - minX, points[i + 1] - minY);
  }

  try {
    const el = await createElement(boardUuid, {
      type: 'BRUSH',
      x: minX,
      y: minY,
      width,
      height,
      rotation: 0,
      properties: {
        points: localPoints,
        stroke: strokeColor,
        strokeWidth: brushSize,
        eraser: isEraser,
      },
    });
    addElements([el], { recordHistory: true });
    setSelectedIds([el.id]);
  } catch (err) {
    console.error('Failed to create brush element', err);
  }
};

const openTextEditorForElement = (el: BoardElementDto) => {
  const props = (el.properties || {}) as any;
  const text = props.text || '';
  const fontSize = props.fontSize ?? 18;
  const fontFamily = props.fontFamily ?? 'Arial';
  const color = props.color ?? '#000000';

  const x = stagePos.x + el.x * stageScale;
  const y = stagePos.y + el.y * stageScale;
  const width = el.width * stageScale;
  const height = el.height * stageScale;

  setTextEditor({
    id: el.id,
    value: text,
    x,
    y,
    width,
    height,
    fontSize,
    fontFamily,
    color,
  });
};

const commitTextEditor = async () => {
  if (!textEditor) return;

  const editor = textEditor;
  setTextEditor(null);

  const el = elements.find((e) => e.id === editor.id);
  if (!el) return;

  if (!editor.value.trim()) {
    await handleDeleteElement(editor.id);
    return;
  }

  const updated: BoardElementDto = {
    ...el,
    properties: {
      ...(el.properties || {}),
      text: editor.value,
      fontSize: editor.fontSize,
      fontFamily: editor.fontFamily,
      color: editor.color,
    },
  };

  await handleElementChange(updated);
};


const handleTextEditorChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const v = e.target.value;
    setTextEditor((prev) => (prev ? { ...prev, value: v } : prev));
};

const createArrowBetweenStickers = async (
  fromId: number,
  fromAnchorIndex: number,
  toId: number,
  toAnchorIndex: number,
) => {
  try {
    const el = await createElement(boardUuid, {
      type: 'ARROW',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      properties: {
        fromId,
        toId,
        fromAnchorIndex,
        toAnchorIndex,
        color: '#000000',
        strokeWidth: 2,
      },
    });

    setSelectedIds([el.id]);
  } catch (err) {
    console.error('Failed to create arrow element', err);
  } finally {
    setArrowDraft(null);
  }
};



  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (tool !== 'HAND') return;
    setStagePos({ x: e.target.x(), y: e.target.y() });
  };

const handleElementClick = (
  el: BoardElementDto,
  evt: KonvaEventObject<MouseEvent>,
) => {
  evt.cancelBubble = true;

  if (tool === 'ARROW' && el.type === 'STICKER') {
    const stage = evt.target.getStage();
    if (!stage) return;

    const pointer = getPointerPositionLogical(stage);
    if (!pointer) return;

    const localX = pointer.x - el.x;
    const localY = pointer.y - el.y;

    const anchors = getStickerAnchors(el);

    let bestIndex = 0;
    let bestDist = Infinity;
    anchors.forEach((p, idx) => {
      const dx = p.x - localX;
      const dy = p.y - localY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIndex = idx;
      }
    });

    if (!arrowDraft) {
      setArrowDraft({ fromId: el.id, fromAnchorIndex: bestIndex });
    } else {
      if (arrowDraft.fromId === el.id && arrowDraft.fromAnchorIndex === bestIndex) {
        setArrowDraft(null);
      } else {
        createArrowBetweenStickers(
          arrowDraft.fromId,
          arrowDraft.fromAnchorIndex,
          el.id,
          bestIndex,
        );
      }
    }

    return;
  }

  if (tool !== 'SELECT') return;

  const isSelected = selectedIds.includes(el.id);

  if (evt.evt.shiftKey || evt.evt.ctrlKey || evt.evt.metaKey) {
  setSelectedIds((prev) => {
    const next = isSelected ? prev.filter((id) => id !== el.id) : [...prev, el.id];
    console.log('After selection (multi):', next);
    return next;
  });
  } else {
        const next = [el.id];
        console.log('After selection (single):', next);
    setSelectedIds([el.id]);
  }
};

  const handleElementContextMenu = (
    el: BoardElementDto,
    e: KonvaEventObject<PointerEvent>,
  ) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();

    setSelectionRect((prev) => ({ ...prev, visible: false }));

    setSelectedIds((prev) =>
      prev.includes(el.id) ? prev : [el.id],
    );

    openContextMenuAt(e.evt.clientX, e.evt.clientY);
  };

  const handleCopy = () => {
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    if (selected.length === 0) return;

    setClipboard(selected);
    setClipboardMode('copy');
    closeContextMenu();
  };

  const handleCut = () => {
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    if (selected.length === 0) return;

    setClipboard(selected);
    setClipboardMode('cut');
    handleDeleteSelected();
    closeContextMenu();
  };

  const handleDuplicate = async () => {
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    if (selected.length === 0) return;

    const offset = 20;
    try {
      const created: BoardElementDto[] = [];

      for (const el of selected) {
        const res = await createElement(boardUuid, {
          type: el.type,
          x: el.x + offset,
          y: el.y + offset,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          zIndex: el.zIndex + 1,
          groupId: el.groupId ?? undefined,
          mediaId: el.mediaId ?? undefined,
          properties: el.properties,
        });
        created.push(res);
      }
      setSelectedIds(created.map((el) => el.id));
    } catch (e) {
      console.error('Failed to duplicate elements', e);
    } finally {
      closeContextMenu();
    }
  };

const [cropRect, setCropRect] = useState<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);
const [isDrawingCrop, setIsDrawingCrop] = useState(false);

const openShapeColorMenu = (elementId: number, mode: 'fill' | 'stroke') => {
  setShapeColorPicker({ elementId, mode });
};

const handleDeleteElement = async (id: number) => {
  const el = elements.find(e => e.id === id);
  if (!el) return;
  try {
    await deleteElement(boardUuid, id);
  } catch (err) {
    console.error('Failed to delete element', err);
  }
};

const handleEraserDown = (e: KonvaEventObject<MouseEvent>) => {
  const stage = e.target.getStage();
  if (!stage) return;

  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const logicalX = (pointerPos.x - stagePos.x) / stageScale;
  const logicalY = (pointerPos.y - stagePos.y) / stageScale;

  const eraserRadius = brushSize;

  const idsToDelete: number[] = [];

  for (const el of elements) {
    if (el.type !== 'BRUSH') continue;
    const props = (el.properties || {}) as any;
    const points: number[] = props.points || [];

    for (let i = 0; i < points.length; i += 2) {
      const px = el.x + points[i];
      const py = el.y + points[i + 1];
      const dx = px - logicalX;
      const dy = py - logicalY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= eraserRadius) {
        idsToDelete.push(el.id);
        break;
      }
    }
  }

  if (idsToDelete.length === 0) return;

  for (const id of idsToDelete) {
    handleDeleteElement(id);
  }
};

const stageRef = useRef<Konva.Stage | null>(null);

  const handleCreateElementOnClick = async (e: KonvaEventObject<MouseEvent>) => {
  if (tool !== 'TEXT' && tool !== 'STICKER' && tool !== 'SHAPE') return;
  if (e.evt.button !== 0) return;
  const stage = e.target.getStage();
  if (!stage) return;
  const isEmpty = e.target === stage;
  if (!isEmpty) return;
  const pos = getPointerPositionLogical(stage);
  if (!pos) return;

    try {
      if (tool === 'TEXT') {
        const width = 250;
        const height = 80;

        const el = await createElement(boardUuid, {
          type: 'TEXT',
          x: pos.x,
          y: pos.y,
          width,
          height,
          rotation: 0,
          properties: {
            text: '',
            fontSize: 18,
            color: '#000000',
          },
        });

        setTool('SELECT');

        setSelectedIds([el.id]);
        openTextEditorForElement(el);
      }

      if (tool === 'STICKER') {
        const size = 200;

        const el = await createElement(boardUuid, {
          type: 'STICKER',
          x: pos.x,
          y: pos.y,
          width: size,
          height: size,
          rotation: 0,
          properties: {
            text: '',
            color: '#fff59d',
          },
        });
        setSelectedIds([el.id]);
      }

    if (tool === 'SHAPE') {
      const width = 200;
      const height = 120;
        const el = await createElement(boardUuid, {
          type: 'SHAPE',
          x: pos.x,
          y: pos.y,
          width: 200,
          height: 120,
          rotation: 0,
          properties: {
            shapeKind,
            fill: '#FFFFFF',
            stroke: '#000000',
          },
        });
      setSelectedIds([el.id]);
    }
    } catch (err) {
      console.error('Failed to create element', err);
    }
  };

  const handleDeleteFromMenu = async () => {
    await handleDeleteSelected();
    closeContextMenu();
  };

const safeElements = elements ?? [];
const sortedElements = [...safeElements].sort((a, b) => a.zIndex - b.zIndex);
  const canDragElements = tool === 'SELECT';

const SCALE_BY = 1.05;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

const handleStageWheel = (e: KonvaEventObject<WheelEvent>) => {
  e.evt.preventDefault();

  const stage = e.target.getStage();
  if (!stage) return;

  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const oldScale = stageScale;

  const mousePointTo = {
    x: (pointer.x - stagePos.x) / oldScale,
    y: (pointer.y - stagePos.y) / oldScale,
  };

  const direction = e.evt.deltaY > 0 ? -1 : 1;
  let newScale =
    direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;

  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };

  setStageScale(newScale);
  setStagePos(newPos);
};

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
    <Stage
        width={width}
        height={height}
        style={{ background: '#f5f5f5' }}
      x={stagePos.x}
      y={stagePos.y}
      scaleX={stageScale}
      scaleY={stageScale}
      draggable={tool === 'HAND'}
      onDragEnd={handleStageDragEnd}
        ref={(node) => {
          stageRef.current = node;
        }}
      onMouseDown={(e) => {
            if (tool === 'EXPORT') {
              const stage = e.target.getStage();
              if (!stage) return;
              const pos = stage.getPointerPosition();
              if (!pos) return;

              const logicalX = (pos.x - stagePos.x) / stageScale;
              const logicalY = (pos.y - stagePos.y) / stageScale;

              setCropRect({ x: logicalX, y: logicalY, width: 0, height: 0 });
              setIsDrawingCrop(true);
              return;
            }
        handleStageMouseDown(e);

        const stage = e.target.getStage();
        if (!stage) return;

        if (tool === 'ARROW') {
          const pos = getPointerPositionLogical(stage);
          if (!pos) return;
          setFreeArrowStart(pos);
          setFreeArrowEnd(pos);
          return;
        }

        if (tool === 'BRUSH') {
          if (isEraser) {
            handleEraserDown(e);
          } else {
            handleBrushMouseDown(e);
          }
        } else {
          handleCreateElementOnClick(e);
        }
      }}
      onMouseMove={(e) => {
  if (tool === 'EXPORT' && isDrawingCrop && cropRect) {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const logicalX = (pos.x - stagePos.x) / stageScale;
    const logicalY = (pos.y - stagePos.y) / stageScale;

    setCropRect({
      x: cropRect.x,
      y: cropRect.y,
      width: logicalX - cropRect.x,
      height: logicalY - cropRect.y,
    });
    return;
  }
        handleMouseMove(e);
        handleStageMouseMove(e);

        if (tool === 'ARROW' && freeArrowStart) {
          const stage = e.target.getStage();
          if (!stage) return;
          const pos = getPointerPositionLogical(stage);
          if (!pos) return;
          setFreeArrowEnd(pos);
          return;
        }

        if (tool === 'BRUSH') {
          if (isEraser) {
            if (e.evt.buttons & 1) {
              handleEraserDown(e);
            }
          } else {
            handleBrushMouseMove(e);
          }
        }
      }}
      onMouseUp={async (e) => {
            if (tool === 'EXPORT' && isDrawingCrop) {
              setIsDrawingCrop(false);
              return;
            }
        handleStageMouseUp(e);

        if (tool === 'ARROW' && freeArrowStart && freeArrowEnd) {
          const { x: x1, y: y1 } = freeArrowStart;
          const { x: x2, y: y2 } = freeArrowEnd;
          setFreeArrowStart(null);
          setFreeArrowEnd(null);

          if (Math.hypot(x2 - x1, y2 - y1) < 5) {
            return;
          }

          try {
            const el = await createElement(boardUuid, {
              type: 'ARROW',
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              rotation: 0,
              properties: {
                x1,
                y1,
                x2,
                y2,
                color: '#000000',
                strokeWidth: 2,
              },
            });
            setSelectedIds([el.id]);
            setTool('SELECT');
          } catch (err) {
            console.error('Failed to create free arrow', err);
          }
          return;
        }

        if (tool === 'BRUSH' && !isEraser) {
          handleBrushMouseUp(e);
        }
      }}
      onWheel={handleStageWheel}
    >

          {exportBackgroundColor && cropRect && (
            <Layer listening={false}>
              <Rect
                x={Math.min(cropRect.x, cropRect.x + cropRect.width)}
                y={Math.min(cropRect.y, cropRect.y + cropRect.height)}
                width={Math.abs(cropRect.width)}
                height={Math.abs(cropRect.height)}
                fill={exportBackgroundColor}
              />
            </Layer>
          )}

        {!hideDuringExport && <InfiniteGrid step={20} extent={10000} />}
<Layer listening={false}>
  {Object.entries(remoteCursors).map(([id, cursor]) => {
    if (id === clientId) return null;

    const color = getUserColor(id);
    const name = cursor.displayName || 'Гость';


    const baseWidth = 8;
    const height = 13;
    const concaveDepth = 2;

    const cursorShape = [
      0, 0,
      -baseWidth / 2, height - concaveDepth,
      0, height,
      baseWidth / 2, height - concaveDepth,
      0, 0,
    ];

    const rotationDeg = -25;
    const offsetX = 0;
    const offsetY = -height * 0.1;


    const labelOffsetX = 12;
    const labelOffsetY = 8;
    const labelPaddingX = 4;
    const labelPaddingY = 2;

    const approxTextWidth = Math.max(30, name.length * 6);
    const labelWidth = approxTextWidth + labelPaddingX * 2;
    const labelHeight = 14 + labelPaddingY * 2;

    return (
      <Group
        key={id}
        x={cursor.x + offsetX}
        y={cursor.y + offsetY}
        opacity={0.98}
      >
        <Group rotation={rotationDeg}>
          <Line
            points={cursorShape}
            fill={color}
            stroke={color}
            strokeWidth={1}
            closed
            shadowColor="rgba(15,23,42,0.35)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            shadowOpacity={0.5}
          />
        </Group>

        <Group x={labelOffsetX} y={labelOffsetY}>
          <Rect
            x={0}
            y={0}
            width={labelWidth}
            height={labelHeight}
            fill={color}
            cornerRadius={999}
            shadowColor="rgba(15,23,42,0.35)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            shadowOpacity={0.4}
          />
          <Text
            x={labelPaddingX}
            y={labelPaddingY}
            text={name}
            fontSize={10}
            fontStyle="500"
            fill="#ffffff"
            listening={false}
          />
        </Group>
      </Group>
    );
  })}
</Layer>

<Layer listening={false}>
  {sortedElements.map((el) => {
    const lockOwner = locks?.[el.id];
    if (!lockOwner) return null;

    const lockColor = getUserColor(lockOwner);
    const name = getUserName(lockOwner);

    return (
      <Group key={`lock-${el.id}`}>
        <Rect
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          stroke={lockColor}
          strokeWidth={3 / stageScale}
          dash={[4 / stageScale, 4 / stageScale]}
          cornerRadius={4}
        />

        <Group
          x={el.x + el.width + 8 / stageScale}
          y={el.y + el.height + 8 / stageScale}
        >
          <Rect
            x={0}
            y={0}
            width={(Math.max(40, name.length * 6)) / stageScale}
            height={18 / stageScale}
            fill={lockColor}
            cornerRadius={999}
            shadowColor="rgba(15,23,42,0.35)"
            shadowBlur={3 / stageScale}
            shadowOffset={{ x: 0, y: 1 / stageScale }}
            shadowOpacity={0.4}
          />
          <Text
            x={6 / stageScale}
            y={3 / stageScale}
            text={name}
            fontSize={10 / stageScale}
            fontStyle="500"
            fill="#ffffff"
            listening={false}
          />
        </Group>
      </Group>
    );
  })}
</Layer>
        <Layer>
            {tool === 'BRUSH' && !isEraser && brushPoints && brushPoints.length >= 2 && (() => {
              const points = brushPoints;
              let minX = points[0];
              let minY = points[1];
              let maxX = points[0];
              let maxY = points[1];

              for (let i = 2; i < points.length; i += 2) {
                const x = points[i];
                const y = points[i + 1];
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }

              let width = maxX - minX;
              let height = maxY - minY;

              if (width <= 0) width = 1;
              if (height <= 0) height = 1;

              const localPoints: number[] = [];
              for (let i = 0; i < points.length; i += 2) {
                localPoints.push(points[i] - minX, points[i + 1] - minY);
              }

              return (
                <BrushElement
                  key="brush-preview"
                  element={{
                    id: -1,
                    type: 'BRUSH',
                    x: minX,
                    y: minY,
                    width,
                    height,
                    rotation: 0,
                    zIndex: 0,
                    properties: {
                      points: localPoints,
                      stroke: brushColor,
                      strokeWidth: brushSize,
                      eraser: false,
                    },
                  }}
                  isSelected={false}
                  canDrag={false}
                  onClick={() => {}}
                  onContextMenu={() => {}}
                  onChange={() => {}}
                  registerNode={() => {}}
                />
              );
            })()}

            {sortedElements.map((el) => {
                const lockOwner = locks?.[el.id];
              const isLockedByOther =
                lockOwner !== undefined && lockOwner !== clientId;
                const isSelected = (selectedIds ?? []).includes(el.id);

              if (el.type === 'SHAPE') {
                return (
                  <React.Fragment key={el.id}>
                            <ShapeElement
                              key={el.id}
                              element={el}
                              isSelected={isSelected}
                              canDrag={boardCanEdit && tool === 'SELECT' && !isLockedByOther && !el.lockedPosition}
                              onClick={(evt) => handleElementClick(el, evt)}
                              onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                              onChange={handleElementChange}
                              registerNode={(node) => {
                                nodeRefs.current[el.id] = node;
                              }}
                              showAnchors={tool === 'ARROW' || arrowIsSelected}
                            />
                    {isSelected && (
                      <Group
                        x={el.x + el.width / 2}
                        y={el.y - 30}
                        listening={true}
                      >

                        <Rect
                          x={-40}
                          y={-15}
                          width={80}
                          height={30}
                          fill="white"
                          cornerRadius={4}
                          shadowBlur={2}
                        />

                        <Circle
                          x={-20}
                          y={0}
                          radius={8}
                          fill={(el.properties as any)?.fill ?? '#FFFFFF'}
                          stroke="#000"
                          onClick={() => openShapeColorMenu(el.id, 'fill')}
                        />

                        <Circle
                          x={20}
                          y={0}
                          radius={8}
                          fill={(el.properties as any)?.stroke ?? '#000000'}
                          stroke="#000"
                          onClick={() => openShapeColorMenu(el.id, 'stroke')}
                        />
                      </Group>
                    )}
                  </React.Fragment>
                );
              }

                    if (el.type === 'MEDIA') {
                      const canEdit = boardCanEdit && tool === 'SELECT' && !isLockedByOther;
                      return (
                        <MediaElement
                          key={el.id}
                          element={el}
                          isSelected={isSelected}
                          onClick={(evt) => handleElementClick(el, evt)}
                          onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                          onChange={handleElementChange}
                          canEdit={canEdit}
                          registerNode={(node) => {
                            nodeRefs.current[el.id] = node;
                          }}
                          onLock={(id) => {
                            sendLock(boardUuid, [id], 'LOCK');
                          }}
                          onUnlock={(id) => {
                            sendLock(boardUuid, [id], 'UNLOCK');
                          }}
                          showAnchors={tool === 'ARROW' || arrowIsSelected}
                        />
                      );
                    }

              if (el.type === 'BRUSH') {
                return (
                  <BrushElement
                    key={el.id}
                    element={el}
                    isSelected={isSelected}
                    canDrag={canDragElements && !isLockedByOther && tool === 'SELECT'}
                    onClick={(evt) => handleElementClick(el, evt)}
                    onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                     onChange={handleElementChange}
                    registerNode={(node) => {
                      nodeRefs.current[el.id] = node;
                    }}
                  />
                );
              }

              if (el.type === 'TEXT') {
                return (
                  <TextElement
                    key={el.id}
                    element={el}
                    isSelected={isSelected}
                    canDrag={canDragElements && !isLockedByOther && tool === 'SELECT'}
                    onClick={(evt) => handleElementClick(el, evt)}
                    onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                    onDblClick={() => openTextEditorForElement(el)}
                     onChange={handleElementChange}
                    registerNode={(node) => {
                      nodeRefs.current[el.id] = node;
                    }}
                  />
                );
              }

              if (el.type === 'STICKER') {
                  return (
                    <StickerElement
                      key={el.id}
                      element={el}
                      isSelected={
                        tool === 'ARROW'
                          ? arrowDraft?.fromId === el.id
                          : isSelected
                      }
                      canDrag={canDragElements && !isLockedByOther && tool === 'SELECT'}
                      onClick={(evt) => handleElementClick(el, evt)}
                      onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                      onDblClick={() => openTextEditorForElement(el)}
                       onChange={handleElementChange}
                      registerNode={(node) => {
                        nodeRefs.current[el.id] = node;
                      }}
                            showAnchors={
                              tool === 'ARROW' ||
                              arrowIsSelected
                            }
                    />
                  );
              }

              if (el.type === 'ARROW') {
                const canEdit = boardCanEdit && tool === 'SELECT' && !isLockedByOther;
                const canDragArrow = tool === 'SELECT' && !isLockedByOther;
                return (
                  <ArrowElement
                      key={el.id}
                      element={el}
                      allElements={elements}
                      isSelected={isSelected}
                      onClick={(evt) => handleElementClick(el, evt)}
                      onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                       onChange={handleElementChange}
                      canEdit={canEdit}
                      canDrag={canDragArrow}
                      stageScale={stageScale}
                      stagePos={stagePos}
                  />
                );
              }
              return null;
            })}

          <Transformer
            ref={transformerRef}
            rotateEnabled
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>

        <Layer>
            {selectionRect.visible && tool === 'SELECT' && !hideDuringExport && (
              <Rect
                x={Math.min(selectionRect.x1, selectionRect.x2)}
                y={Math.min(selectionRect.y1, selectionRect.y2)}
                width={Math.abs(selectionRect.x2 - selectionRect.x1)}
                height={Math.abs(selectionRect.y2 - selectionRect.y1)}
                fill="rgba(0, 161, 255, 0.1)"
                stroke="#00a1ff"
                strokeWidth={1}
                dash={[4, 4]}
              />
            )}
        </Layer>

      {tool === 'EXPORT' && cropRect && !hideDuringExport && (
        <Layer listening={false}>
          <Rect
            x={cropRect.x}
            y={cropRect.y}
            width={cropRect.width}
            height={cropRect.height}
            stroke="rgba(0, 150, 255, 0.9)"
            strokeWidth={2 / stageScale}
            dash={[4 / stageScale, 4 / stageScale]}
          />
        </Layer>
      )}
      </Stage>

{tool === 'EXPORT' && cropRect && (
  <div
    style={{
      position: 'fixed',
      right: 16,
      bottom: 16,
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 8,
      padding: 8,
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      display: 'flex',
      gap: 8,
      zIndex: 9999,
    }}
  >
    <button onClick={() => exportCrop('png')}>Скачать PNG</button>
    <button onClick={() => exportCrop('jpeg')}>Скачать JPEG</button>
    <button onClick={() => exportCrop('webp')}>Скачать WebP</button>
  </div>
)}

      {contextMenu.visible && selectedIds.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#fff',
            border: '1px solid #ccc',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            zIndex: 20,
            minWidth: 160,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            style={{ display: 'block', width: '100%' }}
            onClick={handleCopy}
          >
            Копировать
          </button>
          <button
            style={{ display: 'block', width: '100%' }}
            onClick={handleCut}
          >
            Вырезать
          </button>
          <button
            style={{ display: 'block', width: '100%' }}
            onClick={handleDuplicate}
          >
            Дублировать
          </button>
          <button
            style={{ display: 'block', width: '100%', color: 'red' }}
            onClick={handleDeleteFromMenu}
          >
            Удалить
          </button>
        </div>
      )}



     {textEditor && (
       <>
         <div
           style={{
             position: 'absolute',
             top: textEditor.y - 36,
             left: textEditor.x,
             display: 'flex',
             gap: 8,
             padding: '4px 6px',
             background: 'white',
             border: '1px solid #ccc',
             borderRadius: 4,
             boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
             zIndex: 31,
           }}
           onMouseDown={(e) => e.stopPropagation()}
         >
           <select
             value={textEditor.fontFamily}
             onChange={(e) =>
               setTextEditor((prev) =>
                 prev ? { ...prev, fontFamily: e.target.value } : prev,
               )
             }
           >
             <option value="Arial">Arial</option>
             <option value="Inter">Inter</option>
             <option value="Courier New">Courier New</option>
             <option value="Georgia">Georgia</option>
           </select>

           <input
             type="number"
             min={8}
             max={96}
             value={textEditor.fontSize}
             style={{ width: 60 }}
             onChange={(e) =>
               setTextEditor((prev) =>
                 prev
                   ? { ...prev, fontSize: Number(e.target.value) || prev.fontSize }
                   : prev,
               )
             }
           />

           <input
             type="color"
             value={textEditor.color}
             onChange={(e) =>
               setTextEditor((prev) =>
                 prev ? { ...prev, color: e.target.value } : prev,
               )
             }
           />
         </div>

         <textarea
             ref={textAreaRef}
             value={textEditor.value}
             onChange={handleTextEditorChange}
             onBlur={() => {
             }}
           style={{
             position: 'absolute',
             top: textEditor.y,
             left: textEditor.x,
             width: textEditor.width,
             height: textEditor.height,
             fontSize: textEditor.fontSize * stageScale,
             fontFamily: textEditor.fontFamily,
             color: textEditor.color,
             padding: '4px 6px',
             border: '1px solid #00a1ff',
             outline: 'none',
             resize: 'none',
             background: 'rgba(255,255,255,0.9)',
             boxSizing: 'border-box',
             zIndex: 30,
           }}
         />
       </>
     )}

        {shapeColorPicker && (() => {
          const el = elements.find(e => e.id === shapeColorPicker.elementId);
          if (!el) return null;

          const logicalX = el.x + el.width / 2;
          const logicalY = el.y - 10;

          const screenX = stagePos.x + logicalX * stageScale;
          const screenY = stagePos.y + logicalY * stageScale;

          const currentColor =
            (el.properties as any)?.[shapeColorPicker.mode] ??
            (shapeColorPicker.mode === 'fill' ? '#FFFFFF' : '#000000');

          return (
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                const color = e.target.value;
                const el2 = elements.find(x => x.id === shapeColorPicker.elementId);
                if (!el2) return;
                const updated: BoardElementDto = {
                  ...el2,
                  properties: {
                    ...(el2.properties || {}),
                    [shapeColorPicker.mode]: color,
                  },
                };
                handleElementChange(updated);
              }}
              onBlur={() => {
              }}
              style={{
                position: 'absolute',
                left: screenX - 10,
                top: screenY - 10,
                zIndex: 40,
              }}
            />
          );
        })()}
    </div>
  );
};