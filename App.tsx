
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
    setMyId(currentId); // State update will trigger ref update via separate effect

    const user1IdFromStorage = localStorage.getItem(SESSION_USER1_ID_KEY);
    const user2IdFromStorage = localStorage.getItem(SESSION_USER2_ID_KEY);

    console.log(`[App Init] currentId: ${currentId}, user1Store: ${user1IdFromStorage}, user2Store: ${user2IdFromStorage}`);

    if (!user1IdFromStorage) {
      localStorage.setItem(SESSION_USER1_ID_KEY, currentId);
      setMyRole('user1');
      setStatusMessage('Waiting for another person...');
      console.log(`[App Init] Became user1. ID: ${currentId}`);
    } else if (!user2IdFromStorage) {
      if (user1IdFromStorage === currentId) { 
        setStatusMessage('Error: ID conflict. Please refresh.');
        console.error(`[App Init] ID conflict as user2. currentId: ${currentId}`);
        return;
      }
      localStorage.setItem(SESSION_USER2_ID_KEY, currentId);
      setMyRole('user2');
      setPartnerId(user1IdFromStorage);
      // setIsConnected will be true, status message will update via its own effect
      console.log(`[App Init] Became user2. ID: ${currentId}, Partner: ${user1IdFromStorage}`);
      setIsConnected(true); // Explicitly set connected
    } else {
      // Both slots taken.
       if (user1IdFromStorage === currentId) { // Highly unlikely with fresh random IDs
        setMyRole('user1');
        if(user2IdFromStorage){
            setPartnerId(user2IdFromStorage);
            setIsConnected(true);
            console.log(`[App Init] Rejoined as user1. ID: ${currentId}, Partner: ${user2IdFromStorage}`);
        } else {
            setStatusMessage('Waiting for another person...');
            console.log(`[App Init] Rejoined as user1 (no user2 yet). ID: ${currentId}`);
        }
       } else if (user2IdFromStorage === currentId) { // Highly unlikely
        setMyRole('user2');
        setPartnerId(user1IdFromStorage);
        setIsConnected(true);
        console.log(`[App Init] Rejoined as user2. ID: ${currentId}, Partner: ${user1IdFromStorage}`);
       } else {
        setStatusMessage('Session is full. Please try again later or close other tabs.');
        console.log(`[App Init] Session full. My ID: ${currentId}, User1: ${user1IdFromStorage}, User2: ${user2IdFromStorage}`);
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This effect should run once on mount to establish initial role.

  // Update status message based on connection state
  useEffect(() => {
    if (isConnected && partnerId) {
      setStatusMessage("You are connected to another person. You cannot speak. You cannot chat. You can only see their pixel.");
      console.log(`[App Status] Connected. Role: ${myRole}, Partner: ${partnerId}`);
    } else if (myRole === 'user1' && !partnerId) {
      setStatusMessage('Waiting for another person...');
      console.log(`[App Status] Waiting (user1, no partner). Role: ${myRole}`);
    } else if (myRole === 'user2' && !partnerId) {
      // This case handles if user2's partner (user1) disconnects and user2 becomes user1.
      // The role change to 'user1' would then trigger the above condition.
      // Or if user2 initialized but partnerId somehow wasn't set or cleared.
      setStatusMessage('Error: Connection lost or invalid state. Please refresh.');
      console.log(`[App Status] User2 but no partnerId. Role: ${myRole}`);
    }
  }, [isConnected, partnerId, myRole]);

  // Mouse movement tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const newPosition = { x: event.clientX, y: event.clientY };
      const role = myRoleRef.current; // Use ref for current role, stable listener
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
  }, []); // No dependencies, relies on myRoleRef being updated by its own effect.

  // localStorage event listener for inter-tab communication
  useEffect(() => {
    // Only attach listener if myId and myRole are established
    if (!myId || !myRole) {
      console.log(`[App StorageEffect] Listener not attached yet (myId: ${myId}, myRole: ${myRole})`);
      return;
    }

    console.log(`[App StorageEffect] Attaching listener. MyId: ${myId}, MyRole: ${myRole}`);

    const handleStorageChange = (event: StorageEvent) => {
      console.log(`[App StorageChange] Event: key=${event.key}, newValue=${event.newValue}, myId=${myId}, myRole=${myRole}`);

      // myId and myRole from the closure are guaranteed to be set here
      // because the effect won't run to add this listener otherwise.

      if (event.key === SESSION_USER1_ID_KEY) {
        if (myRole === 'user2') {
          if (!event.newValue) { // User1 left
            console.log('[App StorageChange] User1 left. I am User2, attempting to become User1.');
            setIsConnected(false);
            setPartnerId(null);
            setStatusMessage('Partner disconnected. Attempting to become host...');
            
            localStorage.removeItem(SESSION_USER2_ID_KEY); 
            localStorage.removeItem(SESSION_USER2_POS_KEY);
            localStorage.setItem(SESSION_USER1_ID_KEY, myId); // Use myId from closure
            setMyRole('user1'); // This will trigger ref update and status message update
            setPartnerPixelPosition({ x: -1, y: -1 });
          } else {
            // User1 ID changed, but I'm user2. This might mean the original user1 refreshed.
            // My partnerId should update if it's different.
            if (partnerId !== event.newValue) {
                console.log(`[App StorageChange] User1 ID changed. I am User2, updating partnerId from ${partnerId} to ${event.newValue}`);
                setPartnerId(event.newValue);
                // isConnected should already be true if I was connected to the old user1.
                // If not, this means a new user1 appeared and I should connect.
                if (!isConnected) setIsConnected(true);
            }
          }
        }
      } else if (event.key === SESSION_USER2_ID_KEY) {
        if (myRole === 'user1') {
          if (event.newValue) { // User2 joined or changed
            console.log(`[App StorageChange] User2 joined/changed: ${event.newValue}. I am User1.`);
            setPartnerId(event.newValue);
            setIsConnected(true);
          } else { // User2 left
            console.log('[App StorageChange] User2 left. I am User1.');
            setIsConnected(false);
            setPartnerId(null);
            // Status message will update via its own effect
            setPartnerPixelPosition({ x: -1, y: -1 });
            localStorage.removeItem(SESSION_USER2_POS_KEY); 
          }
        }
      } else if (event.key === SESSION_USER1_POS_KEY && myRole === 'user2') {
        if (event.newValue) {
          try {
            const pos = JSON.parse(event.newValue);
            setPartnerPixelPosition(pos);
          } catch (e) { console.error("[App StorageChange] Error parsing user1 position", e); }
        }
      } else if (event.key === SESSION_USER2_POS_KEY && myRole === 'user1') {
         if (event.newValue) {
          try {
            const pos = JSON.parse(event.newValue);
            setPartnerPixelPosition(pos);
          } catch (e) { console.error("[App StorageChange] Error parsing user2 position", e); }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      console.log(`[App StorageEffect] Removing listener. MyId: ${myId}, MyRole: ${myRole}`);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [myId, myRole, partnerId, isConnected]); // Added partnerId and isConnected to re-evaluate if user1's partnerId needs update when user1_id changes.

  // Cleanup on unmount/beforeunload
  useEffect(() => {
    const cleanup = () => {
      // Use refs here as they are stable for the cleanup function definition
      const role = myRoleRef.current;
      const id = myIdRef.current;
      console.log(`[App Cleanup] Running cleanup. Role: ${role}, ID: ${id}`);

      if (!id) return; // Should not happen if initialized

      if (role === 'user1') {
        if (localStorage.getItem(SESSION_USER1_ID_KEY) === id) {
          console.log('[App Cleanup] I am User1, clearing session data.');
          localStorage.removeItem(SESSION_USER1_ID_KEY);
          localStorage.removeItem(SESSION_USER1_POS_KEY);
          localStorage.removeItem(SESSION_USER2_ID_KEY); 
          localStorage.removeItem(SESSION_USER2_POS_KEY);
        }
      } else if (role === 'user2') {
        if (localStorage.getItem(SESSION_USER2_ID_KEY) === id) {
          console.log('[App Cleanup] I am User2, clearing my data.');
          localStorage.removeItem(SESSION_USER2_ID_KEY);
          localStorage.removeItem(SESSION_USER2_POS_KEY);
        }
      }
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      // Considered running cleanup() here too, but 'beforeunload' is the primary mechanism.
      // If the component unmounts unexpectedly (e.g. error boundary), state might be inconsistent.
      // For this app, beforeunload should suffice.
    };
  }, []); // No dependencies, relies on refs which are updated by their own effect.

  return (
    <div className="relative h-screen w-screen bg-white cursor-none overflow-hidden">
      <StatusMessage message={statusMessage} />
      {isConnected && partnerId && <Pixel position={partnerPixelPosition} color="bg-blue-500" />}
    </div>
  );
};

export default App;
