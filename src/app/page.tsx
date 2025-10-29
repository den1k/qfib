'use client';

import { useState, useEffect, useRef } from 'react';
import { useBLE } from './hooks/useBLE';
import { useMQTT } from './hooks/useMQTT';
import { useFormSchema } from './hooks/useFormSchema';
import { DynamicFormRenderer } from './components/DynamicFormRenderer';
import { SchemaEditor } from './components/SchemaEditor';
import { defaultSchemas } from './defaults/defaultSchemas';

export default function Home() {
  const { 
    connected: bleConnected, 
    error: bleError, 
    connect: connectBLE, 
    disconnect: disconnectBLE, 
    sendCommand: sendBLECommand, 
    device, 
    messages: bleMessages,
    clearMessages: clearBLEMessages
  } = useBLE();

  const { 
    isConnected: mqttConnected,
    messages: mqttMessages,
    error: mqttError,
    connect: connectMQTT,
    disconnect: disconnectMQTT,
    sendServoCommand: sendMQTTCommand,
    publishCommand: publishMQTTCommand,
    clearMessages: clearMQTTMessages
  } = useMQTT();

  const {
    schemas,
    activeSchema,
    saveSchema,
    deleteSchema,
    setActiveSchema
  } = useFormSchema();
  
  const [input, setInput] = useState('');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [provisionSent, setProvisionSent] = useState(false);
  const [activeMode, setActiveMode] = useState<'ble' | 'mqtt'>('mqtt');
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize default schemas if none exist
  useEffect(() => {
    if (schemas.length === 0) {
      defaultSchemas.forEach(schema => saveSchema(schema));
    }
  }, [schemas.length, saveSchema]);

  // Temporary: Clear old schemas and reload defaults (remove this after first run)
  useEffect(() => {
    const hasOldSpeedSchema = schemas.some(schema => 
      schema.id === 'advanced-controls' && 
      schema.schema.properties && 
      schema.schema.properties.speed
    );
    
    if (hasOldSpeedSchema) {
      console.log('Clearing old schemas with speed field...');
      localStorage.removeItem('esp32-form-schemas');
      localStorage.removeItem('esp32-active-schema');
      window.location.reload();
    }
  }, [schemas]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Unified command sender
  const sendCommand = (command: string) => {
    if (activeMode === 'ble') {
      sendBLECommand(command);
    } else if (activeMode === 'mqtt') {
      publishMQTTCommand(command);
    }
  };

  useEffect(() => {
    // Only scroll to bottom if there are messages to avoid scrolling on initial load
    const currentMessages = activeMode === 'ble' ? bleMessages : mqttMessages;
    if (currentMessages.length > 0) {
      scrollToBottom();
    }
  }, [bleMessages, mqttMessages, activeMode]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      if (activeMode === 'ble' && bleConnected) {
        sendBLECommand(input.trim());
      } else if (activeMode === 'mqtt' && mqttConnected) {
        sendMQTTCommand(input.trim());
      }
      setInput('');
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bleConnected || !ssid || !password) {
      alert('Connect to device via BLE and fill WiFi credentials');
      return;
    }

    const provisionCommand = `PROVISION:ssid=${ssid};pass=${password}`;
    sendBLECommand(provisionCommand);
    setProvisionSent(true);
  };

  const handleSchemaSave = (schema: any) => {
    saveSchema(schema);
    setShowSchemaEditor(false);
  };

  const clearAllMessages = () => {
    clearBLEMessages();
    clearMQTTMessages();
  };

  const allMessages = [...bleMessages, ...mqttMessages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="retro-title mb-4">qfib</h1>
        
        {/* Divider */}
        <div className="border-t border-green-500 mb-4"></div>
        
        {/* Connection Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3 uppercase tracking-wider">Connection</h2>
          
          {/* Mode Selection */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveMode('ble')}
              className={`mode-button ${activeMode === 'ble' ? 'active' : ''}`}
            >
              📱 BLE MODE
            </button>
            <button
              onClick={() => setActiveMode('mqtt')}
              className={`mode-button ${activeMode === 'mqtt' ? 'active' : ''}`}
            >
              🌐 MQTT MODE
            </button>
          </div>

          {/* Connection Status */}
          <div className="mb-3 text-sm">
            {activeMode === 'ble' 
              ? (bleConnected ? '🟢 BLE Connected' : '🔴 BLE Disconnected')
              : (mqttConnected ? '🟢 MQTT Connected' : '🔴 MQTT Disconnected')
            }
            {(bleError || mqttError) && (
              <div className="text-red-500 mt-1">
                Error: {activeMode === 'ble' ? bleError : mqttError}
              </div>
            )}
          </div>

          {/* Connection Controls */}
          <div className="flex gap-2">
            {activeMode === 'ble' ? (
              <>
                <button onClick={connectBLE} disabled={bleConnected}>
                  CONNECT BLE
                </button>
                <button onClick={disconnectBLE} disabled={!bleConnected}>
                  DISCONNECT BLE
                </button>
              </>
            ) : (
              <>
                <button onClick={connectMQTT} disabled={mqttConnected}>
                  CONNECT MQTT
                </button>
                <button onClick={disconnectMQTT} disabled={!mqttConnected}>
                  DISCONNECT MQTT
                </button>
              </>
            )}
          </div>
        </div>

        {/* WiFi Provisioning Section (BLE Only) */}
        {activeMode === 'ble' && (
          <div className="mb-4 mt-4">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider opacity-80">WiFi Provisioning</h3>
            
            <form onSubmit={handleProvision} className="space-y-2">
              <div>
                <label htmlFor="ssid" className="block text-xs mb-1">
                  SSID
                </label>
                <input
                  type="text"
                  id="ssid"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  placeholder="WiFi network name"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs mb-1">
                  PASSWORD
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  placeholder="WiFi password"
                />
              </div>
              <button
                type="submit"
                disabled={!bleConnected || !ssid || !password}
              >
                PROVISION ESP32
              </button>
            </form>
            
            {provisionSent && (
              <div className="mt-2 text-xs opacity-80">
                ✓ Provisioning command sent! ESP32 will reboot and connect to WiFi.
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-green-500 mb-4"></div>

        {/* Control Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3 uppercase tracking-wider">Control</h2>
          
          <div className="flex gap-2 items-center mb-2">
            {schemas.length > 1 && (
              <select
                value={activeSchema?.id || ''}
                onChange={(e) => setActiveSchema(e.target.value)}
                className="text-xs"
                style={{ 
                  height: '24px', 
                  padding: '2px 20px 2px 4px',
                  lineHeight: '20px'
                }}
              >
                {schemas.map(schema => (
                  <option key={schema.id} value={schema.id}>
                    {schema.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowSchemaEditor(!showSchemaEditor)}
              className="text-xs px-2 py-1"
              style={{ height: '24px' }}
            >
              {showSchemaEditor ? 'HIDE EDITOR' : 'EDIT SCHEMA'}
            </button>
          </div>
          
          {showSchemaEditor ? (
            <SchemaEditor
              onSave={handleSchemaSave}
              currentSchema={activeSchema}
            />
          ) : (
            <DynamicFormRenderer
              schema={activeSchema}
              connected={activeMode === 'ble' ? bleConnected : mqttConnected}
              onCommand={sendCommand}
            />
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-green-500 mb-4"></div>

        {/* Messages Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold uppercase tracking-wider">Messages</h2>
            <button
              onClick={clearAllMessages}
              disabled={allMessages.length === 0}
              className="text-xs"
            >
              🗑️ CLEAR
            </button>
          </div>
          
          <div className="border border-green-500 flex flex-col" style={{ height: '300px' }}>
            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto messages-container p-2">
              {allMessages.length === 0 ? (
                <p className="text-sm opacity-70">No messages yet...</p>
              ) : (
                allMessages.map((msg, index) => (
                  <div key={index} className="text-xs mb-1">
                    <span className="opacity-70">
                      &gt; {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                    {' '}
                    {msg.source === 'ble' ? '📱 BLE' : '🌐 MQTT'}: {msg.topic || 'Command'}
                    <div className="ml-4 whitespace-pre-wrap break-words">
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Command Input at Bottom */}
            <div className="border-t border-green-500">
              <form onSubmit={handleSend} className="flex">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-2 py-1 bg-black text-green-500 text-sm border-0"
                  placeholder="Enter command..."
                  style={{ outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                  className="text-xs px-3"
                  style={{ margin: 0, borderLeft: '1px solid var(--terminal-green)' }}
                >
                  SEND
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

