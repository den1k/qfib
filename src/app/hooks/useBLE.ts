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

  const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

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
      if (bleService) {
        await bleService.server.disconnect();
        setBleService(null);
      }
      setDevice(null);
      setConnected(false);
      setError(null);
    } catch (err) {
      console.error('BLE disconnect error:', err);
      setError(err instanceof Error ? err.message : 'Disconnect error');
    }
  }, [bleService]);

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
    }
  }, [bleService, connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bleService) {
        bleService.server.disconnect();
      }
    };
  }, [bleService]);

  return {
    connected,
    device,
    error,
    connect,
    disconnect,
    sendCommand,
    messages
  };
};
