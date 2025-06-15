export interface Position {
  x: number;
  y: number;
}

export type UserRole = 'user1' | 'user2' | null;

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