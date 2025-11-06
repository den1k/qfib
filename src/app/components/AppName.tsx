'use client';

import { useEffect, useRef, useState } from 'react';

const ANIMATION_RUN_KEY = 'qfib-app-name-animated';

export function AppName() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);

  useEffect(() => {
    // Check localStorage after mount (client-side only)
    const hasRun = typeof window !== 'undefined' && localStorage.getItem(ANIMATION_RUN_KEY) === 'true';
    
    const link = linkRef.current;
    if (!link) return;

    if (!hasRun) {
      // First time - start animation after a tiny delay to ensure DOM is ready
      requestAnimationFrame(() => {
        setShouldAnimate(true);
      });
      
      const handleAnimationEnd = () => {
        // Mark as animated
        localStorage.setItem(ANIMATION_RUN_KEY, 'true');
        setShouldAnimate(false);
        
        // Force green color after animation completes
        link.style.setProperty('-webkit-text-fill-color', '#00ff00', 'important');
        link.style.setProperty('color', '#00ff00', 'important');
        link.style.setProperty('-webkit-text-stroke-width', '0px', 'important');
        link.style.setProperty('-webkit-text-stroke-color', 'transparent', 'important');
        link.style.setProperty('opacity', '1', 'important');
      };

      link.addEventListener('animationend', handleAnimationEnd);

      return () => {
        link.removeEventListener('animationend', handleAnimationEnd);
      };
    } else {
      // Already animated - ensure final state immediately
      link.style.setProperty('-webkit-text-fill-color', '#00ff00', 'important');
      link.style.setProperty('color', '#00ff00', 'important');
      link.style.setProperty('-webkit-text-stroke-width', '0px', 'important');
      link.style.setProperty('-webkit-text-stroke-color', 'transparent', 'important');
      link.style.setProperty('opacity', '1', 'important');
    }
  }, []);

  return (
    <a 
      ref={linkRef}
      href="/" 
      className={shouldAnimate ? "app-name mb-0 leading-none" : "app-name-final mb-0 leading-none"}
    >
      qfiB
    </a>
  );
}

