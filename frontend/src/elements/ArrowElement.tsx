import React, { useState } from 'react';
import { Arrow, Circle } from 'react-konva';
import type { BoardElementDto } from '../../api/types';
import type { KonvaEventObject } from 'konva/lib/Node';

interface Props {
  element: BoardElementDto;
  allElements: BoardElementDto[];
  isSelected: boolean;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: KonvaEventObject<PointerEvent>) => void;
  onChange: (updated: BoardElementDto) => void;
  canEdit: boolean;
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
}) => {
  const props = element.properties || {};
  const fromId: number | undefined = props.fromId;
  const toId: number | undefined = props.toId;
  const fromAnchorIndex: number = props.fromAnchorIndex ?? 0;
  const toAnchorIndex: number = props.toAnchorIndex ?? 0;
  const color: string = props.color || '#000000';
  const strokeWidth: number = props.strokeWidth || 2;

  const fromEl = allElements.find((el) => el.id === fromId);
  const toEl = allElements.find((el) => el.id === toId);
  if (!fromEl || !toEl) return null;

  const fromPoint = getAnchorWorldPoint(fromEl, fromAnchorIndex);
  const toPoint = getAnchorWorldPoint(toEl, toAnchorIndex);

  const [tempFromPoint, setTempFromPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempToPoint, setTempToPoint] = useState<{ x: number; y: number } | null>(null);

  const handleRadius = 6;

  const findNearestStickerAnchor = (pos: { x: number; y: number }) => {
    let bestSticker: BoardElementDto | null = null;
    let bestAnchorIdx = 0;
    let bestDist2 = Infinity;

    const stickers = allElements.filter((el) => el.type === 'STICKER');

    stickers.forEach((sticker) => {
      const anchors = getStickerAnchors(sticker);
      anchors.forEach((a, idx) => {
        const world = getAnchorWorldPoint(sticker, idx);
        const dx = world.x - pos.x;
        const dy = world.y - pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist2) {
          bestDist2 = d2;
          bestSticker = sticker;
          bestAnchorIdx = idx;
        }
      });
    });

    if (!bestSticker) return null;
    if (bestDist2 > SNAP_RADIUS * SNAP_RADIUS) return null;

    return { sticker: bestSticker, anchorIndex: bestAnchorIdx };
  };

  const handleEndDragMove =
    (kind: 'from' | 'to') =>
    (e: KonvaEventObject<DragEvent>) => {
      if (!canEdit) return;
      const node = e.target;
      const pos = node.getAbsolutePosition();

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

      const node = e.target;
      const pos = node.getAbsolutePosition();

      const nearest = findNearestStickerAnchor(pos);

      if (kind === 'from') {
        setTempFromPoint(null);
      } else {
        setTempToPoint(null);
      }

      if (!nearest) {
        return;
      }

      const { sticker, anchorIndex } = nearest;

      if (kind === 'from') {
        const updated: BoardElementDto = {
          ...element,
          properties: {
            ...props,
            fromId: sticker.id,
            fromAnchorIndex: anchorIndex,
          },
        };
        onChange(updated);
      } else {
        const updated: BoardElementDto = {
          ...element,
          properties: {
            ...props,
            toId: sticker.id,
            toAnchorIndex: anchorIndex,
          },
        };
        onChange(updated);
      }
    };

  const start = tempFromPoint ?? fromPoint;
  const end = tempToPoint ?? toPoint;

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