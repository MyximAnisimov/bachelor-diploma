import React, { useState } from 'react';
import { Arrow, Circle } from 'react-konva';
import type { BoardElementDto } from '../../api/types';
import type { KonvaEventObject } from 'konva/lib/Node';
import { getRectAnchors, getElementAnchorWorldPoint } from '../utils/anchorUtils';

interface Props {
  element: BoardElementDto;
  allElements: BoardElementDto[];
  isSelected: boolean;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: KonvaEventObject<PointerEvent>) => void;
  onChange: (updated: BoardElementDto) => void;
  canEdit: boolean;
  canDrag: boolean;
  stageScale: number;
  stagePos: { x: number; y: number };
}

function getStickerAnchors(el: BoardElementDto) {
  const w = el.width;
  const h = el.height;
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ];
}

function getAnchorWorldPoint(el: BoardElementDto, anchorIndex: number) {
  const anchors = getStickerAnchors(el);
  const local =
    anchors[anchorIndex] || { x: el.width / 2, y: el.height / 2 };
  const angleRad = ((el.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const rotated = {
    x: local.x * cos - local.y * sin,
    y: local.x * sin + local.y * cos,
  };
  return {
    x: el.x + rotated.x,
    y: el.y + rotated.y,
  };
}

const SNAP_RADIUS = 60;

export const ArrowElement: React.FC<Props> = ({
  element,
  allElements,
  isSelected,
  onClick,
  onContextMenu,
  onChange,
  canEdit,
  canDrag,
  stagePos,
   stageScale,
}) => {
  const propsAny = (element.properties || {}) as any;

  const fromId: number | undefined = propsAny.fromId;
  const toId: number | undefined = propsAny.toId;
  const fromAnchorIndex: number = propsAny.fromAnchorIndex ?? 0;
  const toAnchorIndex: number = propsAny.toAnchorIndex ?? 0;

  const x1: number | undefined = propsAny.x1;
  const y1: number | undefined = propsAny.y1;
  const x2: number | undefined = propsAny.x2;
  const y2: number | undefined = propsAny.y2;

  const hasFreeCoords =
    typeof x1 === 'number' &&
    typeof y1 === 'number' &&
    typeof x2 === 'number' &&
    typeof y2 === 'number';

  const color: string = propsAny.color || '#000000';
  const strokeWidth: number = propsAny.strokeWidth || 2;

  let baseFromPoint: { x: number; y: number } | null = null;
  let baseToPoint: { x: number; y: number } | null = null;

  if (fromId != null && toId != null) {
    const fromEl = allElements.find((el) => el.id === fromId);
    const toEl = allElements.find((el) => el.id === toId);
    if (!fromEl || !toEl) {
      return null;
    }
    baseFromPoint = getAnchorWorldPoint(fromEl, fromAnchorIndex);
    baseToPoint = getAnchorWorldPoint(toEl, toAnchorIndex);
  } else if (hasFreeCoords) {
    baseFromPoint = { x: x1!, y: y1! };
    baseToPoint = { x: x2!, y: y2! };
  } else {
    return null;
  }

  const handleRadius = 6;

const getPointerLogical = (stage: any, stagePos: { x: number; y: number }, stageScale: number) => {
  const p = stage.getPointerPosition();
  if (!p) return null;
  return {
    x: (p.x - stagePos.x) / stageScale,
    y: (p.y - stagePos.y) / stageScale,
  };
};

const findNearestElementAnchor = (pos: { x: number; y: number }) => {
  let bestElement: BoardElementDto | null = null;
  let bestAnchorIdx = 0;
  let bestDist2 = Infinity;

  const candidates = allElements.filter((el) =>
    anchorableTypes.has(el.type),
  );

  candidates.forEach((el) => {
    const anchors = getRectAnchors(el);
    anchors.forEach((_, idx) => {
      const world = getElementAnchorWorldPoint(el, idx);
      const dx = world.x - pos.x;
      const dy = world.y - pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        bestElement = el;
        bestAnchorIdx = idx;
      }
    });
  });

  if (!bestElement) return null;
  if (bestDist2 > SNAP_RADIUS * SNAP_RADIUS) return null;

  return { element: bestElement, anchorIndex: bestAnchorIdx };
};

  const [tempFromPoint, setTempFromPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempToPoint, setTempToPoint] = useState<{ x: number; y: number } | null>(null);

  const toLogical = (abs: { x: number; y: number }) => ({
    x: (abs.x - stagePos.x) / stageScale,
    y: (abs.y - stagePos.y) / stageScale,
  });

const handleEndDragMove =
  (kind: 'from' | 'to') =>
  (e: KonvaEventObject<DragEvent>) => {
    if (!canEdit) return;
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = getPointerLogical(stage, stagePos, stageScale);
    if (!pos) return;

    if (kind === 'from') {
      setTempFromPoint({ x: pos.x, y: pos.y });
    } else {
      setTempToPoint({ x: pos.x, y: pos.y });
    }
  };

const handleEndDragEnd =
  (kind: 'from' | 'to') =>
  (e: KonvaEventObject<DragEvent>) => {
    if (!canEdit) return;
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = getPointerLogical(stage, stagePos, stageScale);
    if (!pos) return;

    const nearest = findNearestStickerAnchor(pos);

    if (kind === 'from') {
      setTempFromPoint(null);
    } else {
      setTempToPoint(null);
    }

    const p = (element.properties || {}) as any;
    const pHasFreeCoords =
      typeof p.x1 === 'number' &&
      typeof p.y1 === 'number' &&
      typeof p.x2 === 'number' &&
      typeof p.y2 === 'number';

    if (!nearest) {
      if (pHasFreeCoords) {
        if (kind === 'from') {
          onChange({
            ...element,
            properties: {
              ...p,
              x1: pos.x,
              y1: pos.y,
            },
          });
        } else {
          onChange({
            ...element,
            properties: {
              ...p,
              x2: pos.x,
              y2: pos.y,
            },
          });
        }
      }
      return;
    }

    const { sticker, anchorIndex } = nearest;
    if (kind === 'from') {
      onChange({
        ...element,
        properties: {
          ...p,
          fromId: sticker.id,
          fromAnchorIndex: anchorIndex,
        },
      });
    } else {
      onChange({
        ...element,
        properties: {
          ...p,
          toId: sticker.id,
          toAnchorIndex: anchorIndex,
        },
      });
    }
  };

  const start = tempFromPoint ?? baseFromPoint!;
  const end = tempToPoint ?? baseToPoint!;

  return (
    <>
      <Arrow
        points={[start.x, start.y, end.x, end.y]}
        stroke={isSelected ? '#00a1ff' : color}
        fill={isSelected ? '#00a1ff' : color}
        strokeWidth={strokeWidth}
        pointerLength={12}
        pointerWidth={10}
        lineCap="round"
        lineJoin="round"
        onClick={onClick}
        onTap={onClick}
        onContextMenu={onContextMenu}
        draggable={canDrag}
        onDragEnd={(e) => {
          if (!canDrag) return;
          const node = e.target;
          const dx = node.x();
          const dy = node.y();

          const p = (element.properties || {}) as any;
          const pHasFreeCoords =
            typeof p.x1 === 'number' &&
            typeof p.y1 === 'number' &&
            typeof p.x2 === 'number' &&
            typeof p.y2 === 'number';

          if (pHasFreeCoords) {
            const updated: BoardElementDto = {
              ...element,
              properties: {
                ...p,
                x1: p.x1 + dx,
                y1: p.y1 + dy,
                x2: p.x2 + dx,
                y2: p.y2 + dy,
              },
            };
            node.position({ x: 0, y: 0 });
            onChange(updated);
          } else {
            const updated: BoardElementDto = {
              ...element,
              x: (element.x || 0) + dx,
              y: (element.y || 0) + dy,
            };
            node.position({ x: 0, y: 0 });
            onChange(updated);
          }
        }}
      />
      {canEdit && isSelected && (
        <>
          <Circle
            x={start.x}
            y={start.y}
            radius={handleRadius}
            fill="white"
            stroke="#00a1ff"
            strokeWidth={2}
            draggable
            onDragMove={handleEndDragMove('from')}
            onDragEnd={handleEndDragEnd('from')}
          />
          <Circle
            x={end.x}
            y={end.y}
            radius={handleRadius}
            fill="white"
            stroke="#00a1ff"
            strokeWidth={2}
            draggable
            onDragMove={handleEndDragMove('to')}
            onDragEnd={handleEndDragEnd('to')}
          />
        </>
      )}
    </>
  );
};