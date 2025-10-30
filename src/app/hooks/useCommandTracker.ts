import { useState, useCallback } from 'react';

export type CommandStatus = 'pending' | 'running' | 'paused' | 'completed' | 'error' | 'superseded' | 'aborted';

export interface TrackedCommand {
  id: string;
  command: string;
  status: CommandStatus;
  timestamp: Date;
  completedAt?: Date;
  error?: string;
  source: 'ble' | 'mqtt';
}

export function useCommandTracker() {
  const [commands, setCommands] = useState<TrackedCommand[]>([]);

  const trackCommand = useCallback((id: string, command: string, source: 'ble' | 'mqtt') => {
    const newCommand: TrackedCommand = {
      id,
      command,
      status: 'pending',
      timestamp: new Date(),
      source,
    };
    
    setCommands(prev => [newCommand, ...prev].slice(0, 50)); // Keep last 50 commands
    
    // Auto-transition to "running" after a short delay
    setTimeout(() => {
      setCommands(prev => prev.map(cmd => 
        cmd.id === id && cmd.status === 'pending'
          ? { ...cmd, status: 'running' as CommandStatus }
          : cmd
      ));
    }, 200); // 200ms delay to show pending briefly
  }, []);

  const updateCommandStatus = useCallback((id: string, status: CommandStatus, error?: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === id 
        ? { ...cmd, status, completedAt: new Date(), error } 
        : cmd
    ));
  }, []);

  const clearCommands = useCallback(() => {
    setCommands([]);
  }, []);

  // Parse response messages for command completion
  const parseResponse = useCallback((message: string) => {
    // Format: CMD_OK:cmdId or CMD_ERROR:cmdId:message or CMD_PAUSED:cmdId or CMD_RESUMED:cmdId
    if (message.startsWith('CMD_OK:')) {
      const cmdId = message.substring(7, 13); // Extract 6-char ID
      updateCommandStatus(cmdId, 'completed');
      return true;
    } else if (message.startsWith('CMD_ERROR:')) {
      const parts = message.substring(10).split(':');
      const cmdId = parts[0];
      const errorMsg = parts.slice(1).join(':');
      
      // Check if the error is due to being superseded or aborted
      if (errorMsg.includes('superseded')) {
        updateCommandStatus(cmdId, 'superseded', errorMsg);
      } else if (errorMsg.includes('aborted')) {
        updateCommandStatus(cmdId, 'aborted', errorMsg);
      } else {
        updateCommandStatus(cmdId, 'error', errorMsg);
      }
      return true;
    } else if (message.startsWith('CMD_PAUSED:')) {
      const cmdId = message.substring(11, 17); // Extract 6-char ID
      updateCommandStatus(cmdId, 'paused');
      return true;
    } else if (message.startsWith('CMD_RESUMED:')) {
      const cmdId = message.substring(12, 18); // Extract 6-char ID
      updateCommandStatus(cmdId, 'running');
      return true;
    }
    return false;
  }, [updateCommandStatus]);

  return {
    commands,
    trackCommand,
    updateCommandStatus,
    parseResponse,
    clearCommands,
  };
}

