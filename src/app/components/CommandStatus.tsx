import { useEffect, useRef } from 'react';
import { TrackedCommand } from '../hooks/useCommandTracker';
import { RetroSpinner } from './RetroSpinner';

interface CommandStatusProps {
  commands: TrackedCommand[];
  onClear: () => void;
  onAbortAll: () => void;
  onAbortCommand: (commandId: string) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onPauseCommand: (commandId: string) => void;
  onResumeCommand: (commandId: string) => void;
}

export function CommandStatus({ commands, onClear, onAbortAll, onAbortCommand, onPauseAll, onResumeAll, onPauseCommand, onResumeCommand }: CommandStatusProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const previousScrollTopRef = useRef<number>(0);

  // Preserve scroll position when new commands are added
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollHeight = container.scrollHeight;
    const wasScrolledToTop = previousScrollTopRef.current === 0;
    
    // Only preserve scroll if user was scrolled down (not at top)
    if (!wasScrolledToTop && currentScrollHeight > previousScrollHeightRef.current) {
      const scrollDifference = currentScrollHeight - previousScrollHeightRef.current;
      container.scrollTop = previousScrollTopRef.current + scrollDifference;
    }

    // Update refs for next render
    previousScrollHeightRef.current = currentScrollHeight;
    previousScrollTopRef.current = container.scrollTop;
  }, [commands]);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const getStatusColor = (status: TrackedCommand['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'running':
        return 'text-blue-500';
      case 'paused':
        return 'text-purple-500';
      case 'completed':
        return 'text-green-500';
      case 'superseded':
        return 'text-orange-500';
      case 'aborted':
        return 'text-cyan-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: TrackedCommand['status']) => {
    switch (status) {
      case 'pending':
        return '◌';  // Empty circle for pending
      case 'running':
        return <RetroSpinner type="spinner" />;  // Spinner for running
      case 'paused':
        return '⏸';  // Pause icon
      case 'completed':
        return '✓';
      case 'superseded':
        return '⊘';
      case 'aborted':
        return '⊗';
      case 'error':
        return '✗';
      default:
        return '•';
    }
  };

  // Check if there's a command currently pending or running
  const hasActiveCommand = commands.some(
    cmd => cmd.status === 'pending' || cmd.status === 'running'
  );
  
  // Check if there are paused commands
  const hasPausedCommand = commands.some(
    cmd => cmd.status === 'paused'
  );

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold uppercase tracking-wider">Command Status</h2>
        <div className="flex gap-2">
          <button
            onClick={onPauseAll}
            disabled={!hasActiveCommand}
            className="text-xs"
          >
            ⏸ PAUSE ALL
          </button>
          <button
            onClick={onResumeAll}
            disabled={!hasPausedCommand}
            className="text-xs"
          >
            ▶ RESUME ALL
          </button>
          <button
            onClick={onAbortAll}
            disabled={!hasActiveCommand && !hasPausedCommand}
            className="text-xs"
          >
            ⊗ ABORT ALL
          </button>
          <button
            onClick={onClear}
            disabled={commands.length === 0}
            className="text-xs"
          >
            🗑️ CLEAR
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="border border-green-500 p-3 max-h-[200px] overflow-y-auto"
        onScroll={() => {
          // Update scroll position ref when user manually scrolls
          if (scrollContainerRef.current) {
            previousScrollTopRef.current = scrollContainerRef.current.scrollTop;
          }
        }}
      >
        {commands.length === 0 ? (
          <p className="text-sm opacity-70">No commands tracked yet...</p>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className="text-xs border-b border-green-500 border-opacity-30 pb-2 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`${getStatusColor(cmd.status)} text-base font-bold`}>
                      {getStatusIcon(cmd.status)}
                    </div>
                    <span className="font-mono">{cmd.id}</span>
                    <span className="opacity-70">→</span>
                    <span className="truncate">{cmd.command}</span>
                    <span className="text-xs opacity-50 ml-auto flex-shrink-0">
                      {formatTimestamp(cmd.timestamp)} 
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                    {cmd.status === 'running' && (
                      <>
                        <button
                          onClick={() => onPauseCommand(cmd.id)}
                          className="w-6 h-6 p-0 m-0 inline-flex items-center justify-center overflow-visible opacity-70 hover:opacity-100"
                          title="Pause this command"
                        >
                          <span className="text-base leading-none flex items-center justify-center w-full h-full">⏸</span>
                        </button>
                        <button
                          onClick={() => onAbortCommand(cmd.id)}
                          className="w-6 h-6 p-0 m-0 inline-flex items-center justify-center overflow-visible opacity-100"
                          title="Abort this command"
                        >
                          <span className="text-xl leading-none flex items-center justify-center w-full h-full">⊗</span>
                        </button>
                      </>
                    )}
                    {cmd.status === 'paused' && (
                      <>
                        <button
                          onClick={() => onResumeCommand(cmd.id)}
                          className="w-6 h-6 p-0 m-0 inline-flex items-center justify-center overflow-visible opacity-70 hover:opacity-100"
                          title="Resume this command"
                        >
                          <span className="text-base leading-none flex items-center justify-center w-full h-full">▶</span>
                        </button>
                        <button
                          onClick={() => onAbortCommand(cmd.id)}
                          className="w-6 h-6 p-0 m-0 inline-flex items-center justify-center overflow-visible opacity-100"
                          title="Abort this command"
                        >
                          <span className="text-xl leading-none flex items-center justify-center w-full h-full">⊗</span>
                        </button>
                      </>
                    )}
                    <div className="text-xs opacity-50">
                      {cmd.source === 'ble' ? '📱' : '🌐'}
                    </div>
                  </div>
                </div>
                {cmd.error && (
                  <div className={`ml-6 mt-1 ${
                    cmd.status === 'superseded' ? 'text-orange-500' : 
                    cmd.status === 'aborted' ? 'text-cyan-500' : 
                    'text-red-500'
                  }`}>
                    {cmd.status === 'superseded' ? 'Superseded by new command' : 
                     cmd.status === 'aborted' ? 'Aborted by user' :
                     `Error: ${cmd.error}`}
                  </div>
                )}
                {cmd.completedAt && cmd.status !== 'superseded' && cmd.status !== 'aborted' && (
                  <div className="ml-6 mt-1 opacity-50">
                    Completed in {Math.round((cmd.completedAt.getTime() - cmd.timestamp.getTime()) / 1000)}s
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

