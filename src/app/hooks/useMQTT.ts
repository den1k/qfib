'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import mqtt from 'mqtt';

export interface MQTTConfig {
  brokerUrl: string;
  username: string;
  password: string;
  commandTopic: string;
  statusTopic: string;
  clientId: string;
}

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
    // Fallback to env vars for backward compatibility
    if (process.env.NEXT_PUBLIC_MQTT_BROKER_URL) {
      return {
        brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL!,
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || '',
        commandTopic: 'fible/command',
        statusTopic: 'fible/status',
        clientId: `webapp-client-${Math.random().toString(16).substr(2, 8)}`
      };
    }
    return null;
  }, [options?.config]);

  const connect = useCallback(() => {
    if (!config || !config.brokerUrl) {
      setError('MQTT configuration is missing');
      return;
    }

    try {
      const mqttClient = mqtt.connect(config.brokerUrl, {
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
        console.log('Connected to MQTT broker');
        setIsConnected(true);
        setError(null);
        
        // Subscribe to status updates
        mqttClient.subscribe(config.statusTopic, (err) => {
          if (err) {
            console.error('Failed to subscribe to status topic:', err);
            setError(`Failed to subscribe: ${err.message}`);
          } else {
            console.log(`Subscribed to ${config.statusTopic}`);
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
        
        console.log(`Received: ${msg.message} on topic ${topic}`);
        setMessages(prev => [...prev.slice(-9), msg]); // Keep last 10 messages
        
        // Call response handler if provided
        if (options?.onResponse) {
          options.onResponse(messageStr);
        }
      });

      mqttClient.on('error', (err) => {
        console.error('MQTT error:', err);
        setError(err.message);
        setIsConnected(false);
      });

      mqttClient.on('close', () => {
        console.log('MQTT connection closed');
        setIsConnected(false);
      });

      mqttClient.on('reconnect', () => {
        console.log('MQTT reconnecting...');
        setIsConnected(false);
      });

      clientRef.current = mqttClient;
      setClient(mqttClient);
    } catch (err) {
      console.error('Failed to create MQTT client:', err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [config, options?.onResponse]);

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
      console.warn('Using client state as fallback - ref was null', {
        isConnected,
        hasClientState: !!client
      });
      currentClient = client;
      clientRef.current = client; // Sync the ref
    }
    
    if (!config) {
      setError('MQTT configuration is missing');
      return;
    }
    
    if (!currentClient) {
      console.error('MQTT client is null', { 
        isConnectedState: isConnected, 
        clientState: !!client,
        hasAutoConnected: hasAutoConnectedRef.current,
        refCurrent: !!clientRef.current
      });
      setError('Not connected to MQTT broker');
      return;
    }
    
    // Trust the client - if it's not connected, it will error in the callback
    // MQTT.js client handles its own connection state internally
    const configValue = config;
    
    try {
      // Check client's internal connection state
      const isClientConnected = (currentClient as any).connected !== false;
      
      if (!isClientConnected && !isConnected) {
        console.warn('MQTT client appears disconnected, attempting publish anyway', {
          clientConnected: isClientConnected,
          stateConnected: isConnected
        });
      }
      
      currentClient.publish(configValue.commandTopic, command, { qos: 0 }, (err) => {
        if (err) {
          console.error('Failed to publish command:', err, {
            topic: configValue.commandTopic,
            command: command.substring(0, 50),
            clientConnected: (currentClient as any).connected
          });
          setError(`Failed to send command: ${err.message}`);
        } else {
          console.log(`✓ Published: ${command.substring(0, 50)}... to ${configValue.commandTopic}`);
        }
      });
    } catch (err) {
      console.error('Error publishing command:', err);
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
