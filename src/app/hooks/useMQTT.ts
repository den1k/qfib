'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import mqtt from 'mqtt';

interface MQTTConfig {
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

export const useMQTT = () => {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasAutoConnectedRef = useRef(false);
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  // Memoize config to prevent recreation on every render
  const config: MQTTConfig = useMemo(() => ({
    brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL!,
    username: process.env.NEXT_PUBLIC_MQTT_USERNAME!,
    password: process.env.NEXT_PUBLIC_MQTT_PASSWORD!,
    commandTopic: process.env.NEXT_PUBLIC_MQTT_COMMAND_TOPIC!,
    statusTopic: process.env.NEXT_PUBLIC_MQTT_STATUS_TOPIC!,
    clientId: `webapp-client-${Math.random().toString(16).substr(2, 8)}`
  }), []);

  const connect = useCallback(() => {
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
        const msg: MQTTMessage = {
          topic,
          message: message.toString(),
          timestamp: new Date(),
          source: 'mqtt'
        };
        
        console.log(`Received: ${msg.message} on topic ${topic}`);
        setMessages(prev => [...prev.slice(-9), msg]); // Keep last 10 messages
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
  }, [config]);

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
    if (client) {
      client.publish(config.commandTopic, command, (err) => {
        if (err) {
          console.error('Failed to publish command:', err);
          setError(`Failed to send command: ${err.message}`);
        } else {
          console.log(`Published command: ${command}`);
        }
      });
    } else {
      setError('Not connected to MQTT broker');
    }
  }, [client, config.commandTopic]);

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

  // Auto-connect on mount (only once)
  useEffect(() => {
    // Only auto-connect if we haven't already and no client exists
    if (!hasAutoConnectedRef.current && !clientRef.current) {
      hasAutoConnectedRef.current = true;
      connect();
    }
    
    // No cleanup function - let React Fast Refresh handle HMR
    // The disconnect function is available if needed manually
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
