export interface Position {
  x: number;
  y: number;
}

export type UserRole = 'user1' | 'user2' | null;

export type DrawingTool = 'pen' | 'eraser';

export interface Stroke {
  path: Position[];
  color: string; // Color for pen, or background color for eraser
  strokeWidth: number;
  tool: DrawingTool;
}
