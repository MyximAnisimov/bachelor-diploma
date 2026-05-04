export function getRectAnchors(el: BoardElementDto) {
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

export function getElementAnchorWorldPoint(el: BoardElementDto, anchorIndex: number) {
  const anchors = getRectAnchors(el);
  const local = anchors[anchorIndex] || { x: el.width / 2, y: el.height / 2 };

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