
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, UserRole } from './types';
import Pixel from './components/Pixel';
import StatusMessage from './components/StatusMessage';
import {
  SESSION_USER1_ID_KEY,
  SESSION_USER2_ID_KEY,
  SESSION_USER1_POS_KEY,
  SESSION_USER2_POS_KEY,
} from './constants/localStorageKeys';

const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const App: React.FC = () => {
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerPixelPosition, setPartnerPixelPosition] = useState<Position>({ x: -1, y: -1 });
  // myMousePosition is not strictly needed in state for rendering, but useful for debugging
  // const [myMousePosition, setMyMousePosition] = useState<Position>({ x: -1, y: -1 }); 
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const myIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<UserRole>(null);
  
  useEffect(() => {
    myIdRef.current = myId;
    myRoleRef.current = myRole;
  }, [myId, myRole]);


  // Initialize: Generate ID, attempt to join/host session
  useEffect(() => {
    const currentId = generateUniqueId();
    setMyId(currentId);
    myIdRef.current = currentId;

    const user1IdFromStorage = localStorage.getItem(SESSION_USER1_ID_KEY);
    const user2IdFromStorage = localStorage.getItem(SESSION_USER2_ID_KEY);

    if (!user1IdFromStorage) {
      localStorage.setItem(SESSION_USER1_ID_KEY, currentId);
      setMyRole('user1');
      myRoleRef.current = 'user1';
      setStatusMessage('Waiting for another person...');
    } else if (!user2IdFromStorage) {
      if (user1IdFromStorage === currentId) { // Should not happen with unique IDs
        setStatusMessage('Error: ID conflict. Please refresh.');
        return;
      }
      localStorage.setItem(SESSION_USER2_ID_KEY, currentId);
      setMyRole('user2');
      myRoleRef.current = 'user2';
      setPartnerId(user1IdFromStorage);
      setStatusMessage('Connecting...'); // Will update to connected via storage event or direct check
      setIsConnected(true);
    } else {
      // Both slots taken. Check if one of them is me from a previous session (less likely with random IDs on each load)
      // For simplicity, treat as full.
       if (user1IdFromStorage === currentId) {
        setMyRole('user1');
        myRoleRef.current = 'user1';
        if(user2IdFromStorage){
            setPartnerId(user2IdFromStorage);
            setIsConnected(true);
        } else {
            setStatusMessage('Waiting for another person...');
        }
       } else if (user2IdFromStorage === currentId) {
        setMyRole('user2');
        myRoleRef.current = 'user2';
        setPartnerId(user1IdFromStorage);
        setIsConnected(true);
       } else {
        setStatusMessage('Session is full. Please try again later or close other tabs.');
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update status message when connected
  useEffect(() => {
    if (isConnected && partnerId) {
      setStatusMessage("You are connected to another person. You cannot speak. You cannot chat. You can only see their pixel.");
    } else if (myRole === 'user1' && !partnerId) {
      setStatusMessage('Waiting for another person...');
    }
  }, [isConnected, partnerId, myRole]);

  // Mouse movement tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const newPosition = { x: event.clientX, y: event.clientY };
      // setMyMousePosition(newPosition); // Update own mouse position state if needed for UI

      const role = myRoleRef.current; // Use ref for current role
      if (role === 'user1') {
        localStorage.setItem(SESSION_USER1_POS_KEY, JSON.stringify(newPosition));
      } else if (role === 'user2') {
        localStorage.setItem(SESSION_USER2_POS_KEY, JSON.stringify(newPosition));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []); // No dependencies, relies on refs for role

  // localStorage event listener for inter-tab communication
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      const currentMyId = myIdRef.current;
      const currentMyRole = myRoleRef.current;

      if (!currentMyId || !currentMyRole) return;

      if (event.key === SESSION_USER1_ID_KEY) {
        if (currentMyRole === 'user2' && !event.newValue) { // User1 left
          setIsConnected(false);
          setPartnerId(null);
          setStatusMessage('Partner disconnected. Attempting to become host...');
          // Try to become user1
          localStorage.removeItem(SESSION_USER2_ID_KEY); // Clear my old user2 slot
          localStorage.removeItem(SESSION_USER2_POS_KEY);
          localStorage.setItem(SESSION_USER1_ID_KEY, currentMyId);
          setMyRole('user1');
          myRoleRef.current = 'user1';
          setPartnerPixelPosition({ x: -1, y: -1 });
        }
      } else if (event.key === SESSION_USER2_ID_KEY) {
        if (currentMyRole === 'user1') {
          if (event.newValue) {
            setPartnerId(event.newValue);
            setIsConnected(true);
          } else { // User2 left
            setIsConnected(false);
            setPartnerId(null);
            setStatusMessage('Partner disconnected. Waiting for a new person...');
            setPartnerPixelPosition({ x: -1, y: -1 });
            localStorage.removeItem(SESSION_USER2_POS_KEY); // Clean up partner's pos
          }
        }
      } else if (event.key === SESSION_USER1_POS_KEY && currentMyRole === 'user2') {
        if (event.newValue) {
          try {
            const pos = JSON.parse(event.newValue);
            setPartnerPixelPosition(pos);
          } catch (e) { console.error("Error parsing user1 position", e); }
        }
      } else if (event.key === SESSION_USER2_POS_KEY && currentMyRole === 'user1') {
         if (event.newValue) {
          try {
            const pos = JSON.parse(event.newValue);
            setPartnerPixelPosition(pos);
          } catch (e) { console.error("Error parsing user2 position", e); }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // No dependencies, relies on refs

  // Cleanup on unmount/beforeunload
  useEffect(() => {
    const cleanup = () => {
      const role = myRoleRef.current;
      const id = myIdRef.current;

      if (role === 'user1') {
        // If I am user1, I clear the whole session potentially
        // Check if I am still the user1 in localStorage to prevent race conditions on close
        if (localStorage.getItem(SESSION_USER1_ID_KEY) === id) {
          localStorage.removeItem(SESSION_USER1_ID_KEY);
          localStorage.removeItem(SESSION_USER1_POS_KEY);
          localStorage.removeItem(SESSION_USER2_ID_KEY); // Also clear user2 slot
          localStorage.removeItem(SESSION_USER2_POS_KEY);
        }
      } else if (role === 'user2') {
        if (localStorage.getItem(SESSION_USER2_ID_KEY) === id) {
          localStorage.removeItem(SESSION_USER2_ID_KEY);
          localStorage.removeItem(SESSION_USER2_POS_KEY);
        }
      }
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      // Optional: run cleanup if component unmounts for other reasons (e.g. navigation in SPA, not applicable here)
      // cleanup(); 
    };
  }, []); // No dependencies, relies on refs

  return (
    <div className="relative h-screen w-screen bg-white cursor-none">
      <StatusMessage message={statusMessage} />
      {isConnected && <Pixel position={partnerPixelPosition} color="bg-blue-500" />}
    </div>
  );
};

export default App;
