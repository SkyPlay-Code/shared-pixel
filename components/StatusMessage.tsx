import React from 'react';

interface StatusMessageProps {
  message: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div 
      className="absolute top-4 left-1/2 -translate-x-1/2 
                 bg-black/70 backdrop-blur-sm text-lime-400 
                 border border-lime-500/50 
                 px-4 py-2 rounded-md shadow-lg shadow-lime-500/20 
                 text-sm z-30 pointer-events-none
                 transition-opacity duration-300 ease-in-out"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

export default StatusMessage;