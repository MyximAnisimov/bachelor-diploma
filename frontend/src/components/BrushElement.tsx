import { Line } from 'react-konva';
import type { BoardElementDto } from '../api/types';

interface Props {
  element: BoardElementDto;
}

export const BrushElement: React.FC<Props> = ({ element }) => {
  const props = element.properties || {};
  const points: number[] = props.points || [];
  const stroke = props.stroke || '#000';
  const strokeWidth = props.strokeWidth || 3;

  return (
    <Line
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      listening={false}
    />
  );
};