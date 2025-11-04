'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getInstantDB } from '@/app/utils/instantdb';
import { useProject } from '@/app/hooks/useProject';
import { useMQTT } from '@/app/hooks/useMQTT';
import { useBLE } from '@/app/hooks/useBLE';
import { useCommandTracker } from '@/app/hooks/useCommandTracker';
import { DynamicFormRenderer } from '@/app/components/DynamicFormRenderer';
import { SchemaEditor } from '@/app/components/SchemaEditor';
import { CommandStatus } from '@/app/components/CommandStatus';
import { generateCommandId } from '@/app/utils/idGenerator';
import { ControlSet } from '@/types/controlSet';
import { FormSchema } from '@/types/formSchema';

const db = getInstantDB();

export default function ProjectPage() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  if (!projectId) {
    return (
      <div className="min-h-screen p-2 flex items-center justify-center">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  const { project, updateControlSets, updateMqttConfig, updateProject } = useProject(projectId);
  
  // Handle auth state - allow unauthenticated users for public projects
  // useAuth must be called unconditionally if db exists
  const authState = db?.useAuth();
  const isLoading = authState?.isLoading ?? false;
  const user = authState?.user ?? null;

  const isAuthor = project && user && project.userId === user.id;
  const isPublicProject = project?.public === true;
  const canEdit = isAuthor; // Only authors can edit

  const {
    commands,
    trackCommand,
    updateCommandStatus,
    parseResponse,
    clearCommands,
  } = useCommandTracker();

  const {
    connected: bleConnected,
    error: bleError,
    connect: connectBLE,
    disconnect: disconnectBLE,
    sendCommand: sendBLECommand,
    messages: bleMessages,
    clearMessages: clearBLEMessages,
  } = useBLE({ onResponse: parseResponse });

  // Use project's MQTT config if available
  const mqttConfig = project?.mqttConfig;
  const hasMqttConfig = Boolean(mqttConfig && mqttConfig.brokerUrl);
  const {
    isConnected: mqttConnected,
    messages: mqttMessages,
    error: mqttError,
    connect: connectMQTT,
    disconnect: disconnectMQTT,
    publishCommand: publishMQTTCommand,
    clearMessages: clearMQTTMessages,
  } = useMQTT({
    onResponse: parseResponse,
    config: mqttConfig,
    autoConnect: hasMqttConfig, // Auto-connect if project has MQTT config
  });

  const controlSets: ControlSet[] = project?.controlSets || [];

  const [activeControlSetId, setActiveControlSetId] = useState<string>('');
  const [activeSchemaId, setActiveSchemaId] = useState<string>('');

  // Initialize active control set and schema
  useEffect(() => {
    if (controlSets.length > 0 && !activeControlSetId) {
      setActiveControlSetId(controlSets[0].id);
      if (controlSets[0].schemas.length > 0) {
        setActiveSchemaId(controlSets[0].schemas[0].id);
      }
    }
  }, [controlSets, activeControlSetId]);

  const activeControlSet = controlSets.find(cs => cs.id === activeControlSetId);
  const activeSchema = activeControlSet?.schemas.find(s => s.id === activeSchemaId) || activeControlSet?.schemas[0] || null;

  const handleSchemaSave = async (schema: FormSchema) => {
    if (!activeControlSet) return;
    
    const updatedSchemas = activeControlSet.schemas.map(s => s.id === schema.id ? schema : s);
    if (!updatedSchemas.find(s => s.id === schema.id)) {
      updatedSchemas.push(schema);
    }
    
    const updatedControlSets = controlSets.map(cs => 
      cs.id === activeControlSetId ? { ...cs, schemas: updatedSchemas } : cs
    );
    
    await updateControlSets(updatedControlSets);
    setShowSchemaEditor(false);
  };

  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<'ble' | 'mqtt'>('mqtt');
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [showMqttConfig, setShowMqttConfig] = useState(false);
  const [mqttConfigForm, setMqttConfigForm] = useState(mqttConfig || {
    brokerUrl: '',
    username: '',
    password: '',
    commandTopic: 'fible/command',
    statusTopic: 'fible/status',
    clientId: `webapp-client-${Math.random().toString(16).slice(2, 10)}`,
  });

  // Update form when project loads
  useEffect(() => {
    if (project?.mqttConfig) {
      setMqttConfigForm(project.mqttConfig);
    }
  }, [project]);


  if (isLoading) {
    return (
      <div className="min-h-screen p-2 flex items-center justify-center">
        <div className="text-sm">Loading project data...</div>
      </div>
    );
  }

  // Check if user needs to be signed in (only for private projects)
  // Note: We check this before checking if project exists, because if it's private and user isn't signed in,
  // the query won't return it, so project will be null
  if (!isLoading && !project) {
    // If we're still loading, wait. Otherwise, project not found or not accessible
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="retro-title mb-4">Project</h1>
          <div className="border-t border-green-500 mb-4"></div>
          <div className="text-sm">
            Project not found or you don't have access to it.
          </div>
          <Link href="/projects" className="text-xs underline">Back to Projects</Link>
        </div>
      </div>
    );
  }

  // If project exists but is private and user is not signed in
  if (project && !project.public && !user) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="retro-title mb-4">Project</h1>
          <div className="border-t border-green-500 mb-4"></div>
          <div className="text-sm">
            This project is private. Please sign in to view it. <a href="/" className="underline">Go home</a>
          </div>
        </div>
      </div>
    );
  }

  // If no project yet, show loading
  if (!project) {
    return (
      <div className="min-h-screen p-2 flex items-center justify-center">
        <div className="text-sm">Loading project data...</div>
      </div>
    );
  }

  const sendCommand = (command: string) => {
    const cmdId = generateCommandId();
    const commandWithId = `${cmdId}:${command}`;

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



  const handleMqttConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMqttConfig(mqttConfigForm);
      setShowMqttConfig(false);
      // Disconnect and reconnect with new config
      disconnectMQTT();
      setTimeout(() => {
        connectMQTT();
      }, 500);
    } catch (err) {
      console.error('Failed to save MQTT config:', err);
      alert('Failed to save MQTT config');
    }
  };

  const clearAllMessages = () => {
    clearBLEMessages();
    clearMQTTMessages();
  };

  const allMessages = [...bleMessages, ...mqttMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-4xl mx-auto">
        
        {/* Project Header */}
        <div className="mb-4 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              <span className="opacity-60">{'>'}</span>{' '}
              <span>project:</span>{' '}
              <span>{project.name}</span>
            </div>
            <Link href="/projects" className="text-xs underline">← Back to Projects</Link>
          </div>
          <div className="border-t border-green-500 mb-4 relative">
            {/* Show view only indicator if viewing a public project */}
            {isPublicProject && !isAuthor && (
              <div className="absolute right-0 top-2">
                <span className="text-xs opacity-70">view only</span>
              </div>
            )}
          </div>

          {/* Public Toggle (only for authors) */}
          {isAuthor && (
            <div className="mb-2 flex items-center gap-2">
              <label className="text-xs flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.public || false}
                  onChange={(e) => {
                    updateProject({ public: e.target.checked });
                  }}
                  className="cursor-pointer"
                />
                <span>Make project public</span>
              </label>
              {project.public && (
                <span className="text-xs opacity-70">(Anyone can view, but only you can edit)</span>
              )}
            </div>
          )}

          {/* MQTT Config Toggle (only for authors) */}
          {canEdit && (
            <button
              onClick={() => setShowMqttConfig(!showMqttConfig)}
              className="text-xs px-2 py-1 mb-2"
            >
              {showMqttConfig ? 'HIDE MQTT CONFIG' : 'EDIT MQTT CONFIG'}
            </button>
          )}

          {showMqttConfig && (
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

        {/* Connection Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3 uppercase tracking-wider">Connection</h2>

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

          <div className="mb-3 text-sm">
            {activeMode === 'ble'
              ? bleConnected
                ? '🟢 BLE Connected'
                : '🔴 BLE Disconnected'
              : mqttConnected
              ? '🟢 MQTT Connected'
              : '🔴 MQTT Disconnected'}
            {(bleError || mqttError) && (
              <div className="text-red-500 mt-1">
                Error: {activeMode === 'ble' ? bleError : mqttError}
              </div>
            )}
          </div>

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

        <div className="border-t border-green-500 mb-4"></div>

        {/* Control Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3 uppercase tracking-wider">Control</h2>

          <div className="flex gap-2 items-center mb-2">
            {controlSets.length > 1 && (
              <select
                value={activeControlSetId}
                onChange={(e) => {
                  setActiveControlSetId(e.target.value);
                  const controlSet = controlSets.find(cs => cs.id === e.target.value);
                  if (controlSet && controlSet.schemas.length > 0) {
                    setActiveSchemaId(controlSet.schemas[0].id);
                  }
                }}
                className="text-xs"
                style={{
                  height: '24px',
                  padding: '2px 20px 2px 4px',
                  lineHeight: '20px',
                }}
              >
                {controlSets.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.name}
                  </option>
                ))}
              </select>
            )}
            {activeControlSet && activeControlSet.schemas.length > 1 && (
              <select
                value={activeSchemaId}
                onChange={(e) => setActiveSchemaId(e.target.value)}
                className="text-xs"
                style={{
                  height: '24px',
                  padding: '2px 20px 2px 4px',
                  lineHeight: '20px',
                }}
              >
                {activeControlSet.schemas.map((schema) => (
                  <option key={schema.id} value={schema.id}>
                    {schema.name}
                  </option>
                ))}
              </select>
            )}
            {canEdit && (
              <button
                onClick={() => setShowSchemaEditor(!showSchemaEditor)}
                className="text-xs px-2 py-1"
                style={{ height: '24px' }}
              >
                {showSchemaEditor ? 'HIDE EDITOR' : 'EDIT SCHEMA'}
              </button>
            )}
          </div>

          {showSchemaEditor && canEdit ? (
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

        <div className="border-t border-green-500 mb-4"></div>

        {/* Command Status Section */}
        <CommandStatus
          commands={commands}
          onClear={clearCommands}
          onAbortAll={() => sendCommand('abort')}
          onAbortCommand={(cmdId) => sendCommand(`abort:${cmdId}`)}
          onPauseAll={() => sendCommand('pause')}
          onPauseCommand={(cmdId) => sendCommand(`pause:${cmdId}`)}
          onResumeAll={() => sendCommand('resume')}
          onResumeCommand={(cmdId) => sendCommand(`resume:${cmdId}`)}
        />

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
            <div className="flex-1 overflow-y-auto messages-container p-2">
              {allMessages.length === 0 ? (
                <p className="text-sm opacity-70">No messages yet...</p>
              ) : (
                allMessages.map((msg, index) => (
                  <div key={index} className="text-xs mb-1">
                    <span className="opacity-70">
                      &gt; {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>{' '}
                    {msg.source === 'ble' ? '📱 BLE' : '🌐 MQTT'}: {msg.topic || 'Command'}
                    <div className="ml-4 whitespace-pre-wrap break-words">{msg.message}</div>
                  </div>
                ))
              )}
            </div>

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
