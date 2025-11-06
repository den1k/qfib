'use client';

import React, { useState } from 'react';

interface SimpleRCControlsProps {
  onCommand: (command: string) => void;
  connected: boolean;
}

export function SimpleRCControls({ onCommand, connected }: SimpleRCControlsProps) {
  const [speed, setSpeed] = useState(5); // Default speed of 5

  const handleButtonClick = (command: string) => {
    if (connected) {
      // Send command as-is, no speed appending
      onCommand(command);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    // Optionally send speed update command immediately
    if (connected) {
      onCommand(`speed:${newSpeed}`);
    }
  };

  // Button configuration for cross layout
  // Layout:
  //        [↑ forward]
  // [← left] [⏹ stop] [→ right]
  //        [↓ back]
  
  const directionButtons = [
    { id: 'forward', label: '↑', title: 'Forward', command: 'forward', position: 'top' },
    { id: 'left', label: '←', title: 'Left', command: 'left', position: 'left' },
    { id: 'stop', label: '⏹', title: 'Stop', command: 'stop', position: 'center' },
    { id: 'right', label: '→', title: 'Right', command: 'right', position: 'right' },
    { id: 'back', label: '↓', title: 'Back', command: 'back', position: 'bottom' },
  ];

  const actionButtons = [
    { id: 'clean', label: 'Clean', title: 'Clean', command: 'clean' },
    { id: 'power', label: 'Power', title: 'Power', command: 'power' },
    { id: 'wake', label: 'Wake', title: 'Wake', command: 'wake' },
    { id: 'dock', label: 'Dock', title: 'Dock', command: 'dock' }
  ];

  return (
    <div className="simple-rc-controls p-4 flex flex-col items-center">
      {/* Cross layout for direction buttons */}
      <div className="relative" style={{ width: '240px', height: '240px' }}>
        {/* Top row: rotate left, forward, rotate right */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={() => handleButtonClick('rotate:angle=-15')}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title="Rotate Counterclockwise"
          >
            ↶
          </button>
          <button
            onClick={() => handleButtonClick(directionButtons[0].command)}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title={directionButtons[0].title}
          >
            {directionButtons[0].label}
          </button>
          <button
            onClick={() => handleButtonClick('rotate:angle=15')}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title="Rotate Clockwise"
          >
            ↷
          </button>
        </div>
        
        {/* Middle row: left, stop, right */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
          <button
            onClick={() => handleButtonClick(directionButtons[1].command)}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title={directionButtons[1].title}
          >
            {directionButtons[1].label}
          </button>
          <button
            onClick={() => handleButtonClick(directionButtons[2].command)}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title={directionButtons[2].title}
          >
            {directionButtons[2].label}
          </button>
          <button
            onClick={() => handleButtonClick(directionButtons[3].command)}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title={directionButtons[3].title}
          >
            {directionButtons[3].label}
          </button>
        </div>
        
        {/* Bottom button */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => handleButtonClick(directionButtons[4].command)}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title={directionButtons[4].title}
          >
            {directionButtons[4].label}
          </button>
        </div>
      </div>
      
      {/* Speed Slider */}
      <div className="mt-8 flex flex-col items-center" style={{ width: '256px' }}>
        <label className="field-label block text-center mb-2">
          Speed: {speed}
        </label>
        <div className="w-full relative">
          <input
            type="range"
            min="1"
            max="10"
            value={speed}
            onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
            disabled={!connected}
            className="range-input w-full"
          />
          <div className="flex justify-between mt-1 text-[10px] opacity-70 absolute left-0 right-0" style={{ paddingLeft: '5px', paddingRight: '5px' }}>
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex gap-2">
        {actionButtons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleButtonClick(button.command)}
            disabled={!connected}
            className="simple-rc-button px-4 py-2 text-sm font-bold"
            title={button.title}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}

