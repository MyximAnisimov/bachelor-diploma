import React, { useEffect, useRef, useState } from 'react';
import { Group, Rect, Image as KonvaImage, Circle } from 'react-konva';
import type { BoardElementDto } from '../api/types';
import type { KonvaEventObject } from 'konva/lib/Node';
import { api } from '../api/http';
import { loadImage } from '../utils/imageCache';

interface Props {
  element: BoardElementDto;
  isSelected: boolean;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: KonvaEventObject<PointerEvent>) => void;
  onChange: (updated: BoardElementDto) => void;
  canEdit: boolean;
  registerNode?: (node: Konva.Node | null) => void;
  onLock?: (id: number) => void;
  onUnlock?: (id: number) => void;
  showAnchors?: boolean;
}

export const MediaElement: React.FC<Props> = ({
  element,
  isSelected,
  onClick,
  onContextMenu,
  onChange,
  canEdit,
  registerNode,
  onLock,
  onUnlock,
  showAnchors,
}) => {
  const propsAny = (element.properties || {}) as any;
  const rawUrl: string | undefined = propsAny.url;
  const apiBaseUrl = api.defaults.baseURL || '';
  const url = rawUrl
    ? rawUrl.startsWith('http')
      ? rawUrl
      : `${apiBaseUrl}${rawUrl}`
    : undefined;

  const imageRef = useRef<HTMLImageElement | null>(null);
  const [, setLoadedVersion] = useState(0);

  const groupRef = useRef<Konva.Group | null>(null);

  console.log('MediaElement render, id=', element.id, 'url=', url);

useEffect(() => {
  if (!url) return;

    loadImage(url)
      .then((img) => {
        imageRef.current = img;
        setLoadedVersion((v) => v + 1);
      })
      .catch((e) => {
        console.error('Image failed to load in MediaElement', url, e);
      });
  }, [url, element.id]);

    useEffect(() => {
      if (registerNode) {
        registerNode(groupRef.current);
        return () => registerNode(null);
      }
    }, [registerNode, element.id]);

  if (!url) return null;

const halfW = element.width / 2;
const halfH = element.height / 2;

const anchorRadius = 5;
const anchorPoints = [
  { x: -halfW, y: -halfH },
  { x: halfW, y: -halfH },
  { x: halfW, y: halfH },
  { x: -halfW, y: halfH },
  { x: 0, y: -halfH },
  { x: halfW, y: 0 },
  { x: 0, y: halfH },
  { x: -halfW, y: 0 },
];

return (
  <Group
    ref={groupRef}
    x={element.x + halfW}
    y={element.y + halfH}
    rotation={element.rotation}
    name={String(element.id)}
    onClick={onClick}
    onTap={onClick}
    onContextMenu={onContextMenu}
    draggable={canEdit}
    onDragStart={() => {
      if (!canEdit) return;
      onLock?.(element.id);
    }}
    onDragEnd={(e) => {
      if (!canEdit) return;
      const node = e.target;
      const { x, y } = node.position();

      const updated: BoardElementDto = {
        ...element,
        x: x - halfW,
        y: y - halfH,
      };
      onChange(updated);
      onUnlock?.(element.id);
    }}
    onTransformStart={() => {
      if (!canEdit) return;
      onLock?.(element.id);
    }}
    onTransformEnd={() => {
      const node = groupRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      const newWidth = element.width * scaleX;
      const newHeight = element.height * scaleY;
      const newHalfW = newWidth / 2;
      const newHalfH = newHeight / 2;

      const updated: BoardElementDto = {
        ...element,
        x: node.x() - newHalfW,
        y: node.y() - newHalfH,
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      };

      node.scaleX(1);
      node.scaleY(1);

      onChange(updated);
      onUnlock?.(element.id);
    }}
  >
        <KonvaImage
          image={imageRef.current || undefined}
          x={-halfW}
          y={-halfH}
          width={element.width}
          height={element.height}
          rotation={0}
        />
        {isSelected && (
          <Rect
            x={-halfW}
            y={-halfH}
            width={element.width}
            height={element.height}
            stroke="#00a1ff"
            strokeWidth={2}
            dash={[4, 4]}
            listening={false}
          />
        )}

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