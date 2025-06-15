
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, UserRole, Stroke, DrawingTool, BlendMode, ActualUserRole } from './types';
import StatusMessage from './components/StatusMessage';
import Toolbar from './components/Toolbar';
import {
  MAX_USERS,
  SESSION_USER_ID_KEYS,
  SESSION_USER_STROKES_KEYS,
  USER_ROLES, // This is effectively ActualUserRole[]
  CLEAR_CANVAS_KEY,
} from './constants/localStorageKeys';

const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const USER_COLORS: Record<ActualUserRole, string> = {
  user1: 'rgba(236, 72, 153, 1)', // Pink
  user2: 'rgba(34, 211, 238, 1)',  // Cyan
  user3: 'rgba(132, 204, 22, 1)', // Lime
  user4: 'rgba(249, 115, 22, 1)',  // Orange
};
const ERASER_COLOR = '#FFFFFF'; 
const DEFAULT_STROKE_WIDTH = 4;

const GRAVITY_FACTOR = 0.005; 
const PULSE_PERIOD = 600; 
const PULSE_AMPLITUDE_RATIO = 0.4; 

interface ConnectedUser {
  id: string;
  role: ActualUserRole; // Connected users always have an actual role
  color: string;
}

const App: React.FC = () => {
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<UserRole>(null); // Can be null initially
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  
  const myIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<UserRole>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingAreaRef = useRef<HTMLDivElement>(null); 
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(60); 

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDrawingPath, setCurrentDrawingPath] = useState<Position[]>([]);
  const [allStrokes, setAllStrokes] = useState<Record<ActualUserRole, Stroke[]>>({
    user1: [], user2: [], user3: [], user4: [],
  });
  
  const [myUserColor, setMyUserColor] = useState<string>(USER_COLORS.user1);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>(myUserColor);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);

  const [isPulsingBrush, setIsPulsingBrush] = useState<boolean>(false);
  const [blendMode, setBlendMode] = useState<BlendMode>('source-over');
  const [animatedStrokesExist, setAnimatedStrokesExist] = useState<boolean>(false);

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    myRoleRef.current = myRole;
    if (myRole && USER_ROLES.includes(myRole as ActualUserRole)) {
      const newAssignedColor = USER_COLORS[myRole as ActualUserRole];
      setMyUserColor(newAssignedColor);
      
      const penTools: DrawingTool[] = ['pen', 'gravityPen'];
      const previousUserColors = Object.values(USER_COLORS);
      if (penTools.includes(currentTool) && (previousUserColors.includes(currentColor) || currentColor === ERASER_COLOR)) {
        setCurrentColor(newAssignedColor);
      }
    }
  }, [myRole, currentTool, currentColor]); 

   useEffect(() => {
    const calculateToolbarHeight = () => {
      if (toolbarRef.current) {
        setToolbarHeight(toolbarRef.current.offsetHeight);
      }
    };
    calculateToolbarHeight(); 
    window.addEventListener('resize', calculateToolbarHeight);
    const observer = new ResizeObserver(calculateToolbarHeight);
    if (toolbarRef.current) observer.observe(toolbarRef.current);
    return () => {
        window.removeEventListener('resize', calculateToolbarHeight);
        if (toolbarRef.current) observer.unobserve(toolbarRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const drawingArea = drawingAreaRef.current;
    if (canvas && drawingArea) {
      canvas.width = drawingArea.clientWidth;
      canvas.height = drawingArea.clientHeight;
    }
  }, [toolbarHeight]); 

  useEffect(() => {
    const currentId = generateUniqueId();
    setMyId(currentId);
    let assignedRole: ActualUserRole | null = null; // Use ActualUserRole here or null if no slot
    let foundExistingRole = false;

    for (let i = 0; i < MAX_USERS; i++) {
      if (localStorage.getItem(SESSION_USER_ID_KEYS[i]) === currentId) {
        assignedRole = USER_ROLES[i];
        foundExistingRole = true;
        break;
      }
    }

    if (!foundExistingRole) {
      for (let i = 0; i < MAX_USERS; i++) {
        if (!localStorage.getItem(SESSION_USER_ID_KEYS[i])) {
          localStorage.setItem(SESSION_USER_ID_KEYS[i], currentId);
          assignedRole = USER_ROLES[i];
          break;
        }
      }
    }
    
    if (assignedRole) {
      setMyRole(assignedRole);
      const strokesToLoad: Partial<Record<ActualUserRole, Stroke[]>> = {};
      
      const myStrokesKey = SESSION_USER_STROKES_KEYS[USER_ROLES.indexOf(assignedRole)];
      const storedMyStrokes = localStorage.getItem(myStrokesKey);
      if (storedMyStrokes) {
        try {
          strokesToLoad[assignedRole] = JSON.parse(storedMyStrokes) as Stroke[];
        } catch (e) { 
          console.error("Error parsing my strokes", e); 
          strokesToLoad[assignedRole] = [];
        }
      } else {
        strokesToLoad[assignedRole] = [];
      }

      const others: ConnectedUser[] = [];
      for (let i = 0; i < MAX_USERS; i++) {
        const role = USER_ROLES[i];
        if (role === assignedRole) continue;
        const userId = localStorage.getItem(SESSION_USER_ID_KEYS[i]);
        if (userId) {
          others.push({ id: userId, role, color: USER_COLORS[role] });
          const partnerStrokesKey = SESSION_USER_STROKES_KEYS[i];
          const storedPartnerStrokes = localStorage.getItem(partnerStrokesKey);
          if (storedPartnerStrokes) {
            try {
              strokesToLoad[role] = JSON.parse(storedPartnerStrokes) as Stroke[];
            } catch (e) { strokesToLoad[role] = []; }
          } else {
            strokesToLoad[role] = [];
          }
        } else {
            if (!(role in strokesToLoad)) { // Ensure empty array if slot is free and not my role
                strokesToLoad[role] = [];
            }
        }
      }
      setConnectedUsers(others);
      setAllStrokes(prev => ({ ...prev, ...strokesToLoad }));
    } else {
      setStatusMessage('Session is full. Please try again later.');
    }
  }, []);


  useEffect(() => {
    if (!myRole && !myId) {
      setStatusMessage('Initializing...');
    } else if (myRole && connectedUsers.length === 0 && MAX_USERS > 1) {
      setStatusMessage('Waiting for others to connect...');
    } else if (myRole && connectedUsers.length > 0) {
      setStatusMessage(`Connected with ${connectedUsers.length} other user${connectedUsers.length > 1 ? 's' : ''}. Let's draw!`);
    } else if (!myRole && myId) {
       if (statusMessage === 'Initializing...') { 
          setStatusMessage('Trying to join session...');
       }
    }
  }, [myRole, myId, connectedUsers, statusMessage]);


  useEffect(() => {
    if (myRole && myId && allStrokes[myRole as ActualUserRole]) { // Ensure myRole is an ActualUserRole for indexing
      const myStrokesKey = SESSION_USER_STROKES_KEYS[USER_ROLES.indexOf(myRole as ActualUserRole)];
      localStorage.setItem(myStrokesKey, JSON.stringify(allStrokes[myRole as ActualUserRole]));
    }
  }, [allStrokes, myRole, myId]); 


  useEffect(() => {
    if (!myId || !myRole) return;

    const handleStorageChange = (event: StorageEvent) => {
      const currentMyRole = myRoleRef.current as ActualUserRole | null; // Cast for safety, check below
      const currentMyId = myIdRef.current;
      if (!currentMyRole || !currentMyId) return;

      SESSION_USER_ID_KEYS.forEach((key, index) => {
        if (event.key === key) {
          const changedUserRole = USER_ROLES[index]; // This is ActualUserRole
          if (changedUserRole === currentMyRole) return; 

          const newUserId = event.newValue;
          if (newUserId && newUserId !== currentMyId) { 
            if (!connectedUsers.find(u => u.id === newUserId)) {
              setConnectedUsers(prev => [...prev.filter(u => u.role !== changedUserRole), { id: newUserId, role: changedUserRole, color: USER_COLORS[changedUserRole] }]);
              setStatusMessage(`${changedUserRole} has joined!`);
              const strokesKey = SESSION_USER_STROKES_KEYS[index];
              const storedStrokes = localStorage.getItem(strokesKey);
              if (storedStrokes) {
                try {
                  setAllStrokes(prev => ({...prev, [changedUserRole]: JSON.parse(storedStrokes)}));
                } catch(e) { setAllStrokes(prev => ({...prev, [changedUserRole]: []})); }
              } else {
                 setAllStrokes(prev => ({...prev, [changedUserRole]: []}));
              }
            }
          } else if (!newUserId) { 
            setConnectedUsers(prev => prev.filter(u => u.role !== changedUserRole));
            setAllStrokes(prev => ({...prev, [changedUserRole]: [] })); 
            setStatusMessage(`${changedUserRole} has left.`);
          }
        }
      });

      SESSION_USER_STROKES_KEYS.forEach((key, index) => {
        if (event.key === key) {
          const strokesUserRole = USER_ROLES[index]; // ActualUserRole
          if (strokesUserRole === currentMyRole) return; 

          if (event.newValue) {
            try {
              const newPartnerStrokes = JSON.parse(event.newValue) as Stroke[];
              setAllStrokes(prev => ({...prev, [strokesUserRole]: Array.isArray(newPartnerStrokes) ? newPartnerStrokes : [] }));
            } catch (e) { setAllStrokes(prev => ({...prev, [strokesUserRole]: [] }));}
          } else { 
            setAllStrokes(prev => ({...prev, [strokesUserRole]: [] }));
          }
        }
      });
      
      if (event.key === CLEAR_CANVAS_KEY && event.newValue) {
        try {
          const clearEventData = JSON.parse(event.newValue);
          if (clearEventData.clearedBy !== currentMyId) {
            setAllStrokes(() => ({ // Fully replace with a correctly typed object
              user1: [], user2: [], user3: [], user4: [],
            }));
            setStatusMessage('Canvas cleared by another user.');
          }
        } catch(e) { console.error("Error parsing clear canvas event", e); }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [myId, myRole, connectedUsers]); 


  useEffect(() => {
    const cleanup = () => {
      const role = myRoleRef.current;
      const id = myIdRef.current;
      if (!id || !role) return; // role here can be null, but USER_ROLES.indexOf handles it by returning -1
      const roleIndex = USER_ROLES.indexOf(role as ActualUserRole); // Cast because USER_ROLES contains ActualUserRole
      if (roleIndex !== -1) {
        if (localStorage.getItem(SESSION_USER_ID_KEYS[roleIndex]) === id) {
          localStorage.removeItem(SESSION_USER_ID_KEYS[roleIndex]);
          localStorage.removeItem(SESSION_USER_STROKES_KEYS[roleIndex]);
        }
      }
    };
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []); 

  const getPointerPosition = (event: React.MouseEvent | React.TouchEvent<HTMLDivElement>): Position | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in event) { 
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else { 
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent<HTMLDivElement>) => {
    if (!myRole) return; // myRole here is UserRole; if null, can't draw
    if ('button' in event && event.button !== 0) return; 
    const pos = getPointerPosition(event);
    if (!pos) return;
    setIsDrawing(true);
    setCurrentDrawingPath([pos]);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || !myRole) return;
    const pos = getPointerPosition(event);
    if (!pos) return;
    setCurrentDrawingPath(prev => [...prev, pos]);
     if ('touches' in event && event.cancelable) event.preventDefault(); 
  };

  const endDrawing = () => {
    if (!isDrawing || !myRole) return; // myRole is UserRole
    setIsDrawing(false);
    if (currentDrawingPath.length > 1) {
      const actualRole = myRole as ActualUserRole; // Safe cast due to !myRole check above
      const newStroke: Stroke = {
        path: currentDrawingPath,
        color: (currentTool === 'pen' || currentTool === 'gravityPen') ? currentColor : ERASER_COLOR,
        strokeWidth: currentStrokeWidth,
        tool: currentTool,
        creationTime: (currentTool === 'gravityPen' || isPulsingBrush) ? Date.now() : undefined,
        isPulsating: isPulsingBrush ? true : undefined,
      };
      setAllStrokes(prev => ({
        ...prev,
        [actualRole]: [...(prev[actualRole] || []), newStroke]
      }));
    }
    setCurrentDrawingPath([]);
  };
  
  const clearCanvas = () => {
    setAllStrokes({ // Fully replace with a correctly typed object
        user1: [], user2: [], user3: [], user4: [],
    });

    if (myId) {
      localStorage.setItem(CLEAR_CANVAS_KEY, JSON.stringify({ clearedBy: myId, timestamp: Date.now() }));
    }
     setStatusMessage('Canvas cleared.');
  };

  const redrawCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _allStrokes: Record<ActualUserRole, Stroke[]>, // Updated type
    _currentPath: Position[],
    _isDrawingCurrently: boolean,
    _currentDrawingColor: string,
    _currentStrokeWidth: number,
    _currentTool: DrawingTool,
    _blendMode: BlendMode
  ) => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = _blendMode;

    const strokesToDraw: Stroke[] = [];
    USER_ROLES.forEach(role => { // USER_ROLES are ActualUserRole
      if (_allStrokes[role]) {
        strokesToDraw.push(..._allStrokes[role]);
      }
    });
    strokesToDraw.sort((a, b) => (a.creationTime || 0) - (b.creationTime || 0));

    const drawSingleStroke = (stroke: Stroke, isCurrent?: boolean) => {
      const path = stroke.path;
      if (path.length < 2 && !isCurrent) return; 
      if (path.length === 0 && isCurrent) return;

      ctx.beginPath();
      let yOffset = 0;
      if (stroke.tool === 'gravityPen' && stroke.creationTime) {
        yOffset = (Date.now() - stroke.creationTime) * GRAVITY_FACTOR;
      }
      ctx.moveTo(path[0].x, path[0].y + (stroke.tool === 'gravityPen' ? yOffset : 0) );
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y + (stroke.tool === 'gravityPen' ? yOffset : 0));
      }
      
      let finalStrokeWidth = stroke.strokeWidth;
      if (stroke.isPulsating && stroke.creationTime) {
        const pulseProgress = (Date.now() - stroke.creationTime) / PULSE_PERIOD;
        const amplitude = stroke.strokeWidth * PULSE_AMPLITUDE_RATIO;
        finalStrokeWidth = stroke.strokeWidth + Math.sin(pulseProgress * 2 * Math.PI) * amplitude;
        finalStrokeWidth = Math.max(1, finalStrokeWidth); 
      }
      ctx.strokeStyle = stroke.color; 
      ctx.lineWidth = finalStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    strokesToDraw.forEach(s => drawSingleStroke(s));

    if (_isDrawingCurrently && _currentPath.length > 0 && myRole) { // myRole checks if a user is active
      const currentEffectiveTool = _currentTool; 
      const currentEffectiveColor = (currentEffectiveTool === 'pen' || currentEffectiveTool === 'gravityPen') ? _currentDrawingColor : ERASER_COLOR;
       drawSingleStroke({
          path: _currentPath,
          color: currentEffectiveColor,
          strokeWidth: _currentStrokeWidth,
          tool: currentEffectiveTool, 
          isPulsating: isPulsingBrush, 
          creationTime: (currentEffectiveTool === 'gravityPen' || isPulsingBrush) ? Date.now() : undefined 
      }, true);
    }
  }, [isPulsingBrush, myRole]);

  useEffect(() => {
    let hasAnimated = false;
    for (const role of USER_ROLES) { // USER_ROLES are ActualUserRole
        if(allStrokes[role]?.some(s => s.tool === 'gravityPen' || s.isPulsating)) {
            hasAnimated = true;
            break;
        }
    }
    setAnimatedStrokesExist(hasAnimated);
  }, [allStrokes]);


  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (animatedStrokesExist) {
      let animationFrameId: number;
      const animate = () => {
        redrawCanvas(
            ctx, canvas.width, canvas.height,
            allStrokes, 
            currentDrawingPath, isDrawing,
            currentColor, 
            currentStrokeWidth, currentTool,
            blendMode
        );
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrameId);
    } else {
      redrawCanvas(
        ctx, canvas.width, canvas.height,
        allStrokes,
        currentDrawingPath, isDrawing,
        currentColor,
        currentStrokeWidth, currentTool,
        blendMode
      );
    }
  }, [
    allStrokes, currentDrawingPath, isDrawing,
    currentColor, currentStrokeWidth, currentTool, blendMode,
    animatedStrokesExist, redrawCanvas, canvasRef, toolbarHeight 
  ]);


  const getCursorStyle = () => {
    if (!myRole) return 'not-allowed'; 
    if (currentTool === 'pen') return 'crosshair';
    if (currentTool === 'eraser') return 'cell'; 
    if (currentTool === 'gravityPen') return isDrawing ? 'grabbing' : 'grab';
    return 'default';
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-slate-200 overflow-hidden">
      <Toolbar
        ref={toolbarRef}
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        currentStrokeWidth={currentStrokeWidth}
        setCurrentStrokeWidth={setCurrentStrokeWidth}
        clearCanvas={clearCanvas}
        myUserColor={myUserColor} 
        isPulsingBrush={isPulsingBrush}
        setIsPulsingBrush={setIsPulsingBrush}
        blendMode={blendMode}
        setBlendMode={setBlendMode}
        isSessionActive={!!myRole} 
      />
      <div
        ref={drawingAreaRef}
        className="flex-grow relative bg-white"
        style={{ cursor: getCursorStyle(), height: `calc(100vh - ${toolbarHeight}px)` }}
        onMouseDown={myRole ? startDrawing : undefined}
        onMouseMove={myRole ? draw : undefined}
        onMouseUp={myRole ? endDrawing : undefined}
        onMouseLeave={myRole ? endDrawing : undefined} 
        onTouchStart={myRole ? startDrawing : undefined}
        onTouchMove={myRole ? draw : undefined}
        onTouchEnd={myRole ? endDrawing : undefined}
        onTouchCancel={myRole ? endDrawing : undefined}
        role="application"
        aria-label="Shared drawing canvas"
      >
        <canvas ref={canvasRef} id="drawingCanvas" className="absolute top-0 left-0" />
      </div>
      <StatusMessage message={statusMessage} />
    </div>
  );
};

export default App;