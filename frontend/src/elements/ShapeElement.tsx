import React, { useEffect, useRef } from 'react';
import { Group, Rect, Circle, Line } from 'react-konva';
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
  showAnchors?: boolean;
}

export const ShapeElement: React.FC<Props> = ({
  element,
  isSelected,
  canDrag,
  onChange,
  onClick,
  onContextMenu,
  registerNode,
  showAnchors,
}) => {
  const groupRef = useRef<any>(null);

  const props = (element.properties || {}) as any;
  const kind = props.shapeKind ?? 'RECT';
  const fill = props.fill || '#ffffff';
  const stroke = props.stroke || '#000000';

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

  const commonStroke = isSelected ? '#00a1ff' : stroke;
  const commonStrokeWidth = isSelected ? 3 : 2;

  const renderShape = () => {
    const w = element.width;
    const h = element.height;

    switch (kind) {
      case 'RECT': {
        return (
          <Rect
            width={w}
            height={h}
            fill={fill}
            stroke={commonStroke}
            strokeWidth={commonStrokeWidth}
            cornerRadius={4}
          />
        );
      }

      case 'CIRCLE': {
        const r = Math.min(w, h) / 2;
        return (
          <Circle
            x={w / 2}
            y={h / 2}
            radius={r}
            fill={fill}
            stroke={commonStroke}
            strokeWidth={commonStrokeWidth}
          />
        );
      }

      case 'OVAL': {
        const rX = w / 2;
        const rY = h / 2;
        return (
          <Group x={w / 2} y={h / 2} scaleY={rY / rX}>
            <Circle
              radius={rX}
              fill={fill}
              stroke={commonStroke}
              strokeWidth={commonStrokeWidth}
            />
          </Group>
        );
      }

      case 'DIAMOND': {

        const points = [
          w / 2, 0,
          w, h / 2,
          w / 2, h,
          0, h / 2,
        ];
        return (
          <Line
            points={points}
            closed
            fill={fill}
            stroke={commonStroke}
            strokeWidth={commonStrokeWidth}
          />
        );
      }

      case 'TRAPEZOID': {
        const topWidth = w * 0.6;
        const offset = (w - topWidth) / 2;
        const points = [
          offset, 0,
          offset + topWidth, 0,
          w, h,
          0, h,
        ];
        return (
          <Line
            points={points}
            closed
            fill={fill}
            stroke={commonStroke}
            strokeWidth={commonStrokeWidth}
          />
        );
      }

      case 'TRIANGLE': {
        const points = [
          w / 2, 0,
          w, h,
          0, h,
        ];
        return (
          <Line
            points={points}
            closed
            fill={fill}
            stroke={commonStroke}
            strokeWidth={commonStrokeWidth}
          />
        );
      }

      case 'CYLINDER': {

        const rx = w / 2;
        const ry = Math.min(h / 4, w / 4);
        const bodyHeight = h - 2 * ry;

        return (
          <Group>

            <Group x={w / 2} y={ry / 2} scaleY={ry / rx}>
              <Circle
                radius={rx}
                fill={fill}
                stroke={commonStroke}
                strokeWidth={commonStrokeWidth}
              />
            </Group>

            <Rect
              x={0}
              y={ry / 2}
              width={w}
              height={bodyHeight}
              fill={fill}
              stroke={commonStroke}
              strokeWidth={commonStrokeWidth}
            />

            <Group x={w / 2} y={ry / 2 + bodyHeight} scaleY={ry / rx}>
              <Circle
                radius={rx}
                fill={fill}
                stroke={commonStroke}
                strokeWidth={commonStrokeWidth}
              />
            </Group>
          </Group>
        );
      }

      default: {
        return (
          <Rect
            width={w}
            height={h}
            fill={fill}
            stroke={commonStroke}
            strokeWidth={commonStrokeWidth}
            cornerRadius={4}
          />
        );
      }
    }
  };

const getShapeAnchors = (element: BoardElementDto) => {
  const props = (element.properties || {}) as any;
  const kind = props.shapeKind ?? 'RECT';
  const w = element.width;
  const h = element.height;

  switch (kind) {
    case 'RECT':
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

    case 'CIRCLE': {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2;
      return [
        { x: cx, y: cy - r },
        { x: cx + r, y: cy },
        { x: cx, y: cy + r },
        { x: cx - r, y: cy },
      ];
    }

    case 'OVAL': {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w / 2;
      const ry = h / 2;
      return [
        { x: cx, y: cy - ry },
        { x: cx + rx, y: cy },
        { x: cx, y: cy + ry },
        { x: cx - rx, y: cy },
      ];
    }

    case 'DIAMOND': {
      return [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ];
    }

    case 'TRIANGLE': {
      return [
        { x: w / 2, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
    }

    case 'TRAPEZOID': {
      const topWidth = w * 0.6;
      const offset = (w - topWidth) / 2;
      return [
        { x: offset, y: 0 },
        { x: offset + topWidth, y: 0 },
        { x: 0, y: h },
        { x: w, y: h },
      ];
    }

    case 'CYLINDER': {
      return [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ];
    }

    default:
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
};

  const w = element.width;
  const h = element.height;
  const anchorRadius = 5;
  const anchorPoints = getShapeAnchors(element);

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
      {renderShape()}

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