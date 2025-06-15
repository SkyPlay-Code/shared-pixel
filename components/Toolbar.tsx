import React from 'react';
import { DrawingTool, BlendMode } from '../types';

interface ToolbarProps {
  currentTool: DrawingTool;
  setCurrentTool: (tool: DrawingTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentStrokeWidth: number;
  setCurrentStrokeWidth: (width: number) => void;
  clearCanvas: () => void;
  userAssignedColor: string;
  isPulsingBrush: boolean;
  setIsPulsingBrush: (isPulsing: boolean) => void;
  blendMode: BlendMode;
  setBlendMode: (mode: BlendMode) => void;
}

const PREDEFINED_COLORS = ['#000000', '#EF4444', '#22C55E', '#3B82F6', '#EAB308', '#EC4899', '#06B6D4', '#A855F7'];
const ERASER_COLOR = '#FFFFFF';

const BLEND_MODES: BlendMode[] = ['source-over', 'lighter', 'difference', 'multiply'];
const BLEND_MODE_NAMES: Record<BlendMode, string> = {
  'source-over': 'Normal',
  'lighter': 'Lighter',
  'difference': 'Difference',
  'multiply': 'Multiply',
};


const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(({
  currentTool, setCurrentTool,
  currentColor, setCurrentColor,
  currentStrokeWidth, setCurrentStrokeWidth,
  clearCanvas, userAssignedColor,
  isPulsingBrush, setIsPulsingBrush,
  blendMode, setBlendMode
}, ref) => {

  const handleToolChange = (tool: DrawingTool) => {
    setCurrentTool(tool);
    if ((tool === 'pen' || tool === 'gravityPen') && currentColor === ERASER_COLOR) {
      setCurrentColor(userAssignedColor);
    }
  };

  const cycleBlendMode = () => {
    const currentIndex = BLEND_MODES.indexOf(blendMode);
    const nextIndex = (currentIndex + 1) % BLEND_MODES.length;
    setBlendMode(BLEND_MODES[nextIndex]);
  };

  const commonButtonClass = "p-2 transition-all duration-200 ease-in-out";
  const toolButtonBase = `${commonButtonClass} border-t border-b border-sky-600/70 text-sky-400 hover:bg-sky-500/30 hover:text-sky-300 hover:shadow-md hover:shadow-sky-500/50`;
  const toolButtonActive = "bg-sky-500 text-black ring-2 ring-sky-300";

  return (
    <div 
      ref={ref} 
      className="bg-black/60 backdrop-blur-md p-2 shadow-lg z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4 print:hidden border-b-2 border-fuchsia-500/70 animate-pulse-border-fuchsia"
    >
      {/* Tool Selector */}
      <div className="flex rounded overflow-hidden border border-sky-600/70">
        <button
          title="Pen"
          onClick={() => handleToolChange('pen')}
          className={`${toolButtonBase} ${currentTool === 'pen' ? toolButtonActive : ''}`}
          aria-pressed={currentTool === 'pen'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button
          title="Gravity Pen"
          onClick={() => handleToolChange('gravityPen')}
          className={`${toolButtonBase} border-l border-r border-sky-600/70 ${currentTool === 'gravityPen' ? toolButtonActive : ''}`}
          aria-pressed={currentTool === 'gravityPen'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
             <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25c0 .414.336.75.75.75H7.5c.414 0 .75-.336.75-.75v-1.5c0-.414-.336-.75-.75-.75H6.75a.75.75 0 00-.75.75v1.5zm3.75 0c0 .414.336.75.75.75h.75c.414 0 .75-.336.75-.75v-1.5c0-.414-.336-.75-.75-.75h-.75a.75.75 0 00-.75.75v1.5zm3.75 0c0 .414.336.75.75.75h.75c.414 0 .75-.336.75-.75v-1.5c0-.414-.336-.75-.75-.75h-.75a.75.75 0 00-.75.75v1.5z" />
          </svg>
        </button>
        <button
          title="Eraser"
          onClick={() => handleToolChange('eraser')}
          className={`${toolButtonBase} ${currentTool === 'eraser' ? toolButtonActive : ''}`}
          aria-pressed={currentTool === 'eraser'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
             <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m6 0a2.25 2.25 0 01-2.25 2.25H11.25a2.25 2.25 0 01-2.25-2.25m3.75 0V9.75M9 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9.75m2.25 2.25V15m0-2.25a2.25 2.25 0 002.25 2.25h3.75m0-2.25V9.75M15 12a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m-2.25 2.25V15m0-2.25a2.25 2.25 0 01-2.25 2.25H15" />
          </svg>
        </button>
      </div>

      {/* Color Picker */}
      <div className="flex gap-1.5 items-center">
        {[userAssignedColor, ...PREDEFINED_COLORS].filter((c, i, a) => a.indexOf(c) === i).map(color => (
          <button
            key={color}
            title={color === userAssignedColor ? `Your Color (${color.toUpperCase()})` : color.toUpperCase()}
            onClick={() => {
                setCurrentColor(color);
                if (currentTool === 'eraser') setCurrentTool('pen'); 
            }}
            className={`w-6 h-6 rounded-full border hover:border-fuchsia-400/80 transition-all duration-150 ease-in-out
                        ${(currentTool === 'pen' || currentTool === 'gravityPen') && currentColor === color ? 'ring-2 ring-offset-2 ring-offset-black ring-fuchsia-400 border-transparent' : 'border-slate-600 hover:border-slate-400'}
                      `}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
            aria-pressed={(currentTool === 'pen' || currentTool === 'gravityPen') && currentColor === color}
          />
        ))}
      </div>

      {/* Stroke Width Selector */}
      <div className="flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-fuchsia-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5.16 12.75M9.75 3.104L12 3.75m-2.25-.646V1.5m6.375 7.375L10.5 14.25m8.25-4.5V21M18.75 14.25L10.5 21m0-6.75h7.5" />
         </svg>
        <input
          type="range"
          min="1"
          max="50"
          value={currentStrokeWidth}
          onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))}
          className="w-20 md:w-24 cursor-pointer accent-fuchsia-500 bg-gray-700/50 rounded-lg"
          title={`Stroke width: ${currentStrokeWidth}px`}
          aria-label="Stroke width"
        />
        <span className="text-sm w-6 text-right text-fuchsia-400">{currentStrokeWidth}</span>
      </div>

      {/* Pulsing Brush Toggle */}
      <button
        title={isPulsingBrush ? "Disable Pulsing Effect" : "Enable Pulsing Effect"}
        onClick={() => setIsPulsingBrush(!isPulsingBrush)}
        className={`${commonButtonClass} rounded ${isPulsingBrush ? 'bg-purple-500 text-black ring-2 ring-purple-300' : 'bg-gray-700/50 text-purple-400 hover:bg-purple-500/30'}`}
        aria-pressed={isPulsingBrush}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.86 0 14.25 6.39 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      </button>

      {/* Blend Mode Selector */}
      <button
        title={`Blend Mode: ${BLEND_MODE_NAMES[blendMode]}`}
        onClick={cycleBlendMode}
        className={`${commonButtonClass} rounded bg-teal-600/50 text-teal-300 hover:bg-teal-500/70 min-w-[90px] text-sm`}
      >
        {BLEND_MODE_NAMES[blendMode]}
      </button>
      
      {/* Clear Canvas Button */}
      <button
        onClick={clearCanvas}
        className={`${commonButtonClass} rounded bg-red-600/60 text-red-300 hover:bg-red-500/70 flex items-center gap-1`}
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