'use client';

import { useState, useEffect, useRef } from 'react';
import { useBLE } from './hooks/useBLE';
import { useMQTT } from './hooks/useMQTT';
import { useFormSchema } from './hooks/useFormSchema';
import { useCommandTracker } from './hooks/useCommandTracker';
import { DynamicFormRenderer } from './components/DynamicFormRenderer';
import { SchemaEditor } from './components/SchemaEditor';
import { CommandStatus } from './components/CommandStatus';
import { defaultSchemas } from './defaults/defaultSchemas';
import { generateCommandId } from './utils/idGenerator';

import { MQTTConfig, MQTT_CONFIG_STORAGE_KEY, createDefaultMQTTConfig } from '@/app/utils/mqttConfig';

export default function Home() {
  const {
    commands,
    trackCommand,
    parseResponse,
    clearCommands
  } = useCommandTracker();

  // Load MQTT config from localStorage (must be before useMQTT)
  const [mqttConfig, setMqttConfig] = useState<MQTTConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(MQTT_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const { 
    connected: bleConnected, 
    error: bleError, 
    connect: connectBLE, 
    disconnect: disconnectBLE, 
    sendCommand: sendBLECommand, 
    device, 
    messages: bleMessages,
    clearMessages: clearBLEMessages
  } = useBLE({ onResponse: parseResponse });

  const { 
    isConnected: mqttConnected,
    messages: mqttMessages,
    error: mqttError,
    connect: connectMQTT,
    disconnect: disconnectMQTT,
    sendServoCommand: sendMQTTCommand,
    publishCommand: publishMQTTCommand,
    clearMessages: clearMQTTMessages
  } = useMQTT({ 
    onResponse: parseResponse,
    config: mqttConfig,
    autoConnect: false, // Don't auto-connect on home page
  });

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
  const [showMqttConfig, setShowMqttConfig] = useState(false);
  
  // Initialize form with saved config or defaults
  const [mqttConfigForm, setMqttConfigForm] = useState<MQTTConfig>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(MQTT_CONFIG_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Fall through to defaults
        }
      }
    }
    return createDefaultMQTTConfig();
  });

  // Only reset form when opening the editor (load from saved config)
  useEffect(() => {
    if (showMqttConfig) {
      const stored = localStorage.getItem(MQTT_CONFIG_STORAGE_KEY);
      if (stored) {
        try {
          const saved = JSON.parse(stored);
          setMqttConfigForm(saved);
        } catch {
          // Keep current form values if parse fails
        }
      }
    }
  }, [showMqttConfig]); // Only reset when opening the editor
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize default schemas if none exist
  useEffect(() => {
    if (schemas.length === 0) {
      defaultSchemas.forEach(schema => saveSchema(schema));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemas.length]); // Only depend on schemas.length to avoid unnecessary re-runs

  const scrollToBottom = () => {
    // Directly scroll the container to bottom without using scrollIntoView
    // This prevents iOS from scrolling the viewport
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Unified command sender with command tracking
  const sendCommand = (command: string) => {
    const cmdId = generateCommandId();
    const commandWithId = `${cmdId}:${command}`;
    
    // Track the command
    trackCommand(cmdId, command, activeMode);
    
    if (activeMode === 'ble') {
      sendBLECommand(commandWithId);
    } else if (activeMode === 'mqtt') {
      publishMQTTCommand(commandWithId);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendCommand(input.trim());
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
    const cmdId = generateCommandId();
    const commandWithId = `${cmdId}:${provisionCommand}`;
    
    trackCommand(cmdId, provisionCommand, 'ble');
    sendBLECommand(commandWithId);
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

  const handleAbortAll = () => {
    // Send abort command for all running commands
    sendCommand('abort');
  };

  const handleAbortCommand = (commandId: string) => {
    // Send abort command for a specific command
    sendCommand(`abort:${commandId}`);
  };

  const handlePauseAll = () => {
    // Send pause command for all running commands
    sendCommand('pause');
  };

  const handlePauseCommand = (commandId: string) => {
    // Send pause command for a specific command
    sendCommand(`pause:${commandId}`);
  };

  const handleResumeAll = () => {
    // Send resume command for all paused commands
    sendCommand('resume');
  };

  const handleResumeCommand = (commandId: string) => {
    // Send resume command for a specific command
    sendCommand(`resume:${commandId}`);
  };

  const handleMqttConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save to localStorage
      localStorage.setItem(MQTT_CONFIG_STORAGE_KEY, JSON.stringify(mqttConfigForm));
      setMqttConfig(mqttConfigForm);
      setShowMqttConfig(false);
    } catch (err) {
      console.error('Failed to save MQTT config:', err);
      alert('Failed to save MQTT config');
    }
  };

  const allMessages = [...bleMessages, ...mqttMessages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Scroll messages container when new messages arrive or when a command is sent
  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages.length]);

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-4xl mx-auto">
        
        
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
          <div className="flex gap-2 mb-3">
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
                <button onClick={connectMQTT} disabled={mqttConnected || !mqttConfig?.brokerUrl}>
                  CONNECT MQTT
                </button>
                <button onClick={disconnectMQTT} disabled={!mqttConnected}>
                  DISCONNECT MQTT
                </button>
                <button
                  onClick={() => setShowMqttConfig(!showMqttConfig)}
                  className="text-xs px-2 py-1"
                >
                  {showMqttConfig ? 'HIDE MQTT CONFIG' : 'EDIT MQTT CONFIG'}
                </button>
              </>
            )}
          </div>

          {/* MQTT Config Form */}
          {activeMode === 'mqtt' && showMqttConfig && (
            <form onSubmit={handleMqttConfigSave} className="border border-green-500 p-3 mb-4">
              <div className="space-y-2">
                <div>
                  <label htmlFor="brokerUrl" className="block text-xs mb-1">
                    Broker URL
                  </label>
                  <input
                    type="text"
                    id="brokerUrl"
                    value={mqttConfigForm.brokerUrl}
                    onChange={(e) =>
                      setMqttConfigForm({ ...mqttConfigForm, brokerUrl: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-xs mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={mqttConfigForm.username}
                    onChange={(e) =>
                      setMqttConfigForm({ ...mqttConfigForm, username: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={mqttConfigForm.password}
                    onChange={(e) =>
                      setMqttConfigForm({ ...mqttConfigForm, password: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="commandTopic" className="block text-xs mb-1">
                    Command Topic
                  </label>
                  <input
                    type="text"
                    id="commandTopic"
                    value={mqttConfigForm.commandTopic}
                    onChange={(e) =>
                      setMqttConfigForm({ ...mqttConfigForm, commandTopic: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="statusTopic" className="block text-xs mb-1">
                    Status Topic
                  </label>
                  <input
                    type="text"
                    id="statusTopic"
                    value={mqttConfigForm.statusTopic}
                    onChange={(e) =>
                      setMqttConfigForm({ ...mqttConfigForm, statusTopic: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm"
                    required
                  />
                </div>
                <button type="submit" className="text-xs px-2 py-1">
                  SAVE MQTT CONFIG
                </button>
              </div>
            </form>
          )}
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
                {schemas.map((schema, index) => (
                  <option key={schema.id} value={schema.id}>
                    {(schema.schema as any)?.title || `Schema ${index + 1}`}
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
              onCommand={(cmd: string) => sendCommand(cmd)}
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

        {/* Command Status Section */}
        <CommandStatus 
          commands={commands} 
          onClear={clearCommands} 
          onAbortAll={handleAbortAll}
          onAbortCommand={handleAbortCommand}
          onPauseAll={handlePauseAll}
          onPauseCommand={handlePauseCommand}
          onResumeAll={handleResumeAll}
          onResumeCommand={handleResumeCommand}
        />

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
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto messages-container p-2">
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

