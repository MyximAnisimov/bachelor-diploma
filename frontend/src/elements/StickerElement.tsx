import React, { useEffect, useRef } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { BoardElementDto } from '../api/types';

interface Props {
  element: BoardElementDto;
  isSelected: boolean;
  canDrag: boolean;
  onChange: (updated: BoardElementDto) => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: KonvaEventObject<PointerEvent>) => void;
  onDblClick: () => void;
  registerNode: (node: any | null) => void;
  showAnchors: boolean;
}

export const StickerElement: React.FC<Props> = ({
  element,
  isSelected,
  canDrag,
  onChange,
  onClick,
  onContextMenu,
  onDblClick,
  registerNode,
  showAnchors,
}) => {
  const groupRef = useRef<any>(null);

  const props = element.properties || {};
  const text: string = props.text || '';
  const color: string = props.color || '#fff59d';
  const fontSize: number = props.fontSize || 16;

  useEffect(() => {
    registerNode(groupRef.current);
  }, [registerNode, element.id]);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onChange({
      ...element,
      x: node.x(),
      y: node.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const newWidth = element.width * scaleX;
    const newHeight = element.height * scaleY;

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      ...element,
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    });
  };

  const w = element.width;
  const h = element.height;
  const anchorRadius = 5;

  const anchorPoints = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },

    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ];

  return (
    <Group
      ref={groupRef}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={canDrag && !element.lockedPosition}
      onClick={onClick}
      onTap={onClick}
      onContextMenu={onContextMenu}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <Rect
        width={w}
        height={h}
        fill={color}
        stroke={isSelected ? '#00a1ff' : '#e0c35a'}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={6}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={6}
        shadowOffset={{ x: 3, y: 3 }}
        shadowOpacity={0.4}
      />

      <Text
        text={text}
        width={w}
        height={h}
        fontSize={fontSize}
        fill="#333"
        padding={8}
        listening={false}
      />

      {showAnchors &&
        anchorPoints.map((p, idx) => (
          <Circle
            key={idx}
            x={p.x}
            y={p.y}
            radius={anchorRadius}
            fill="white"
            stroke="#00a1ff"
            strokeWidth={1.5}
            opacity={0.9}
            listening={false}
          />
        ))}
    </Group>
  );
};