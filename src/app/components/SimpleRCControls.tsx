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
      // Append speed to command if it's a movement command
      const movementCommands = ['forward', 'backward', 'rotate'];
      const isMovementCommand = movementCommands.some(cmd => command.includes(cmd));
      const finalCommand = isMovementCommand ? `${command};speed=${speed}` : command;
      onCommand(finalCommand);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    // Optionally send speed update command immediately
    if (connected) {
      onCommand(`speed:${newSpeed}`);
    }
  };

  // Button configuration for the 3x3 grid
  // Layout:
  // [↖ 45°]  [↑]  [↗ 45°]
  // [←]     [⏹]  [→]
  // [↙ 135°]  [↓]  [↘ 135°]
  
  const buttons = [
    // Row 1
    { id: 'rotate-left-45', label: '↖', title: 'Rotate Left 45°', command: 'rotate:angle=-45', position: [0, 0] },
    { id: 'forward', label: '↑', title: 'Forward', command: 'forward', position: [1, 0] },
    { id: 'rotate-right-45', label: '↗', title: 'Rotate Right 45°', command: 'rotate:angle=45', position: [2, 0] },
    // Row 2
    { id: 'rotate-left', label: '←', title: 'Rotate Left (Indefinite)', command: 'rotate:direction=left', position: [0, 1] },
    { id: 'stop', label: '⏹', title: 'Stop', command: 'stop', position: [1, 1] },
    { id: 'rotate-right', label: '→', title: 'Rotate Right (Indefinite)', command: 'rotate:direction=right', position: [2, 1] },
    // Row 3
    { id: 'rotate-left-135', label: '↙', title: 'Rotate Left 135°', command: 'rotate:angle=-135', position: [0, 2] },
    { id: 'backward', label: '↓', title: 'Backward', command: 'backward', position: [1, 2] },
    { id: 'rotate-right-135', label: '↘', title: 'Rotate Right 135°', command: 'rotate:angle=135', position: [2, 2] },
  ];

  return (
    <div className="simple-rc-controls p-4 flex flex-col items-center">
      {/* 3x3 grid on all screen sizes */}
      <div className="grid grid-cols-3 gap-2 max-w-[300px]">
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleButtonClick(button.command)}
            disabled={!connected}
            className="simple-rc-button aspect-square w-[80px] h-[80px] text-2xl flex items-center justify-center font-bold"
            title={button.title}
          >
            {button.label}
          </button>
        ))}
      </div>
      
      {/* Speed Slider */}
      <div className="mt-6 flex flex-col items-center" style={{ width: '256px' }}>
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
    </div>
  );
}

