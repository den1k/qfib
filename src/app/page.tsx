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
  } = useBLE();

  const { 
    isConnected: mqttConnected,
    messages: mqttMessages,
    error: mqttError,
    connect: connectMQTT,
    disconnect: disconnectMQTT,
    sendServoCommand: sendMQTTCommand,
    sendCustomAngle
  } = useMQTT();
  
  const [input, setInput] = useState('');
  const [customAngle, setCustomAngle] = useState('90');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('wss://x21717ca.ala.us-east-1.emqxsl.com:8443/mqtt');
  const [provisionSent, setProvisionSent] = useState(false);
  const [activeMode, setActiveMode] = useState<'ble' | 'mqtt'>('ble');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [bleMessages, mqttMessages]);

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
    if (!bleConnected || !ssid || !password || !url) {
      alert('Connect to device via BLE and fill all fields');
      return;
    }

    const provisionCommand = `PROVISION:ssid=${ssid};pass=${password};url=${url}`;
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

  const allMessages = [...bleMessages, ...mqttMessages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="retro-title">fiBLE</h1>
          
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
          <div className="flex gap-4 mb-6">
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
              <div className="md:col-span-2">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  MQTT Broker URL
                </label>
            <input
                  type="text"
                  id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="wss://broker.emqx.io:8443/mqtt"
            />
          </div>
          <button
            type="submit"
                disabled={!bleConnected || !ssid || !password || !url}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !bleConnected || !ssid || !password || !url
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
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

        {/* Messages */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Messages</h2>
          <div className="bg-gray-50 rounded-lg p-4 messages-container">
            {allMessages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet...</p>
            ) : (
              allMessages.map((msg, index) => (
                <div key={index} className="mb-2 p-2 bg-white rounded border-l-4 border-blue-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        {msg.source === 'ble' ? '📱 BLE' : '🌐 MQTT'}: {msg.topic || 'Command'}
                      </span>
                      <p className="text-gray-800">{msg.message}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
              </div>
    </div>
  );
}