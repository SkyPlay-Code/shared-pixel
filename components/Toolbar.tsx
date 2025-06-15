import React from 'react';
import { DrawingTool } from '../types';

interface ToolbarProps {
  currentTool: DrawingTool;
  setCurrentTool: (tool: DrawingTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentStrokeWidth: number;
  setCurrentStrokeWidth: (width: number) => void;
  clearCanvas: () => void;
  userAssignedColor: string; // The user's primary drawing color (pink/cyan)
}

const PREDEFINED_COLORS = ['#000000', '#EF4444', '#22C55E', '#3B82F6', '#EAB308', '#EC4899', '#06B6D4', '#A855F7']; // Black, Red, Green, Blue, Yellow, Pink, Cyan, Purple
const ERASER_COLOR = '#FFFFFF'; // Canvas background color

const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(({
  currentTool, setCurrentTool,
  currentColor, setCurrentColor,
  currentStrokeWidth, setCurrentStrokeWidth,
  clearCanvas, userAssignedColor
}, ref) => {
  return (
    <div ref={ref} className="bg-gray-100 p-2 shadow-md z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
      {/* Tool Selector */}
      <div className="flex gap-1 border border-gray-300 rounded">
        <button
          title="Pen"
          onClick={() => {
            setCurrentTool('pen');
            if (currentColor === ERASER_COLOR) {
                setCurrentColor(userAssignedColor);
            }
          }}
          className={`p-2 rounded-l ${currentTool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          aria-pressed={currentTool === 'pen'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button
          title="Eraser"
          onClick={() => {
            setCurrentTool('eraser');
            // setCurrentColor(ERASER_COLOR); // Eraser conceptually uses background color
          }}
          className={`p-2 rounded-r ${currentTool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          aria-pressed={currentTool === 'eraser'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m6 0a2.25 2.25 0 01-2.25 2.25H11.25a2.25 2.25 0 01-2.25-2.25m3.75 0V9.75M9 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9.75m2.25 2.25V15m0-2.25a2.25 2.25 0 002.25 2.25h3.75m0-2.25V9.75M15 12a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m-2.25 2.25V15m0-2.25a2.25 2.25 0 01-2.25 2.25H15" />
          </svg>
        </button>
      </div>

      {/* Color Picker */}
      <div className="flex gap-1 items-center">
        {[userAssignedColor, ...PREDEFINED_COLORS].filter((c, i, a) => a.indexOf(c) === i).map(color => (
          <button
            key={color}
            title={color === userAssignedColor ? `Your Assigned Color (${color})` : color}
            onClick={() => {
                setCurrentColor(color);
                if (currentTool === 'eraser') setCurrentTool('pen'); 
            }}
            className={`w-6 h-6 rounded-full border-2 hover:opacity-80 transition-all duration-150 ease-in-out
                        ${currentTool === 'pen' && currentColor === color ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1' : 'border-gray-400'}
                        ${color === userAssignedColor ? 'ring-offset-gray-100' : ''}`} // Slightly different offset for user color
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
            aria-pressed={currentTool === 'pen' && currentColor === color}
          />
        ))}
      </div>

      {/* Stroke Width Selector */}
      <div className="flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5.16 12.75M9.75 3.104L12 3.75m-2.25-.646V1.5m6.375 7.375L10.5 14.25m8.25-4.5V21M18.75 14.25L10.5 21m0-6.75h7.5" />
         </svg>
        <input
          type="range"
          min="1"
          max="50"
          value={currentStrokeWidth}
          onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))}
          className="w-20 md:w-24 cursor-pointer"
          title={`Stroke width: ${currentStrokeWidth}px`}
          aria-label="Stroke width"
        />
        <span className="text-sm w-6 text-right text-gray-700">{currentStrokeWidth}</span>
      </div>
      
      {/* Clear Canvas Button */}
      <button
        onClick={clearCanvas}
        className="p-2 rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
        title="Clear Canvas"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
           <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.032 3.223.094M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">Clear</span>
      </button>
    </div>
  );
});

export default Toolbar;