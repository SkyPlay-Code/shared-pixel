import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, UserRole, Stroke, DrawingTool, BlendMode } from './types';
import StatusMessage from './components/StatusMessage';
import Toolbar from './components/Toolbar';
import {
  SESSION_USER1_ID_KEY,
  SESSION_USER2_ID_KEY,
  SESSION_USER1_STROKES_KEY,
  SESSION_USER2_STROKES_KEY,
  CLEAR_CANVAS_KEY,
} from './constants/localStorageKeys';

const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const USER1_COLOR = 'rgba(236, 72, 153, 1)'; // Pink
const USER2_COLOR = 'rgba(34, 211, 238, 1)';  // Cyan
const ERASER_COLOR = '#FFFFFF'; 
const DEFAULT_STROKE_WIDTH = 4;

const GRAVITY_FACTOR = 0.005; // pixels per millisecond for gravity effect
const PULSE_PERIOD = 600; // milliseconds for one full pulse cycle
const PULSE_AMPLITUDE_RATIO = 0.4; // e.g., 40% of base strokeWidth for pulsing

const App: React.FC = () => {
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const myIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<UserRole>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingAreaRef = useRef<HTMLDivElement>(null); 
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(60); 

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDrawingPath, setCurrentDrawingPath] = useState<Position[]>([]);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [partnerStrokes, setPartnerStrokes] = useState<Stroke[]>([]);
  
  const [userAssignedColor, setUserAssignedColor] = useState<string>(USER1_COLOR);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>(userAssignedColor);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);

  // New "insane" feature states
  const [isPulsingBrush, setIsPulsingBrush] = useState<boolean>(false);
  const [blendMode, setBlendMode] = useState<BlendMode>('source-over');
  const [animatedStrokesExist, setAnimatedStrokesExist] = useState<boolean>(false);


  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    myRoleRef.current = myRole;
    let newAssignedColor = USER1_COLOR;
    if (myRole === 'user1') {
      newAssignedColor = USER1_COLOR;
    } else if (myRole === 'user2') {
      newAssignedColor = USER2_COLOR;
    }
    setUserAssignedColor(newAssignedColor);
    
    const penTools: DrawingTool[] = ['pen', 'gravityPen'];
    if (penTools.includes(currentTool) && (currentColor === USER1_COLOR || currentColor === USER2_COLOR || currentColor === ERASER_COLOR /* if eraser was active and color was white */)) {
      setCurrentColor(newAssignedColor);
    }
  }, [myRole]); 

   useEffect(() => {
    const calculateToolbarHeight = () => {
      if (toolbarRef.current) {
        setToolbarHeight(toolbarRef.current.offsetHeight);
      }
    };
    calculateToolbarHeight(); 
    // Recalculate on mount and resize
    window.addEventListener('resize', calculateToolbarHeight);
    // Also recalculate if toolbar content might change its height (e.g. flex-wrap)
    const observer = new ResizeObserver(calculateToolbarHeight);
    if (toolbarRef.current) {
        observer.observe(toolbarRef.current);
    }

    return () => {
        window.removeEventListener('resize', calculateToolbarHeight);
        if (toolbarRef.current) {
            observer.unobserve(toolbarRef.current);
        }
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

    const user1Id = localStorage.getItem(SESSION_USER1_ID_KEY);
    const user2Id = localStorage.getItem(SESSION_USER2_ID_KEY);
    let assignedRole: UserRole = null;

    if (!user1Id) {
      localStorage.setItem(SESSION_USER1_ID_KEY, currentId);
      assignedRole = 'user1';
    } else if (!user2Id && user1Id !== currentId) {
      localStorage.setItem(SESSION_USER2_ID_KEY, currentId);
      assignedRole = 'user2';
      setPartnerId(user1Id);
      setIsConnected(true);
    } else if (user1Id === currentId) {
      assignedRole = 'user1';
      if (user2Id) {
        setPartnerId(user2Id);
        setIsConnected(true);
      }
    } else if (user2Id === currentId) {
      assignedRole = 'user2';
      setPartnerId(user1Id); 
      setIsConnected(true);
    } else {
      setStatusMessage('Session is full. Please try again later.');
    }
    
    if (assignedRole) {
      setMyRole(assignedRole);
    }
  }, []);

  useEffect(() => {
    if (isConnected && partnerId) {
      setStatusMessage("Connected. Let's draw together!");
    } else if (myRole === 'user1' && !partnerId) {
      setStatusMessage('Waiting for a partner to connect...');
    } else if (myRole === 'user2' && !partnerId && !isConnected) { 
      setStatusMessage('Partner disconnected. Waiting for User 1...');
    } else if (!myId || !myRole) {
      setStatusMessage('Initializing...');
    }
  }, [isConnected, partnerId, myRole, myId]);

  useEffect(() => {
    if (myRole && myId) {
      const key = myRole === 'user1' ? SESSION_USER1_STROKES_KEY : SESSION_USER2_STROKES_KEY;
      localStorage.setItem(key, JSON.stringify(localStrokes));
    }
  }, [localStrokes, myRole, myId]);

  useEffect(() => {
    if (isConnected && partnerId && myRole) {
      const partnerStrokesKey = myRole === 'user1' ? SESSION_USER2_STROKES_KEY : SESSION_USER1_STROKES_KEY;
      const storedPartnerStrokes = localStorage.getItem(partnerStrokesKey);
      if (storedPartnerStrokes) {
        try {
          const parsedStrokes = JSON.parse(storedPartnerStrokes) as Stroke[];
          setPartnerStrokes(parsedStrokes);
        } catch (e) { console.error("Error parsing partner strokes", e); setPartnerStrokes([]); }
      } else {
        setPartnerStrokes([]);
      }
    }
  }, [isConnected, partnerId, myRole]);

  useEffect(() => {
    if (!myId || !myRole) return;

    const handleStorageChange = (event: StorageEvent) => {
      const currentRole = myRoleRef.current;
      const currentMyId = myIdRef.current;
      if (!currentRole || !currentMyId) return;

      const partnerIdKey = currentRole === 'user1' ? SESSION_USER2_ID_KEY : SESSION_USER1_ID_KEY;
      const partnerStrokesKey = currentRole === 'user1' ? SESSION_USER2_STROKES_KEY : SESSION_USER1_STROKES_KEY;

      if (event.key === partnerIdKey) {
        if (event.newValue && event.newValue !== currentMyId) {
          setPartnerId(event.newValue);
          setIsConnected(true);
        } else if (!event.newValue) { 
          setIsConnected(false);
          setPartnerId(null);
          setPartnerStrokes([]);
          if (currentRole === 'user2') {
            console.log('User1 left. User2 attempting to become User1.');
            localStorage.removeItem(SESSION_USER2_ID_KEY);
            localStorage.removeItem(SESSION_USER2_STROKES_KEY);
            localStorage.setItem(SESSION_USER1_ID_KEY, currentMyId);
            setMyRole('user1'); 
          }
        }
      } else if (event.key === SESSION_USER1_ID_KEY && currentRole === 'user2') {
          if(event.newValue && event.newValue !== partnerId) {
            setPartnerId(event.newValue);
            setIsConnected(true);
          }
      } else if (event.key === partnerStrokesKey) {
        if (event.newValue) {
          try {
            const newPartnerStrokes = JSON.parse(event.newValue) as Stroke[];
            setPartnerStrokes(Array.isArray(newPartnerStrokes) ? newPartnerStrokes : []);
          } catch (e) { setPartnerStrokes([]); }
        } else {
          setPartnerStrokes([]);
        }
      } else if (event.key === CLEAR_CANVAS_KEY) {
        if (event.newValue) {
          try {
            const clearEventData = JSON.parse(event.newValue);
            if (clearEventData.clearedBy !== currentMyId) { 
              console.log('Received clear canvas event from partner.');
              setLocalStrokes([]);
              setPartnerStrokes([]); 
            }
          } catch(e) { console.error("Error parsing clear canvas event", e); }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [myId, myRole, partnerId]);

  useEffect(() => {
    const cleanup = () => {
      const role = myRoleRef.current;
      const id = myIdRef.current;
      if (!id) return;
      if (role === 'user1' && localStorage.getItem(SESSION_USER1_ID_KEY) === id) {
        localStorage.removeItem(SESSION_USER1_ID_KEY);
        localStorage.removeItem(SESSION_USER1_STROKES_KEY);
      } else if (role === 'user2' && localStorage.getItem(SESSION_USER2_ID_KEY) === id) {
        localStorage.removeItem(SESSION_USER2_ID_KEY);
        localStorage.removeItem(SESSION_USER2_STROKES_KEY);
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
    if ('button' in event && event.button !== 0) return; 
    const pos = getPointerPosition(event);
    if (!pos) return;

    setIsDrawing(true);
    setCurrentDrawingPath([pos]);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const pos = getPointerPosition(event);
    if (!pos) return;
    
    setCurrentDrawingPath(prev => [...prev, pos]);
     if ('touches' in event && event.cancelable) { 
        event.preventDefault(); 
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentDrawingPath.length > 1) {
      const newStroke: Stroke = {
        path: currentDrawingPath,
        color: (currentTool === 'pen' || currentTool === 'gravityPen') ? currentColor : ERASER_COLOR,
        strokeWidth: currentStrokeWidth,
        tool: currentTool,
        creationTime: (currentTool === 'gravityPen' || isPulsingBrush) ? Date.now() : undefined,
        isPulsating: isPulsingBrush ? true : undefined,
      };
      setLocalStrokes(prev => [...prev, newStroke]);
    }
    setCurrentDrawingPath([]);
  };
  
  const clearCanvas = () => {
    setLocalStrokes([]);
    setPartnerStrokes([]); 
    if (myId) {
      localStorage.setItem(CLEAR_CANVAS_KEY, JSON.stringify({ clearedBy: myId, timestamp: Date.now() }));
    }
  };

  const redrawCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _localStrokes: Stroke[],
    _partnerStrokes: Stroke[],
    _currentPath: Position[],
    _isDrawing: boolean,
    _drawingColor: string,
    _strokeWidth: number,
    _tool: DrawingTool,
    _blendMode: BlendMode
  ) => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = _blendMode;

    const allStrokes = [..._partnerStrokes, ..._localStrokes];
    allStrokes.sort((a, b) => (a.creationTime || 0) - (b.creationTime || 0));


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

    allStrokes.forEach(s => drawSingleStroke(s));

    if (_isDrawing && _currentPath.length > 0) {
      const currentEffectiveTool = _tool; 
      const currentEffectiveColor = (currentEffectiveTool === 'pen' || currentEffectiveTool === 'gravityPen') ? _drawingColor : ERASER_COLOR;
       drawSingleStroke({
          path: _currentPath,
          color: currentEffectiveColor,
          strokeWidth: _strokeWidth,
          tool: currentEffectiveTool, 
          isPulsating: isPulsingBrush, 
          creationTime: (currentEffectiveTool === 'gravityPen' || isPulsingBrush) ? Date.now() : undefined 
      }, true);
    }
  }, [isPulsingBrush]); 

  useEffect(() => {
    const hasAnimated =
      localStrokes.some(s => s.tool === 'gravityPen' || s.isPulsating) ||
      partnerStrokes.some(s => s.tool === 'gravityPen' || s.isPulsating);
    setAnimatedStrokesExist(hasAnimated);
  }, [localStrokes, partnerStrokes]);


  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (animatedStrokesExist) {
      let animationFrameId: number;
      const animate = () => {
        redrawCanvas(
            ctx, canvas.width, canvas.height,
            localStrokes, partnerStrokes,
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
        localStrokes, partnerStrokes,
        currentDrawingPath, isDrawing,
        currentColor,
        currentStrokeWidth, currentTool,
        blendMode
      );
    }
  }, [
    localStrokes, partnerStrokes, currentDrawingPath, isDrawing,
    currentColor, currentStrokeWidth, currentTool, blendMode,
    animatedStrokesExist, redrawCanvas, canvasRef, toolbarHeight 
  ]);


  const getCursorStyle = () => {
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
        userAssignedColor={userAssignedColor}
        isPulsingBrush={isPulsingBrush}
        setIsPulsingBrush={setIsPulsingBrush}
        blendMode={blendMode}
        setBlendMode={setBlendMode}
      />
      <div
        ref={drawingAreaRef}
        className="flex-grow relative bg-white" // Drawing area remains white for contrast
        style={{ cursor: getCursorStyle(), height: `calc(100vh - ${toolbarHeight}px)` }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing} 
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        onTouchCancel={endDrawing}
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