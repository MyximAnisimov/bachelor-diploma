import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Transformer, Line, Group, Circle } from 'react-konva';
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

type Tool = 'SELECT' | 'HAND' | 'BRUSH' | 'TEXT' | 'STICKER' | 'ARROW';

interface Props {
  boardUuid: string;
  elements: BoardElementDto[];
  onElementsChange: Dispatch<SetStateAction<BoardElementDto[]>>;
  tool: Tool;
  shapeKind: ShapeKind;
  brushSize: number;
  isEraser: boolean;
  clientId: string;
  locks: Record<number, string>;
  remoteCursors: Record<string, { x: number; y: number }>;
  selectedIds: number[];                           // ←
  setSelectedIds: Dispatch<SetStateAction<number[]>>;
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

export const BoardCanvas: React.FC<Props> = ({
  boardUuid,
  elements,
  onElementsChange,
  brushSize,
  tool,
  isEraser,
  locks,
  clientId,
  remoteCursors,
  selectedIds,
  setSelectedIds,
  shapeKind,
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

const [brushColor, setBrushColor] = useState('#000000');


  const width = window.innerWidth;
  const height = window.innerHeight - 60;

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
      const tr = transformerRef.current;
      if (!tr) return;

      const nodes = selectedIds
        .map((id) => nodeRefs.current[id])
        .filter((node) => node);

      tr.nodes(nodes);
      tr.getLayer()?.batchDraw();
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

  const added = curr.filter((id) => !prev.includes(id));
  const removed = prev.filter((id) => !curr.includes(id));

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
         console.log('LOCAL CHANGE', updated);
      onElementsChange((prev) =>
        prev.map((el) => (el.id === updated.id ? updated : el)),
      );

      try {
        const saved = await transformElement(boardUuid, updated.id, updated);
        console.log('saved from backend', saved);
        onElementsChange((prev) =>
          prev.map((el) => (el.id === saved.id ? saved : el)),
        );
      } catch (err) {
        console.error('Failed to save element', err);
      }
    };

const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
  const stage = e.target.getStage();
  if (!stage) return;
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const logicalX = (pointerPos.x - stagePos.x) / stageScale;
  const logicalY = (pointerPos.y - stagePos.y) / stageScale;

  sendCursor(boardUuid, logicalX, logicalY);
};

  const handleDeleteSelected = async () => {
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);

    onElementsChange((prev) =>
      prev.filter((el) => !idsToDelete.includes(el.id)),
    );

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

const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
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
  } catch (err) {
    console.error('Failed to create brush element', err);
  }
};

    const openTextEditorForElement = (el: BoardElementDto) => {
      const text = (el.properties as any)?.text || '';

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
      });
    };

const commitTextEditor = async () => {
  if (!textEditor) return;
  const { id, value } = textEditor;

  setTextEditor(null);

  const el = elements.find((e) => e.id === id);
  if (!el) return;

  const updated: BoardElementDto = {
    ...el,
    properties: {
      ...(el.properties || {}),
      text: value,
    },
  };

    console.log('commitTextEditor updated', updated);
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
    setSelectedIds((prev) =>
      isSelected ? prev.filter((id) => id !== el.id) : [...prev, el.id],
    );
  } else {
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

const openShapeColorMenu = (elementId: number, mode: 'fill' | 'stroke') => {
  console.log('openShapeColorMenu', elementId, mode);
  setShapeColorPicker({ elementId, mode });
};

const handleDeleteElement = async (id: number) => {
  const el = elements.find(e => e.id === id);
  if (!el) return;

  onElementsChange(prev => prev.filter(e => e.id !== id));

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

  const handleCreateElementOnClick = async (e: KonvaEventObject<MouseEvent>) => {
      console.log('handleCreateElementOnClick', tool);
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
        console.log('CREATE SHAPE at', pos, 'shapeKind=', shapeKind);
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

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
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
            onMouseDown={(e) => {
              handleStageMouseDown(e);

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
              handleMouseMove(e);
              handleStageMouseMove(e);

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
            onMouseUp={(e) => {
              handleStageMouseUp(e);

              if (tool === 'BRUSH' && !isEraser) {
                handleBrushMouseUp(e);
              }
            }}
          onMouseMove={(e) => {
             handleMouseMove(e);
            handleStageMouseMove(e);
            handleBrushMouseMove(e);
          }}
          onMouseUp={(e) => {
            handleStageMouseUp(e);
            handleBrushMouseUp(e);
          }}
          onWheel={handleStageWheel}
      >

        <Layer listening={false}>
          {Object.entries(remoteCursors).map(([id, pos]) => (
            <Group key={id} x={pos.x} y={pos.y}>
              <Circle radius={4} fill="red" />
            </Group>
          ))}
        </Layer>

        <Layer>
            {sortedElements.map((el) => {
              const isLockedByOther =
                locks[el.id] !== undefined && locks[el.id] !== clientId;

              if (el.type === 'SHAPE') {
                return (
                  <React.Fragment key={el.id}>
                  <ShapeElement
                    key={el.id}
                    element={el}
                    isSelected={selectedIds.includes(el.id)}
                    canDrag={tool === 'SELECT' && !isLockedByOther && !el.lockedPosition}
                    onClick={(evt) => handleElementClick(el, evt)}
                    onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                    onChange={handleElementChange}
                    registerNode={(node) => {
                      nodeRefs.current[el.id] = node;
                    }}
                  />
                    {selectedIds.includes(el.id) && (
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

              if (el.type === 'BRUSH') {
                return (
                  <BrushElement
                    key={el.id}
                    element={el}
                    isSelected={selectedIds.includes(el.id)}
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
                    isSelected={selectedIds.includes(el.id)}
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
                        : selectedIds.includes(el.id)
                    }
                    canDrag={canDragElements && !isLockedByOther && tool === 'SELECT'}
                    onClick={(evt) => handleElementClick(el, evt)}
                    onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                    onDblClick={() => openTextEditorForElement(el)}
                    onChange={handleElementChange}
                    registerNode={(node) => {
                      nodeRefs.current[el.id] = node;
                    }}
                    showAnchors={tool === 'ARROW'}
                  />
                );
              }

              if (el.type === 'ARROW') {
                const canEdit = tool === 'ARROW' && !isLockedByOther;
                return (
                  <ArrowElement
                    key={el.id}
                    element={el}
                    allElements={elements}
                    isSelected={selectedIds.includes(el.id)}
                    onClick={(evt) => handleElementClick(el, evt)}
                    onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                    onChange={handleElementChange}
                    canEdit={canEdit}
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
          {selectionRect.visible && tool === 'SELECT' && (
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
      </Stage>

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
          <textarea
            ref={textAreaRef}
            value={textEditor.value}
            onChange={handleTextEditorChange}
            onBlur={commitTextEditor}
            style={{
              position: 'absolute',
              top: textEditor.y,
              left: textEditor.x,
              width: textEditor.width,
              height: textEditor.height,
              fontSize: 16 * stageScale,
              fontFamily: 'inherit',
              padding: '4px 6px',
              border: '1px solid #00a1ff',
              outline: 'none',
              resize: 'none',
              background: 'rgba(255,255,255,0.9)',
              boxSizing: 'border-box',
              zIndex: 30,
            }}
          />
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