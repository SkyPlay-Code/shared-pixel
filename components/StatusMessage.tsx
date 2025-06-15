
import React from 'react';

interface StatusMessageProps {
  message: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-700 bg-opacity-80 text-white px-4 py-2 rounded-md shadow-lg text-sm z-30 pointer-events-none">
      {message}
    </div>
  );
};

export default StatusMessage;