export const MAX_USERS = 4;

const buildUserKey = (base: string, userIndex: number): string => `${base}${userIndex + 1}`;

export const SESSION_USER_ID_BASE = 'sharedPixelSessionUser';
export const SESSION_USER_STROKES_BASE = 'sharedPixelUserStrokes';

export const SESSION_USER_ID_KEYS: string[] = Array.from(
  { length: MAX_USERS },
  (_, i) => buildUserKey(SESSION_USER_ID_BASE + 'Id', i)
);

export const SESSION_USER_STROKES_KEYS: string[] = Array.from(
  { length: MAX_USERS },
  (_, i) => buildUserKey(SESSION_USER_STROKES_BASE, i)
);

export const USER_ROLES: ('user1' | 'user2' | 'user3' | 'user4')[] = [
  'user1',
  'user2',
  'user3',
  'user4',
];

// Key for clear canvas event
export const CLEAR_CANVAS_KEY = 'sharedPixelClearCanvas';
