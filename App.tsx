import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, UserRole, Stroke } from './types';
import StatusMessage from './components/StatusMessage';
import {
  SESSION_USER1_ID_KEY,
  SESSION_USER2_ID_KEY,
  SESSION_USER1_STROKES_KEY,
  SESSION_USER2_STROKES_KEY,
} from './constants/localStorageKeys';

const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const USER1_COLOR = 'rgba(236, 72, 153, 1)'; // Pink
const USER2_COLOR = 'rgba(34, 211, 238, 1)';  // Cyan
const STROKE_WIDTH = 4;


const App: React.FC = () => {
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const myIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<UserRole>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDrawingPath, setCurrentDrawingPath] = useState<Position[]>([]);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [partnerStrokes, setPartnerStrokes] = useState<Stroke[]>([]);
  
  const [myDrawColor, setMyDrawColor] = useState<string>(USER1_COLOR);


  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    myRoleRef.current = myRole;
    if (myRole === 'user1') {
      setMyDrawColor(USER1_COLOR);
    } else if (myRole === 'user2') {
      setMyDrawColor(USER2_COLOR);
    }
  }, [myRole]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas dimensions once on mount
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  // Role assignment and initial connection logic
  useEffect(() => {
    const currentId = generateUniqueId();
    setMyId(currentId); 

    const user1IdFromStorage = localStorage.getItem(SESSION_USER1_ID_KEY);
    const user2IdFromStorage = localStorage.getItem(SESSION_USER2_ID_KEY);

    console.log(`[App Init] currentId: ${currentId}, user1Store: ${user1IdFromStorage}, user2Store: ${user2IdFromStorage}`);

    let assignedRole: UserRole = null;

    if (!user1IdFromStorage) {
      localStorage.setItem(SESSION_USER1_ID_KEY, currentId);
      assignedRole = 'user1';
    } else if (!user2IdFromStorage) {
      if (user1IdFromStorage === currentId) { 
        setStatusMessage('Error: ID conflict. Please refresh.');
        return;
      }
      localStorage.setItem(SESSION_USER2_ID_KEY, currentId);
      assignedRole = 'user2';
      setPartnerId(user1IdFromStorage);
      setIsConnected(true); 
    } else {
       if (user1IdFromStorage === currentId) { 
        assignedRole = 'user1';
        if(user2IdFromStorage){
            setPartnerId(user2IdFromStorage);
            setIsConnected(true);
        }
       } else if (user2IdFromStorage === currentId) { 
        assignedRole = 'user2';
        setPartnerId(user1IdFromStorage);
        setIsConnected(true);
       } else {
        setStatusMessage('Session is full. Please try again later or close other tabs.');
        // Potentially clear own ID if one was tentatively set
       }
    }
    
    if (assignedRole) {
      setMyRole(assignedRole);
      // Trigger initial save of (empty) local strokes once role is set
      // This will be handled by the useEffect watching [localStrokes, myRole, myId]
    }

  }, []);

  // Update status message based on connection state
  useEffect(() => {
    if (isConnected && partnerId) {
      setStatusMessage("You are connected. Let's draw together!");
      console.log(`[App Status] Connected. Role: ${myRole}, Partner: ${partnerId}`);
    } else if (myRole === 'user1' && !partnerId) {
      setStatusMessage('Waiting for another person to connect...');
      console.log(`[App Status] Waiting (user1, no partner). Role: ${myRole}`);
    } else if (myRole === 'user2' && !partnerId && !isConnected) { 
        setStatusMessage('Partner disconnected. Waiting or attempting to reconnect role...');
        console.log(`[App Status] User2 but no partnerId and not connected. Role: ${myRole}`);
    } else if (!myId || !myRole) {
        setStatusMessage('Initializing...');
    }
  }, [isConnected, partnerId, myRole, myId]);


  // Persist localStrokes to localStorage
  useEffect(() => {
    if (myRole && myId) {
      const key = myRole === 'user1' ? SESSION_USER1_STROKES_KEY : SESSION_USER2_STROKES_KEY;
      try {
        console.log(`[App MyStrokes Sync] Saving ${localStrokes.length} strokes to ${key}`);
        localStorage.setItem(key, JSON.stringify(localStrokes));
      } catch (e) {
        console.error("[App MyStrokes Sync] Error stringifying or setting localStrokes in localStorage", e);
      }
    }
  }, [localStrokes, myRole, myId]); // Runs when localStrokes, myRole, or myId changes

  // Load partner's strokes on connection or when partner changes
  useEffect(() => {
    if (isConnected && partnerId && myRole) {
      const partnerStrokesKey = myRole === 'user1' ? SESSION_USER2_STROKES_KEY : SESSION_USER1_STROKES_KEY;
      const storedPartnerStrokes = localStorage.getItem(partnerStrokesKey);
      if (storedPartnerStrokes) {
        try {
          const parsedStrokes = JSON.parse(storedPartnerStrokes) as Stroke[];
          if (Array.isArray(parsedStrokes)) {
            setPartnerStrokes(parsedStrokes);
            console.log(`[App PartnerStrokes Load] Loaded ${parsedStrokes.length} strokes for partner ${partnerId}`);
          }
        } catch (e) {
          console.error("[App PartnerStrokes Load] Error parsing partner strokes", e);
          setPartnerStrokes([]);
        }
      } else {
         // Partner might not have drawn anything yet, or key was cleared
         setPartnerStrokes([]);
      }
       // Ensure local strokes are broadcasted in case partner joined after us.
       // The useEffect watching localStrokes should handle this, but an explicit call might be
       // considered if issues arise. For now, rely on the existing useEffect.
    }
  }, [isConnected, partnerId, myRole]);


  // localStorage event listener
  useEffect(() => {
    if (!myId || !myRole) {
      console.log(`[App StorageEffect] Listener not attached yet (myId: ${myId}, myRole: ${myRole})`);
      return;
    }
    console.log(`[App StorageEffect] Attaching listener. MyId: ${myId}, MyRole: ${myRoleRef.current}`);

    const handleStorageChange = (event: StorageEvent) => {
      console.log(`[App StorageChange] Event: key=${event.key}, myRole=${myRoleRef.current}`);
      const currentRole = myRoleRef.current; // Use ref for current role in handler closure
      const currentMyId = myIdRef.current;

      if (!currentRole || !currentMyId) return;

      const partnerStrokesKey = currentRole === 'user1' ? SESSION_USER2_STROKES_KEY : SESSION_USER1_STROKES_KEY;
      const myStrokesKey = currentRole === 'user1' ? SESSION_USER1_STROKES_KEY : SESSION_USER2_STROKES_KEY;
      
      if (event.key === SESSION_USER1_ID_KEY) {
        if (currentRole === 'user2') {
          if (!event.newValue) { // User1 left
            console.log('[App StorageChange] User1 left. I am User2, attempting to become User1.');
            setIsConnected(false);
            setPartnerId(null);
            setPartnerStrokes([]); 
            
            localStorage.removeItem(SESSION_USER2_ID_KEY); 
            localStorage.removeItem(SESSION_USER2_STROKES_KEY);
            if(currentMyId) localStorage.setItem(SESSION_USER1_ID_KEY, currentMyId); 
            setMyRole('user1'); 
            // setLocalStrokes([]); // User 2's strokes become User 1's strokes
          } else { 
             if (partnerId !== event.newValue) {
                setPartnerId(event.newValue);
             }
             if (!isConnected) setIsConnected(true);
          }
        }
      } else if (event.key === SESSION_USER2_ID_KEY) {
        if (currentRole === 'user1') {
          if (event.newValue && event.newValue !== currentMyId) {
            console.log(`[App StorageChange] User2 joined/changed: ${event.newValue}. I am User1.`);
            setPartnerId(event.newValue);
            setIsConnected(true);
          } else if (!event.newValue) { // User2 left
            console.log('[App StorageChange] User2 left. I am User1.');
            setIsConnected(false);
            setPartnerId(null);
            setPartnerStrokes([]);
            localStorage.removeItem(SESSION_USER2_STROKES_KEY); 
          }
        }
      } else if (event.key === partnerStrokesKey) {
        if (event.newValue) {
          try {
            const newPartnerStrokes = JSON.parse(event.newValue) as Stroke[];
            if (Array.isArray(newPartnerStrokes)) {
              setPartnerStrokes(newPartnerStrokes);
              console.log(`[App StorageChange] Received ${newPartnerStrokes.length} strokes from partner.`);
            } else { setPartnerStrokes([]); }
          } catch (e) { console.error("[App StorageChange] Error parsing partner strokes", e); setPartnerStrokes([]); }
        } else {
          setPartnerStrokes([]); // Partner cleared their strokes or left
          console.log(`[App StorageChange] Partner strokes cleared or partner left (key: ${partnerStrokesKey}).`);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      console.log(`[App StorageEffect] Removing listener. MyId: ${myIdRef.current}, MyRole: ${myRoleRef.current}`);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [myId, myRole]); // Re-attach if myId or myRole changes (e.g., user2 becomes user1)

  // Cleanup on unload
  useEffect(() => {
    const cleanup = () => {
      const role = myRoleRef.current;
      const id = myIdRef.current;
      console.log(`[App Cleanup] Running cleanup. Role: ${role}, ID: ${id}`);

      if (!id) return; 

      if (role === 'user1' && localStorage.getItem(SESSION_USER1_ID_KEY) === id) {
          console.log('[App Cleanup] I am User1, clearing all session data.');
          localStorage.removeItem(SESSION_USER1_ID_KEY);
          localStorage.removeItem(SESSION_USER1_STROKES_KEY);
          localStorage.removeItem(SESSION_USER2_ID_KEY); 
          localStorage.removeItem(SESSION_USER2_STROKES_KEY);
      } else if (role === 'user2' && localStorage.getItem(SESSION_USER2_ID_KEY) === id) {
          console.log('[App Cleanup] I am User2, clearing my data.');
          localStorage.removeItem(SESSION_USER2_ID_KEY);
          localStorage.removeItem(SESSION_USER2_STROKES_KEY);
      }
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup(); 
    };
  }, []); 

  // Drawing logic
  const getMousePosition = (event: React.MouseEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only main click
    setIsDrawing(true);
    const pos = getMousePosition(event);
    setCurrentDrawingPath([pos]);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getMousePosition(event);
    setCurrentDrawingPath(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentDrawingPath.length > 1) { // Save if it's more than a dot
      setLocalStrokes(prev => [...prev, { path: currentDrawingPath, color: myDrawColor }]);
    }
    setCurrentDrawingPath([]);
  };
  
  const handleMouseLeave = () => {
    if (isDrawing) { // If mouse leaves canvas while drawing, end the stroke
        handleMouseUp();
    }
  }

  // Canvas rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Function to draw a single stroke
    const drawStroke = (stroke: Stroke) => {
      if (stroke.path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
      for (let i = 1; i < stroke.path.length; i++) {
        ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    // Draw all partner strokes
    partnerStrokes.forEach(drawStroke);
    
    // Draw all local completed strokes
    localStrokes.forEach(drawStroke);

    // Draw current path being drawn by local user
    if (isDrawing && currentDrawingPath.length > 0) {
      drawStroke({ path: currentDrawingPath, color: myDrawColor });
    }

  }, [localStrokes, partnerStrokes, currentDrawingPath, isDrawing, myDrawColor]);

  return (
    <div 
      className="relative h-screen w-screen bg-white overflow-hidden cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave} // End drawing if mouse leaves container
      aria-label="Shared drawing canvas"
      role="application"
    >
      <StatusMessage message={statusMessage} />
      <canvas ref={canvasRef} id="drawingCanvas" className="block" />
      {/* The canvas itself doesn't need mouse handlers if the parent div handles them */}
    </div>
  );
};

export default App;