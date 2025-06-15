
import React from 'react';
import { Position } from '../types';

interface TrailProps {
  points: Position[];
  colorClass: string; // e.g., "bg-blue-500"
  baseSize?: number;
}

const Trail: React.FC<TrailProps> = ({ points, colorClass, baseSize = 6 }) => {
  const trailToRender = points; 

  return (
    <>
      {trailToRender.map((pos, index) => {
        if (pos.x < 0 || pos.y < 0) { // Should not happen for valid trail points
          return null;
        }

        // Fading effect: older points (lower index) are smaller and more transparent.
        // Newest point is at trailToRender.length - 1.
        const  trailLength = trailToRender.length;
        // relativePositionInTrail is 0 for the oldest visible point, 1 for the newest.
        const relativePositionInTrail = trailLength <= 1 ? 1 : index / (trailLength - 1);

        // Ensure older points are smaller/dimmer
        const currentSize = baseSize * (0.25 + 0.75 * relativePositionInTrail); // Range: 25% to 100% of baseSize
        const currentOpacity = 0.25 + 0.75 * relativePositionInTrail;       // Range: 25% to 100%

        // If only one point, it should be fully opaque and base sized.
        const displaySize = trailLength === 1 ? baseSize : Math.max(1, currentSize); // Ensure min size of 1px
        const displayOpacity = trailLength === 1 ? 1 : currentOpacity;

        return (
          <div
            key={index} // Index as key is acceptable here as order is stable and items don't have unique IDs
            className={`absolute rounded-full ${colorClass}`}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${displaySize}px`,
              height: `${displaySize}px`,
              opacity: displayOpacity,
              transform: `translate(-${displaySize / 2}px, -${displaySize / 2}px)`,
              pointerEvents: 'none', // So it doesn't interfere with mouse events on the main screen
              willChange: 'transform, opacity, width, height', // Hint for performance
            }}
            aria-hidden="true" // Decorative elements
          />
        );
      })}
    </>
  );
};

export default Trail;
