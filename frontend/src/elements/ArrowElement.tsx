import React, { useMemo, useState } from 'react';
import { Arrow, Circle } from 'react-konva';
import type { BoardElementDto } from '../../api/types';
import type { KonvaEventObject } from 'konva/lib/Node';
import { getElementAnchorWorldPoint } from '../utils/anchorUtils';

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

const SNAP_RADIUS = 5;

const anchorableTypes = new Set([
  'RECTANGLE',
  'ELLIPSE',
  'TRIANGLE',
  'DIAMOND',
  'STICKER',
  'TEXT',
  'MEDIA',
]);

function getPointerLogical(
  stage: any,
  stagePos: { x: number; y: number },
  stageScale: number,
) {
  const p = stage.getPointerPosition();
  if (!p) return null;
  return {
    x: (p.x - stagePos.x) / stageScale,
    y: (p.y - stagePos.y) / stageScale,
  };
}

export const ArrowElement: React.FC<Props> = ({
  element,
  allElements,
  isSelected,
  onClick,
  onContextMenu,
  onChange,
  canEdit,
  stagePos,
  stageScale,
}) => {
  const p = (element.properties || {}) as any;

  const fromId: number | undefined = p.fromId;
  const toId: number | undefined = p.toId;
  const fromAnchorIndex: number = p.fromAnchorIndex ?? 0;
  const toAnchorIndex: number = p.toAnchorIndex ?? 0;

  const color: string = p.color || '#000000';
  const strokeWidth: number = p.strokeWidth || 2;

  const bendPoints: { x: number; y: number }[] = Array.isArray(p.bendPoints)
    ? p.bendPoints
    : [];

  const fromEl = fromId != null ? allElements.find((el) => el.id === fromId) : null;
  const toEl = toId != null ? allElements.find((el) => el.id === toId) : null;

  const baseFromPoint =
    fromEl != null
      ? getElementAnchorWorldPoint(fromEl, fromAnchorIndex)
      : typeof p.x1 === 'number' && typeof p.y1 === 'number'
      ? { x: p.x1, y: p.y1 }
      : null;

  const baseToPoint =
    toEl != null
      ? getElementAnchorWorldPoint(toEl, toAnchorIndex)
      : typeof p.x2 === 'number' && typeof p.y2 === 'number'
      ? { x: p.x2, y: p.y2 }
      : null;

  const [tempFromPoint, setTempFromPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempToPoint, setTempToPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempBendPoints, setTempBendPoints] = useState<{ x: number; y: number }[] | null>(null);

  if (!baseFromPoint || !baseToPoint) {
    return null;
  }

  const start = tempFromPoint ?? baseFromPoint;
  const end = tempToPoint ?? baseToPoint;
  const visibleBendPoints = tempBendPoints ?? bendPoints;

  const arrowPoints = useMemo(
    () => [
      start.x,
      start.y,
      ...visibleBendPoints.flatMap((pt) => [pt.x, pt.y]),
      end.x,
      end.y,
    ],
    [start, end, visibleBendPoints],
  );

function getAnchorIndicesForElement(el: BoardElementDto): number[] {
  if (!anchorableTypes.has(el.type)) return [];
  return [0, 1, 2, 3, 4, 5, 6, 7];
}

const findNearestFigureAnchor = (
  point: { x: number; y: number },
  excludeElementId?: number,
) => {
  let best:
    | {
        element: BoardElementDto;
        anchorIndex: number;
        point: { x: number; y: number };
        distance: number;
      }
    | null = null;

  for (const candidate of allElements) {
    if (candidate.id == null) continue;
    if (candidate.id === excludeElementId) continue;
    if (!anchorableTypes.has(candidate.type)) continue;

    const anchorIndices = getAnchorIndicesForElement(candidate);

    for (const idx of anchorIndices) {
      const anchorPoint = getElementAnchorWorldPoint(candidate, idx);
      const dx = anchorPoint.x - point.x;
      const dy = anchorPoint.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!best || distance < best.distance) {
        best = {
          element: candidate,
          anchorIndex: idx,
          point: anchorPoint,
          distance,
        };
      }
    }
  }

  if (!best) return null;
  if (best.distance > SNAP_RADIUS) return null;
  return best;
};

  const commitEndpoint = (
    kind: 'from' | 'to',
    payload:
      | { mode: 'free'; x: number; y: number }
      | { mode: 'anchor'; elementId: number; anchorIndex: number },
  ) => {
    const next = { ...p };

    if (kind === 'from') {
      if (payload.mode === 'free') {
        delete next.fromId;
        delete next.fromAnchorIndex;
        next.x1 = payload.x;
        next.y1 = payload.y;
      } else {
        next.fromId = payload.elementId;
        next.fromAnchorIndex = payload.anchorIndex;
        delete next.x1;
        delete next.y1;
      }
    } else {
      if (payload.mode === 'free') {
        delete next.toId;
        delete next.toAnchorIndex;
        next.x2 = payload.x;
        next.y2 = payload.y;
      } else {
        next.toId = payload.elementId;
        next.toAnchorIndex = payload.anchorIndex;
        delete next.x2;
        delete next.y2;
      }
    }

    onChange({
      ...element,
      properties: next,
    });
  };

  const handleEndDragMove =
    (kind: 'from' | 'to') =>
    (e: KonvaEventObject<DragEvent>) => {
      if (!canEdit) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = getPointerLogical(stage, stagePos, stageScale);
      if (!pos) return;

      const nearest = findNearestFigureAnchor(pos, element.id);
      const snappedPoint = nearest ? nearest.point : pos;

      if (kind === 'from') {
        setTempFromPoint(snappedPoint);
      } else {
        setTempToPoint(snappedPoint);
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

      const nearest = findNearestFigureAnchor(pos, element.id);

      if (kind === 'from') {
        setTempFromPoint(null);
      } else {
        setTempToPoint(null);
      }

      if (nearest) {
        commitEndpoint(kind, {
          mode: 'anchor',
          elementId: nearest.element.id!,
          anchorIndex: nearest.anchorIndex,
        });
        return;
      }

      commitEndpoint(kind, {
        mode: 'free',
        x: pos.x,
        y: pos.y,
      });
    };

  const handleArrowDoubleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!canEdit) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = getPointerLogical(stage, stagePos, stageScale);
    if (!pos) return;

    onChange({
      ...element,
      properties: {
        ...p,
        bendPoints: [...bendPoints, { x: pos.x, y: pos.y }],
      },
    });
  };

  const handleBendDragMove =
    (idx: number) =>
    (e: KonvaEventObject<DragEvent>) => {
      if (!canEdit) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = getPointerLogical(stage, stagePos, stageScale);
      if (!pos) return;

      const next = [...(tempBendPoints ?? bendPoints)];
      next[idx] = pos;
      setTempBendPoints(next);
    };

  const handleBendDragEnd =
    (idx: number) =>
    (e: KonvaEventObject<DragEvent>) => {
      if (!canEdit) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = getPointerLogical(stage, stagePos, stageScale);
      if (!pos) return;

      const next = [...(tempBendPoints ?? bendPoints)];
      next[idx] = pos;
      setTempBendPoints(null);

      onChange({
        ...element,
        properties: {
          ...p,
          bendPoints: next,
        },
      });
    };

  const removeBendPoint = (idx: number) => {
    onChange({
      ...element,
      properties: {
        ...p,
        bendPoints: bendPoints.filter((_: any, i: number) => i !== idx),
      },
    });
  };

  return (
    <>
      <Arrow
        points={arrowPoints}
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
        onDblClick={handleArrowDoubleClick}
        onDblTap={handleArrowDoubleClick}
      />

      {canEdit && isSelected && (
        <>
          <Circle
            x={start.x}
            y={start.y}
            radius={6}
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
            radius={6}
            fill="white"
            stroke="#00a1ff"
            strokeWidth={2}
            draggable
            onDragMove={handleEndDragMove('to')}
            onDragEnd={handleEndDragEnd('to')}
          />

          {visibleBendPoints.map((pt, idx) => (
            <Circle
              key={idx}
              x={pt.x}
              y={pt.y}
              radius={6}
              fill="white"
              stroke="#00a1ff"
              strokeWidth={2}
              draggable
              onDragMove={handleBendDragMove(idx)}
              onDragEnd={handleBendDragEnd(idx)}
              onDblClick={() => removeBendPoint(idx)}
              onDblTap={() => removeBendPoint(idx)}
            />
          ))}
        </>
      )}
    </>
  );
};