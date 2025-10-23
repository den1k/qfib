'use client';

import { useState, useEffect, useCallback } from 'react';

interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
}

interface BLEService {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  rxCharacteristic: BluetoothRemoteGATTCharacteristic;
  txCharacteristic: BluetoothRemoteGATTCharacteristic;
}

interface BLEMessage {
  message: string;
  timestamp: Date;
  source: 'ble';
  topic?: string;
}

export const useBLE = () => {
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<BLEMessage[]>([]);
  const [bleService, setBleService] = useState<BLEService | null>(null);
  const [healthCheckInterval, setHealthCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  const handleDisconnection = useCallback(() => {
    console.log('BLE device disconnected');
    setConnected(false);
    setDevice(null);
    setBleService(null);
    
    // Clear health check interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      setHealthCheckInterval(null);
    }
    
    // Add disconnection message
    const disconnectionMessage: BLEMessage = {
      message: 'BLE device disconnected',
      timestamp: new Date(),
      source: 'ble'
    };
    setMessages(prev => [...prev.slice(-9), disconnectionMessage]);
  }, [healthCheckInterval]);

  const startHealthCheck = useCallback((service: BLEService) => {
    // Clear any existing interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    
    const interval = setInterval(async () => {
      try {
        // Check if server is still connected (silent operation)
        if (!service.server.connected) {
          console.log('Server disconnected, triggering disconnection handling');
          handleDisconnection();
          return;
        }
        
        // Additional check: try to get the service again (silent)
        await service.server.getPrimaryService(SERVICE_UUID);
      } catch (err) {
        console.log('Health check failed, device disconnected:', err);
        handleDisconnection();
      }
    }, 5000); // Check every 5 seconds
    
    setHealthCheckInterval(interval);
  }, [healthCheckInterval, handleDisconnection]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth is not supported on this device');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'ESP32-C6-SPARK-GATE' },
          { services: [SERVICE_UUID] }
        ],
        optionalServices: [SERVICE_UUID]
      });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Add disconnect event listener
      device.addEventListener('gattserverdisconnected', handleDisconnection);

      const service = await server.getPrimaryService(SERVICE_UUID);
      const rxCharacteristic = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
      const txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);

      // Set up notifications
      await txCharacteristic.startNotifications();
      txCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        const message = new TextDecoder().decode(value);
        
        const bleMessage: BLEMessage = {
          message,
          timestamp: new Date(),
          source: 'ble'
        };
        
        setMessages(prev => [...prev.slice(-9), bleMessage]);
      });

      const bleService: BLEService = {
        device,
        server,
        service,
        rxCharacteristic,
        txCharacteristic
      };

      setBleService(bleService);
      setDevice({
        id: device.id,
        name: device.name || 'Unknown Device',
        rssi: 0 // RSSI not available in Web Bluetooth API
      });
      setConnected(true);

      // Start health monitoring
      startHealthCheck(bleService);

      // Add connection message
      const connectionMessage: BLEMessage = {
        message: 'Connected to ESP32-C6-SPARK-GATE',
        timestamp: new Date(),
        source: 'ble'
      };
      setMessages(prev => [...prev.slice(-9), connectionMessage]);

    } catch (err) {
      console.error('BLE connection error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setConnected(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // Clear health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        setHealthCheckInterval(null);
      }
      
      if (bleService) {
        // Note: Web Bluetooth API doesn't support removeEventListener
        // The event listener will be automatically cleaned up when the device disconnects
        await bleService.server.disconnect();
        setBleService(null);
      }
      setDevice(null);
      setConnected(false);
      setError(null);
      
      // Add manual disconnect message
      const disconnectMessage: BLEMessage = {
        message: 'BLE manually disconnected',
        timestamp: new Date(),
        source: 'ble'
      };
      setMessages(prev => [...prev.slice(-9), disconnectMessage]);
    } catch (err) {
      console.error('BLE disconnect error:', err);
      setError(err instanceof Error ? err.message : 'Disconnect error');
    }
  }, [bleService, healthCheckInterval, handleDisconnection]);

  const sendCommand = useCallback(async (command: string) => {
    if (!bleService || !connected) {
      setError('Not connected to device');
      return;
    }

    try {
      const encoder = new TextEncoder();
      await bleService.rxCharacteristic.writeValue(encoder.encode(command));
      
      // Add sent message to log
      const sentMessage: BLEMessage = {
        message: `Sent: ${command}`,
        timestamp: new Date(),
        source: 'ble'
      };
      setMessages(prev => [...prev.slice(-9), sentMessage]);
      
    } catch (err) {
      console.error('BLE send error:', err);
      setError(err instanceof Error ? err.message : 'Send error');
      
      // If send fails, it might be due to disconnection
      // Trigger disconnection handling
      handleDisconnection();
    }
  }, [bleService, connected, handleDisconnection]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      
      // Disconnect if still connected
      if (bleService) {
        // Note: Web Bluetooth API doesn't support removeEventListener
        // The event listener will be automatically cleaned up when the device disconnects
        bleService.server.disconnect();
      }
    };
  }, [bleService, healthCheckInterval, handleDisconnection]);

  return {
    connected,
    device,
    error,
    connect,
    disconnect,
    sendCommand,
    messages,
    clearMessages
  };
};
