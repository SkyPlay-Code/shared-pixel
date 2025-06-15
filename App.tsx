
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, UserRole } from './types';
import Trail from './components/Trail'; // Changed from Pixel to Trail
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

const MAX_TRAIL_LENGTH = 75;
const MY_TRAIL_COLOR_CLASS = "bg-pink-500";
const PARTNER_TRAIL_COLOR_CLASS = "bg-cyan-500";

const App: React.FC = () => {
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  const [myTrail, setMyTrail] = useState<Position[]>([]);
  const [partnerTrail, setPartnerTrail] = useState<Position[]>([]);
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const myIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<UserRole>(null);
  
  useEffect(() => {
    myIdRef.current = myId;
    myRoleRef.current = myRole;
  }, [myId, myRole]);


  useEffect(() => {
    const currentId = generateUniqueId();
    setMyId(currentId); 

    const user1IdFromStorage = localStorage.getItem(SESSION_USER1_ID_KEY);
    const user2IdFromStorage = localStorage.getItem(SESSION_USER2_ID_KEY);

    console.log(`[App Init] currentId: ${currentId}, user1Store: ${user1IdFromStorage}, user2Store: ${user2IdFromStorage}`);

    if (!user1IdFromStorage) {
      localStorage.setItem(SESSION_USER1_ID_KEY, currentId);
      setMyRole('user1');
      // Status message set by later effect
    } else if (!user2IdFromStorage) {
      if (user1IdFromStorage === currentId) { 
        setStatusMessage('Error: ID conflict. Please refresh.');
        console.error(`[App Init] ID conflict as user2. currentId: ${currentId}`);
        return;
      }
      localStorage.setItem(SESSION_USER2_ID_KEY, currentId);
      setMyRole('user2');
      setPartnerId(user1IdFromStorage);
      setIsConnected(true); 
    } else {
       if (user1IdFromStorage === currentId) { 
        setMyRole('user1');
        if(user2IdFromStorage){
            setPartnerId(user2IdFromStorage);
            setIsConnected(true);
        }
       } else if (user2IdFromStorage === currentId) { 
        setMyRole('user2');
        setPartnerId(user1IdFromStorage);
        setIsConnected(true);
       } else {
        setStatusMessage('Session is full. Please try again later or close other tabs.');
       }
    }
  }, []);

  useEffect(() => {
    if (isConnected && partnerId) {
      setStatusMessage("You are connected to another person. You cannot speak. You cannot chat. You can only see their movement.");
      console.log(`[App Status] Connected. Role: ${myRole}, Partner: ${partnerId}`);
    } else if (myRole === 'user1' && !partnerId) {
      setStatusMessage('Waiting for another person...');
      console.log(`[App Status] Waiting (user1, no partner). Role: ${myRole}`);
    } else if (myRole === 'user2' && !partnerId && !isConnected) { // user2 lost connection or user1 left
        // This state will quickly transition if user2 becomes user1.
        // If it lingers, it's an error or waiting state after user1 disconnects.
        setStatusMessage('Partner disconnected. Waiting or attempting to reconnect role...');
        console.log(`[App Status] User2 but no partnerId and not connected. Role: ${myRole}`);
    } else if (!myId || !myRole) {
        setStatusMessage('Initializing...');
    }
  }, [isConnected, partnerId, myRole, myId]);

  // Mouse movement tracking - updates local myTrail
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const newPosition = { x: event.clientX, y: event.clientY };
      setMyTrail(prevTrail => {
        const updatedTrail = [...prevTrail, newPosition];
        if (updatedTrail.length > MAX_TRAIL_LENGTH) {
          return updatedTrail.slice(updatedTrail.length - MAX_TRAIL_LENGTH);
        }
        return updatedTrail;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []); // Runs once

  // Persist myTrail to localStorage when it changes
  useEffect(() => {
    if (myRole && myId) { // Ensure role and ID are set before trying to save
      const posKey = myRole === 'user1' ? SESSION_USER1_POS_KEY : SESSION_USER2_POS_KEY;
      if (myTrail.length > 0) { // Only save if there's something to save
          try {
            localStorage.setItem(posKey, JSON.stringify(myTrail));
          } catch (e) {
            console.error("[App MyTrail Sync] Error stringifying or setting myTrail in localStorage", e);
          }
      } else {
        // If myTrail becomes empty (e.g. after a clear), ensure localStorage reflects this
        // However, trails are usually only cleared on disconnect or init.
        // Avoid removing the key if it's just empty initially.
      }
    }
  }, [myTrail, myRole, myId]);


  // localStorage event listener for inter-tab communication
  useEffect(() => {
    if (!myId || !myRole) {
      console.log(`[App StorageEffect] Listener not attached yet (myId: ${myId}, myRole: ${myRole})`);
      return;
    }
    console.log(`[App StorageEffect] Attaching listener. MyId: ${myId}, MyRole: ${myRole}`);

    const handleStorageChange = (event: StorageEvent) => {
      console.log(`[App StorageChange] Event: key=${event.key}, myRole=${myRole}`);

      if (event.key === SESSION_USER1_ID_KEY) { // User1's ID changed (or user1 left/joined)
        if (myRole === 'user2') {
          if (!event.newValue) { // User1 left
            console.log('[App StorageChange] User1 left. I am User2, attempting to become User1.');
            setIsConnected(false);
            setPartnerId(null);
            setPartnerTrail([]); // Clear partner trail
            
            localStorage.removeItem(SESSION_USER2_ID_KEY); 
            localStorage.removeItem(SESSION_USER2_POS_KEY);
            // Attempt to become user1
            if(myId) localStorage.setItem(SESSION_USER1_ID_KEY, myId); 
            setMyRole('user1'); 
            // My trail remains, partner trail cleared. Status will update.
          } else { // User1 ID present (could be new user1, or same one re-asserting)
             if (partnerId !== event.newValue) {
                console.log(`[App StorageChange] User1 ID changed/appeared. I am User2, updating partnerId from ${partnerId} to ${event.newValue}`);
                setPartnerId(event.newValue);
             }
             if (!isConnected) setIsConnected(true); // Connect if not already
          }
        }
      } else if (event.key === SESSION_USER2_ID_KEY) { // User2's ID changed (or user2 left/joined)
        if (myRole === 'user1') {
          if (event.newValue && event.newValue !== myId) { // User2 joined or changed
            console.log(`[App StorageChange] User2 joined/changed: ${event.newValue}. I am User1.`);
            setPartnerId(event.newValue);
            setIsConnected(true);
          } else if (!event.newValue) { // User2 left
            console.log('[App StorageChange] User2 left. I am User1.');
            setIsConnected(false);
            setPartnerId(null);
            setPartnerTrail([]); // Clear partner trail
            localStorage.removeItem(SESSION_USER2_POS_KEY); 
          }
        }
      } else if (event.key === SESSION_USER1_POS_KEY && myRole === 'user2') {
        if (event.newValue) {
          try {
            const trail = JSON.parse(event.newValue) as Position[];
            if (Array.isArray(trail)) setPartnerTrail(trail);
            else setPartnerTrail([]);
          } catch (e) { console.error("[App StorageChange] Error parsing user1 trail", e); setPartnerTrail([]); }
        } else {
          setPartnerTrail([]); // User1 cleared their trail data
        }
      } else if (event.key === SESSION_USER2_POS_KEY && myRole === 'user1') {
         if (event.newValue) {
          try {
            const trail = JSON.parse(event.newValue) as Position[];
            if (Array.isArray(trail)) setPartnerTrail(trail);
            else setPartnerTrail([]);
          } catch (e) { console.error("[App StorageChange] Error parsing user2 trail", e); setPartnerTrail([]); }
        } else {
          setPartnerTrail([]); // User2 cleared their trail data
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      console.log(`[App StorageEffect] Removing listener. MyId: ${myId}, MyRole: ${myRole}`);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [myId, myRole, partnerId, isConnected]); 

  useEffect(() => {
    const cleanup = () => {
      const role = myRoleRef.current;
      const id = myIdRef.current;
      console.log(`[App Cleanup] Running cleanup. Role: ${role}, ID: ${id}`);

      if (!id) return; 

      if (role === 'user1' && localStorage.getItem(SESSION_USER1_ID_KEY) === id) {
          console.log('[App Cleanup] I am User1, clearing all session data.');
          localStorage.removeItem(SESSION_USER1_ID_KEY);
          localStorage.removeItem(SESSION_USER1_POS_KEY);
          localStorage.removeItem(SESSION_USER2_ID_KEY); 
          localStorage.removeItem(SESSION_USER2_POS_KEY);
      } else if (role === 'user2' && localStorage.getItem(SESSION_USER2_ID_KEY) === id) {
          console.log('[App Cleanup] I am User2, clearing my data.');
          localStorage.removeItem(SESSION_USER2_ID_KEY);
          localStorage.removeItem(SESSION_USER2_POS_KEY);
      }
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      // Run cleanup if component unmounts for other reasons (e.g. navigation, error boundary)
      // This ensures that if the tab isn't closed but the component unmounts,
      // it still attempts to clean up its localStorage entries.
      cleanup(); 
    };
  }, []); 

  return (
    <div className="relative h-screen w-screen bg-gray-900 cursor-none overflow-hidden" aria-live="polite">
      <StatusMessage message={statusMessage} />
      <Trail points={myTrail} colorClass={MY_TRAIL_COLOR_CLASS} baseSize={7} />
      {isConnected && partnerId && (
        <Trail points={partnerTrail} colorClass={PARTNER_TRAIL_COLOR_CLASS} baseSize={7} />
      )}
    </div>
  );
};

export default App;
