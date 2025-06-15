import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, UserRole, Stroke, DrawingTool } from './types';
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
const ERASER_COLOR = '#FFFFFF'; // Canvas background color, effectively "erasing"
const DEFAULT_STROKE_WIDTH = 4;


const App: React.FC = () => {
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const myIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<UserRole>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingAreaRef = useRef<HTMLDivElement>(null); // For canvas size
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(60); // Initial estimate

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDrawingPath, setCurrentDrawingPath] = useState<Position[]>([]);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [partnerStrokes, setPartnerStrokes] = useState<Stroke[]>([]);
  
  const [userAssignedColor, setUserAssignedColor] = useState<string>(USER1_COLOR);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>(userAssignedColor);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);

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
    // If current tool is pen and current color is one of the base user colors (or default initial), update it.
    // This avoids overriding a user's palette choice unless their role just changed the base.
    if (currentTool === 'pen' && (currentColor === USER1_COLOR || currentColor === USER2_COLOR)) {
      setCurrentColor(newAssignedColor);
    }
  }, [myRole, currentTool, currentColor]); // currentColor added to re-evaluate if user changes it then role changes

  // Toolbar height calculation
   useEffect(() => {
    const calculateToolbarHeight = () => {
      if (toolbarRef.current) {
        setToolbarHeight(toolbarRef.current.offsetHeight);
      }
    };
    calculateToolbarHeight(); // Initial calculation
    window.addEventListener('resize', calculateToolbarHeight); // Recalculate on resize
    return () => window.removeEventListener('resize', calculateToolbarHeight);
  }, []);


  // Canvas setup and resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    const drawingArea = drawingAreaRef.current;
    if (canvas && drawingArea) {
      canvas.width = drawingArea.clientWidth;
      canvas.height = drawingArea.clientHeight;
      // Redrawing will be handled by the main drawing effect due to dependency changes or explicit calls
      // Force a redraw if canvas dimensions change, as it clears the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        redrawCanvas(ctx, canvas.width, canvas.height, localStrokes, partnerStrokes, currentDrawingPath, isDrawing, currentTool === 'pen' ? currentColor : ERASER_COLOR, currentStrokeWidth, currentTool);
      }
    }
  }, [toolbarHeight, localStrokes, partnerStrokes, currentDrawingPath, isDrawing, currentColor, currentStrokeWidth, currentTool]); // Dependencies that might require resize/redraw

  // Role assignment and initial connection logic (simplified)
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
      setPartnerId(user1Id); // Should always be user1Id
      setIsConnected(true);
    } else {
      setStatusMessage('Session is full. Please try again later.');
    }
    
    if (assignedRole) {
      setMyRole(assignedRole);
    }
  }, []);

  // Update status message
  useEffect(() => {
    if (isConnected && partnerId) {
      setStatusMessage("Connected. Let's draw together!");
    } else if (myRole === 'user1' && !partnerId) {
      setStatusMessage('Waiting for a partner to connect...');
    } else if (myRole === 'user2' && !partnerId && !isConnected) {
      setStatusMessage('Partner disconnected. Waiting...');
    } else if (!myId || !myRole) {
      setStatusMessage('Initializing...');
    }
  }, [isConnected, partnerId, myRole, myId]);

  // Persist localStrokes
  useEffect(() => {
    if (myRole && myId) {
      const key = myRole === 'user1' ? SESSION_USER1_STROKES_KEY : SESSION_USER2_STROKES_KEY;
      localStorage.setItem(key, JSON.stringify(localStrokes));
    }
  }, [localStrokes, myRole, myId]);

  // Load partner's strokes
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

  // localStorage event listener
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
        } else if (!event.newValue) { // Partner left
          setIsConnected(false);
          setPartnerId(null);
          setPartnerStrokes([]);
          // If I am user2 and user1 leaves, I attempt to become user1.
          if (currentRole === 'user2') {
            console.log('User1 left. User2 attempting to become User1.');
            localStorage.removeItem(SESSION_USER2_ID_KEY);
            localStorage.removeItem(SESSION_USER2_STROKES_KEY); // Clear my old user2 strokes
            localStorage.setItem(SESSION_USER1_ID_KEY, currentMyId);
            setMyRole('user1');
            // localStrokes remain, they are now user1's strokes
          }
        }
      } else if (event.key === SESSION_USER1_ID_KEY && currentRole === 'user2') { // Special case if User1 changes ID (e.g. they refreshed and I didn't)
          if(event.newValue && event.newValue !== partnerId) {
            setPartnerId(event.newValue);
            setIsConnected(true);
          } else if (!event.newValue) { // User1 truly left
             // This case is handled by partnerIdKey check above if newValue is null.
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
            if (clearEventData.clearedBy !== currentMyId) { // Check if not self-initiated
              console.log('Received clear canvas event from partner.');
              setLocalStrokes([]);
              setPartnerStrokes([]); // Partner's strokes would also be empty due to their own clear
            }
          } catch(e) { console.error("Error parsing clear canvas event", e); }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [myId, myRole, partnerId]); // partnerId added for re-evaluating listener context

  // Cleanup on unload
  useEffect(() => {
    const cleanup = () => {
      const role = myRoleRef.current;
      const id = myIdRef.current;
      if (!id) return;
      if (role === 'user1' && localStorage.getItem(SESSION_USER1_ID_KEY) === id) {
        localStorage.removeItem(SESSION_USER1_ID_KEY);
        localStorage.removeItem(SESSION_USER1_STROKES_KEY);
        // Potentially signal partner that user1 is leaving by clearing user2's ID if user1 is "session master"
        // localStorage.removeItem(SESSION_USER2_ID_KEY); 
        // localStorage.removeItem(SESSION_USER2_STROKES_KEY);
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

    if ('touches' in event) { // Touch event
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else { // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent<HTMLDivElement>) => {
    if ('button' in event && event.button !== 0) return; // Only main mouse click
    const pos = getPointerPosition(event);
    if (!pos) return;

    setIsDrawing(true);
    setCurrentDrawingPath([pos]);
    if ('touches' in event) { // Prevent scrolling on touch devices while drawing
        // event.preventDefault(); // Might be too aggressive here, consider onMove
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const pos = getPointerPosition(event);
    if (!pos) return;
    
    setCurrentDrawingPath(prev => [...prev, pos]);
     if ('touches' in event && event.cancelable) { 
        event.preventDefault(); // Prevent scrolling while drawing on touch
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentDrawingPath.length > 1) {
      const newStroke: Stroke = {
        path: currentDrawingPath,
        color: currentTool === 'pen' ? currentColor : ERASER_COLOR,
        strokeWidth: currentStrokeWidth,
        tool: currentTool,
      };
      setLocalStrokes(prev => [...prev, newStroke]);
    }
    setCurrentDrawingPath([]);
  };
  
  const clearCanvas = () => {
    setLocalStrokes([]);
    setPartnerStrokes([]); // Clear partner strokes locally for immediate visual feedback
    if (myId) {
      localStorage.setItem(CLEAR_CANVAS_KEY, JSON.stringify({ clearedBy: myId, timestamp: Date.now() }));
    }
     // The useEffect for localStrokes will propagate the empty array to the partner.
  };

  const redrawCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _localStrokes: Stroke[],
    _partnerStrokes: Stroke[],
    _currentPath: Position[],
    _isDrawing: boolean,
    _drawingColor: string,
    _strokeWidth: number,
    _tool: DrawingTool
  ) => {
    ctx.clearRect(0, 0, width, height);

    const drawSingleStroke = (stroke: Stroke) => {
      if (stroke.path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
      for (let i = 1; i < stroke.path.length; i++) {
        ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
      }
      ctx.strokeStyle = stroke.tool === 'pen' ? stroke.color : ERASER_COLOR;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    _partnerStrokes.forEach(drawSingleStroke);
    _localStrokes.forEach(drawSingleStroke);

    if (_isDrawing && _currentPath.length > 0) {
      drawSingleStroke({ path: _currentPath, color: _drawingColor, strokeWidth: _strokeWidth, tool: _tool });
    }
  };

  // Canvas rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    redrawCanvas(ctx, canvas.width, canvas.height, localStrokes, partnerStrokes, currentDrawingPath, isDrawing, currentTool === 'pen' ? currentColor : ERASER_COLOR, currentStrokeWidth, currentTool);

  }, [localStrokes, partnerStrokes, currentDrawingPath, isDrawing, currentColor, currentStrokeWidth, currentTool, userAssignedColor]); // userAssignedColor added as it can influence currentColor

  const getCursorStyle = () => {
    if (currentTool === 'pen') return 'crosshair';
    if (currentTool === 'eraser') return 'cell'; // Or a custom eraser cursor
    return 'default';
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-200 overflow-hidden">
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
      />
      <div
        ref={drawingAreaRef}
        className="flex-grow relative bg-white"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing} // End drawing if mouse leaves container while pressed
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
