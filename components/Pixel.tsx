
import React from 'react';
import { Position } from '../types';

interface PixelProps {
  position: Position;
  color: string;
  size?: number;
}

const Pixel: React.FC<PixelProps> = ({ position, color, size = 8 }) => {
  // Do not render if position is initial/invalid (-1,-1)
  if (position.x < 0 || position.y < 0) {
    return null;
  }

  return (
    <div
      className="absolute rounded-full shadow-md"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        transform: `translate(-${size / 2}px, -${size / 2}px)`,
        pointerEvents: 'none', // So it doesn't interfere with mouse events on the main screen
        transition: 'left 0.05s linear, top 0.05s linear', // Smooth out pixel movement slightly
      }}
    />
  );
};

export default Pixel;
