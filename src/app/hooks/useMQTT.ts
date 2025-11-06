'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import mqtt from 'mqtt';
import { MQTTConfig } from '@/app/utils/mqttConfig';

interface MQTTMessage {
  topic: string;
  message: string;
  timestamp: Date;
  source: 'mqtt';
}

interface UseMQTTOptions {
  onResponse?: (message: string) => void;
  config?: MQTTConfig | null;
  autoConnect?: boolean;
}

export const useMQTT = (options?: UseMQTTOptions) => {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasAutoConnectedRef = useRef(false);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const lastConfigRef = useRef<string>('');

  // Memoize config to prevent recreation on every render
  // Use provided config or fall back to env vars
  const config: MQTTConfig | null = useMemo(() => {
    if (options?.config) {
      return options.config;
    }
    return null;
  }, [options?.config]);

  const connect = useCallback(() => {
    if (!config || !config.brokerUrl) {
      setError('MQTT configuration is missing');
      return;
    }

    // Ensure broker URL has protocol (default to wss:// for secure connections)
    let brokerUrl = config.brokerUrl.trim();
    if (!brokerUrl.startsWith('ws://') && !brokerUrl.startsWith('wss://') && !brokerUrl.startsWith('mqtt://') && !brokerUrl.startsWith('mqtts://')) {
      // Default to wss:// for secure connections (emqxsl.com suggests SSL)
      brokerUrl = `wss://${brokerUrl}`;
      // Add default port if not specified
      if (!brokerUrl.includes(':8084') && !brokerUrl.includes(':8083') && !brokerUrl.includes(':8883') && !brokerUrl.includes(':1883')) {
        brokerUrl = `${brokerUrl}:8084`;
      }
    }

    // Add /mqtt path if not present (required by some EMQX brokers)
    // Extract the path part (everything after the port)
    const urlMatch = brokerUrl.match(/^(wss?:\/\/[^:]+:\d+)(\/.*)?$/);
    if (urlMatch) {
      const baseUrl = urlMatch[1]; // e.g., wss://host:8084
      const existingPath = urlMatch[2] || ''; // e.g., /mqtt or /
      
      if (!existingPath.includes('/mqtt')) {
        // Remove trailing slash if present, then add /mqtt
        const cleanPath = existingPath.endsWith('/') ? existingPath.slice(0, -1) : existingPath;
        brokerUrl = `${baseUrl}${cleanPath}/mqtt`;
      }
    }

    try {
      const mqttClient = mqtt.connect(brokerUrl, {
        clientId: config.clientId,
        username: config.username,
        password: config.password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
        protocolVersion: 4,
        keepalive: 60,
      });

      mqttClient.on('connect', () => {
        setIsConnected(true);
        setError(null);
        
        // Subscribe to status updates
        mqttClient.subscribe(config.statusTopic, (err) => {
          if (err) {
            setError(`Failed to subscribe: ${err.message}`);
          }
        });
      });

      mqttClient.on('message', (topic, message) => {
        const messageStr = message.toString();
        const msg: MQTTMessage = {
          topic,
          message: messageStr,
          timestamp: new Date(),
          source: 'mqtt'
        };
        
        setMessages(prev => [...prev.slice(-9), msg]); // Keep last 10 messages
        
        // Call response handler if provided
        if (options?.onResponse) {
          options.onResponse(messageStr);
        }
      });

      mqttClient.on('error', (err) => {
        const errorMessage = err.message || err.toString() || 'Unknown MQTT error';
        const errorCode = (err as any).code;
        const errorDetails = errorCode ? ` (code: ${errorCode})` : '';
        const detailedError = `MQTT connection error: ${errorMessage}${errorDetails}. Broker: ${brokerUrl}. Check URL, port, credentials, and firewall settings.`;
        setError(detailedError);
        setIsConnected(false);
      });

      mqttClient.on('close', () => {
        if (!isConnected) {
          setError(`Connection closed. Unable to connect to ${brokerUrl}. Check if the broker URL, port, and credentials are correct.`);
        }
        setIsConnected(false);
      });

      mqttClient.on('reconnect', () => {
        setIsConnected(false);
      });

      mqttClient.on('offline', () => {
        setError(`MQTT client offline. Check network connection and broker URL: ${brokerUrl}`);
        setIsConnected(false);
      });

      clientRef.current = mqttClient;
      setClient(mqttClient);
    } catch (err) {
      const errorDetails = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create MQTT client: ${errorDetails}. Broker URL: ${brokerUrl}`);
    }
  }, [config, options?.onResponse, isConnected]);

  const disconnect = useCallback(() => {
    const currentClient = clientRef.current;
    if (currentClient) {
      currentClient.end();
      clientRef.current = null;
      setClient(null);
      setIsConnected(false);
    }
  }, []);

  const publishCommand = useCallback((command: string) => {
    // Always read refs at call time, not closure time
    let currentClient = clientRef.current;
    
    // Fallback to client state if ref is somehow null but state exists
    if (!currentClient && client) {
      currentClient = client;
      clientRef.current = client; // Sync the ref
    }
    
    if (!config) {
      setError('MQTT configuration is missing');
      return;
    }
    
    if (!currentClient) {
      setError('Not connected to MQTT broker');
      return;
    }
    
    // Trust the client - if it's not connected, it will error in the callback
    // MQTT.js client handles its own connection state internally
    const configValue = config;
    
    try {
      currentClient.publish(configValue.commandTopic, command, { qos: 0 }, (err) => {
        if (err) {
          setError(`Failed to send command: ${err.message}`);
        }
      });
    } catch (err) {
      setError(`Failed to publish: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [config, isConnected, client]);

  const sendServoCommand = useCallback((command: 'up' | 'down' | 'left' | 'right' | string) => {
    publishCommand(command);
  }, [publishCommand]);

  const sendCustomAngle = useCallback((angle: number) => {
    if (angle >= 0 && angle <= 180) {
      publishCommand(angle.toString());
    } else {
      setError('Angle must be between 0 and 180 degrees');
    }
  }, [publishCommand]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-connect on mount if enabled (default true for backward compatibility)
  useEffect(() => {
    const shouldAutoConnect = options?.autoConnect !== false;
    
    if (shouldAutoConnect && config && config.brokerUrl) {
      // Create a string representation of config to detect changes
      const configKey = `${config.brokerUrl}:${config.clientId}`;
      const configChanged = lastConfigRef.current !== configKey;
      
      // If config changed or we haven't auto-connected yet, connect
      if (configChanged || (!hasAutoConnectedRef.current && !clientRef.current)) {
        // Disconnect existing client if config changed
        if (configChanged && clientRef.current) {
          disconnect();
        }
        lastConfigRef.current = configKey;
        hasAutoConnectedRef.current = true;
        // Small delay to ensure disconnect completes
        setTimeout(() => {
          if (!clientRef.current) {
            connect();
          }
        }, configChanged ? 100 : 0);
      }
    } else if (clientRef.current && (!config || !config.brokerUrl)) {
      // If config was removed, disconnect
      disconnect();
      hasAutoConnectedRef.current = false;
      lastConfigRef.current = '';
    }
    
    // No cleanup function - let React Fast Refresh handle HMR
    // The disconnect function is available if needed manually
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, options?.autoConnect]); // Reconnect if config changes

  return {
    isConnected,
    messages,
    error,
    connect,
    disconnect,
    sendServoCommand,
    sendCustomAngle,
    publishCommand,
    clearMessages
  };
};
