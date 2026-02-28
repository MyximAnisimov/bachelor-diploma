import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Dispatch, SetStateAction } from 'react';
import type { BoardElementDto } from '../api/types';
import { transformElement, deleteElement, createElement } from '../api/elements';
import { ShapeElement } from '../elements/ShapeElement';

type Tool = 'SELECT' | 'HAND';

interface Props {
  boardUuid: string;
  elements: BoardElementDto[];
  onElementsChange: Dispatch<SetStateAction<BoardElementDto[]>>;
  tool: Tool;
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

export const BoardCanvas: React.FC<Props> = ({
  boardUuid,
  elements,
  onElementsChange,
  tool,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  const width = window.innerWidth;
  const height = window.innerHeight - 60;

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

  const handleElementChange = async (updated: BoardElementDto) => {
    onElementsChange((prev) =>
      prev.map((el) => (el.id === updated.id ? updated : el)),
    );

    try {
      await transformElement(boardUuid, updated.id, {
        x: updated.x,
        y: updated.y,
        width: updated.width,
        height: updated.height,
        rotation: updated.rotation,
      });
    } catch (e) {
      console.error('Failed to transform element', e);
    }
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

  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (tool !== 'HAND') return;
    setStagePos({ x: e.target.x(), y: e.target.y() });
  };

  const handleElementClick = (
    el: BoardElementDto,
    e: KonvaEventObject<MouseEvent>,
  ) => {
    if (tool !== 'SELECT') return;

    const multi =
      e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;

    setSelectionRect((prev) => ({ ...prev, visible: false }));
    closeContextMenu();

    setSelectedIds((prev) => {
      if (!multi) {
        return [el.id];
      }
      if (prev.includes(el.id)) {
        return prev.filter((id) => id !== el.id);
      }
      return [...prev, el.id];
    });
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

      onElementsChange((prev) => [...prev, ...created]);
      setSelectedIds(created.map((el) => el.id));
    } catch (e) {
      console.error('Failed to duplicate elements', e);
    } finally {
      closeContextMenu();
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
        draggable={tool === 'HAND'}
        onDragEnd={handleStageDragEnd}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleStageWheel}
      >
        <Layer>
          {sortedElements.map((el) => {
            if (el.type === 'SHAPE') {
              return (
                <ShapeElement
                  key={el.id}
                  element={el}
                  isSelected={selectedIds.includes(el.id)}
                  canDrag={canDragElements}
                  onClick={(evt) => handleElementClick(el, evt)}
                  onContextMenu={(evt) => handleElementContextMenu(el, evt)}
                  onChange={handleElementChange}
                  registerNode={(node) => {
                    nodeRefs.current[el.id] = node;
                  }}
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
    </div>
  );
};