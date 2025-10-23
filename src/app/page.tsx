'use client';

import { useState, useEffect, useRef } from 'react';
import { useBLE } from './hooks/useBLE';
import { useMQTT } from './hooks/useMQTT';

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
    sendCustomAngle,
    clearMessages: clearMQTTMessages
  } = useMQTT();
  
  const [input, setInput] = useState('');
  const [customAngle, setCustomAngle] = useState('90');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [provisionSent, setProvisionSent] = useState(false);
  const [activeMode, setActiveMode] = useState<'ble' | 'mqtt'>('mqtt');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleCustomAngle = (e: React.FormEvent) => {
    e.preventDefault();
    const angle = parseInt(customAngle);
    if (!isNaN(angle)) {
      if (activeMode === 'ble' && bleConnected) {
        sendBLECommand(angle.toString());
      } else if (activeMode === 'mqtt' && mqttConnected) {
        sendCustomAngle(angle);
      }
    }
  };

  const sendDirectionCommand = (command: string) => {
    if (activeMode === 'ble' && bleConnected) {
      sendBLECommand(command);
    } else if (activeMode === 'mqtt' && mqttConnected) {
      sendMQTTCommand(command as any);
    }
  };

  const clearAllMessages = () => {
    clearBLEMessages();
    clearMQTTMessages();
  };

  const allMessages = [...bleMessages, ...mqttMessages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto h-full grid grid-rows-[auto_1fr] gap-4">
        {/* Fixed Header Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="retro-title">qfib</h1>
          
          {/* Mode Selection */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveMode('ble')}
              className={`mode-button ${activeMode === 'ble' ? 'active' : ''}`}
            >
              <span className="flex items-center justify-center gap-2">
                📱 <span className="font-semibold">BLE Mode</span>
              </span>
            </button>
            <button
              onClick={() => setActiveMode('mqtt')}
              className={`mode-button ${activeMode === 'mqtt' ? 'active' : ''}`}
            >
              <span className="flex items-center justify-center gap-2">
                🌐 <span className="font-semibold">MQTT Mode</span>
              </span>
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeMode === 'ble' 
                ? (bleConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                : (mqttConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
            }`}>
              {activeMode === 'ble' 
                ? (bleConnected ? '🟢 BLE Connected' : '🔴 BLE Disconnected')
                : (mqttConnected ? '🟢 MQTT Connected' : '🔴 MQTT Disconnected')
              }
            </div>
            
            {(bleError || mqttError) && (
              <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm">
                Error: {activeMode === 'ble' ? bleError : mqttError}
              </div>
            )}
          </div>

          {/* Connection Controls */}
          <div className="flex gap-4">
            {activeMode === 'ble' ? (
              <>
                <button
                  onClick={connectBLE}
                  disabled={bleConnected}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    bleConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Connect BLE
                </button>
                
                <button
                  onClick={disconnectBLE}
                  disabled={!bleConnected}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    !bleConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Disconnect BLE
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={connectMQTT}
                  disabled={mqttConnected}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    mqttConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Connect MQTT
                </button>
                
                <button
                  onClick={disconnectMQTT}
                  disabled={!mqttConnected}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    !mqttConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Disconnect MQTT
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 overflow-y-auto min-h-0">
          {/* Provisioning Section (BLE Only) */}
          {activeMode === 'ble' && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">WiFi Provisioning</h2>
              <form onSubmit={handleProvision} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                  <label htmlFor="ssid" className="block text-sm font-medium text-gray-700 mb-2">
                    WiFi SSID
                  </label>
              <input
                type="text"
                    id="ssid"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter WiFi SSID"
              />
            </div>
            <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    WiFi Password
                  </label>
              <input
                type="password"
                    id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter WiFi password"
              />
            </div>
            <button
              type="submit"
                  disabled={!bleConnected || !ssid || !password}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    !bleConnected || !ssid || !password
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  Provision ESP32
            </button>
          </form>
              {provisionSent && (
                <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded-lg">
                  Provisioning command sent! The ESP32 will reboot and connect to WiFi.
                </div>
              )}
            </div>
          )}

          {/* Servo Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Direction Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Direction Controls</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => sendDirectionCommand('up')}
                  disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                  className={`p-4 rounded-lg font-medium transition-colors ${
                    (activeMode === 'ble' ? !bleConnected : !mqttConnected)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  ⬆️ Up (180°)
                </button>
                
                <button
                  onClick={() => sendDirectionCommand('down')}
                  disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                  className={`p-4 rounded-lg font-medium transition-colors ${
                    (activeMode === 'ble' ? !bleConnected : !mqttConnected)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  ⬇️ Down (0°)
                </button>
                
                <button
                  onClick={() => sendDirectionCommand('left')}
                  disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                  className={`p-4 rounded-lg font-medium transition-colors ${
                    (activeMode === 'ble' ? !bleConnected : !mqttConnected)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  ⬅️ Left (45°)
                </button>
                
                <button
                  onClick={() => sendDirectionCommand('right')}
                  disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                  className={`p-4 rounded-lg font-medium transition-colors ${
                    (activeMode === 'ble' ? !bleConnected : !mqttConnected)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  ➡️ Right (135°)
                </button>
              </div>
            </div>

            {/* Custom Angle Control */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Custom Angle</h2>
              <form onSubmit={handleCustomAngle} className="space-y-4">
                <div>
                  <label htmlFor="angle" className="block text-sm font-medium text-gray-700 mb-2">
                    Angle (0-180°)
                  </label>
                  <input
                    type="number"
                    id="angle"
                    min="0"
                    max="180"
                    value={customAngle}
                    onChange={(e) => setCustomAngle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter angle (0-180)"
                  />
                </div>
                <button
                  type="submit"
                  disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    (activeMode === 'ble' ? !bleConnected : !mqttConnected)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Set Angle
                </button>
              </form>
            </div>
          </div>

          {/* Custom Command Input */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Custom Command</h2>
            <form onSubmit={handleSend} className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter custom command (e.g., 'up', 'down', '90')"
            />
            <button
              type="submit"
                disabled={activeMode === 'ble' ? !bleConnected : !mqttConnected}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  (activeMode === 'ble' ? !bleConnected : !mqttConnected)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              Send
            </button>
          </form>
          </div>
          </div>

          {/* Right Column - Messages */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            <button
              onClick={clearAllMessages}
              disabled={allMessages.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                allMessages.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              🗑️ Clear Messages
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 flex-1 min-h-0 overflow-y-auto messages-container">
            {allMessages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet...</p>
            ) : (
              allMessages.map((msg, index) => (
                <div key={index}>
                  {index > 0 && (
                    <div className="flex items-center my-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                  )}
                  <div className={`p-3 rounded-lg border-l-4 shadow-sm ${
                    msg.source === 'ble' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          <span className="text-xs text-gray-500 mr-2">
                            <span className="text-gray-400">&gt; </span>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                          {' '}
                          {msg.source === 'ble' ? '📱 BLE' : '🌐 MQTT'}: {msg.topic || 'Command'}
                        </span>
                        <div 
                          className="text-gray-800 font-mono text-sm leading-relaxed"
                          style={{ 
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'JetBrains Mono, Courier New, monospace'
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}