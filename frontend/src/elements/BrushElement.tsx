import React, { useEffect, useRef } from 'react';
import { Group, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { BoardElementDto } from '../api/types';

interface Props {
  element: BoardElementDto;
  isSelected: boolean;
  canDrag: boolean;
  onChange: (updated: BoardElementDto) => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: KonvaEventObject<PointerEvent>) => void;
  registerNode: (node: any | null) => void;
}

export const BrushElement: React.FC<Props> = ({
  element,
  isSelected,
  canDrag,
  onChange,
  onClick,
  onContextMenu,
  registerNode,
}) => {
  const groupRef = useRef<any>(null);

  const props = element.properties || {};
  const points: number[] = props.points || [];
  const stroke: string = props.stroke || '#000000';
  const strokeWidth: number = props.strokeWidth || 4;

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

      const oldPoints: number[] = props.points || [];
      const newPoints: number[] = [];
      for (let i = 0; i < oldPoints.length; i += 2) {
        newPoints.push(oldPoints[i] * scaleX, oldPoints[i + 1] * scaleY);
      }

      const oldStrokeWidth: number = props.strokeWidth || 4;
      const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
      const newStrokeWidth = oldStrokeWidth * avgScale;

      node.scaleX(1);
      node.scaleY(1);

      onChange({
        ...element,
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
        properties: {
          ...props,
          points: newPoints,
          strokeWidth: newStrokeWidth,
        },
      });
    };

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
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <Line
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );
};