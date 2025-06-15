export interface Position {
  x: number;
  y: number;
}

// UserRole can include null for states where a role is not yet assigned or applicable.
export type UserRole = 'user1' | 'user2' | 'user3' | 'user4' | null;

// ActualUserRole represents roles that actively participate in drawing and have associated strokes.
export type ActualUserRole = 'user1' | 'user2' | 'user3' | 'user4';

export type DrawingTool = 'pen' | 'eraser' | 'gravityPen';

export type BlendMode = 'source-over' | 'lighter' | 'difference' | 'multiply';

export interface Stroke {
  path: Position[];
  color: string; // Color for pen, or background color for eraser
  strokeWidth: number;
  tool: DrawingTool;
  creationTime?: number; // For gravity and pulsing effects
  isPulsating?: boolean;   // For pulsing effect
}