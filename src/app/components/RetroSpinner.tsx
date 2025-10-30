'use client';

import { useEffect, useState } from 'react';

interface RetroSpinnerProps {
  type?: 'dots' | 'spinner' | 'blocks' | 'arrows';
}

export function RetroSpinner({ type = 'spinner' }: RetroSpinnerProps) {
  const [frame, setFrame] = useState(0);

  const animations = {
    spinner: ['|', '/', '—', '\\'],
    dots: ['.', '..', '...'],
    // Progress bar animations:
    blocks: ['▱▱▱▱', '▰▱▱▱', '▰▰▱▱', '▰▰▰▱', '▰▰▰▰', '▱▰▰▰', '▱▱▰▰', '▱▱▱▰'],  // Progress bar (smooth loop)
    arrows: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙']
  };

  const frames = animations[type];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, type === 'blocks' ? 300 : 150); // Slower for blocks

    return () => clearInterval(interval);
  }, [frames.length, type]);

  return <span className="inline-block w-4 text-center">{frames[frame]}</span>;
}

