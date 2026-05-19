import React, { useEffect, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
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
}

export const TextElement: React.FC<Props> = ({
  element,
  isSelected,
  canDrag,
  onChange,
  onClick,
  onContextMenu,
  onDblClick,
  registerNode,
}) => {
  const groupRef = useRef<any>(null);

  const props = element.properties || {};

  const text = props.text ?? '';
  const fontSize = Number(props.fontSize ?? 18);
  const color = props.color ?? '#000000';
  const fontFamily = props.fontFamily ?? 'Arial';
  const fontStyle = props.fontStyle ?? 'normal';
  const align = props.align ?? 'left';
  const verticalAlign = props.verticalAlign ?? 'top';
  const padding = Number(props.padding ?? 4);
  const lineHeight = Number(props.lineHeight ?? 1.2);
  const textDecoration = props.textDecoration ?? '';
  const wrap = props.wrap ?? 'word';

  useEffect(() => {
    registerNode(groupRef.current);
    return () => registerNode(null);
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
        width={element.width}
        height={element.height}
        fill={isSelected ? 'rgba(0,161,255,0.05)' : 'transparent'}
        stroke={isSelected ? '#00a1ff' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
      />
      <Text
        text={text}
        width={element.width}
        height={element.height}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontStyle={fontStyle}
        textDecoration={textDecoration}
        fill={color}
        align={align}
        verticalAlign={verticalAlign}
        padding={padding}
        lineHeight={lineHeight}
        wrap={wrap}
        listening={false}
      />
    </Group>
  );
};