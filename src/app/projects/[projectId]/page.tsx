'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getInstantDB } from '@/app/utils/instantdb';
import { useProject } from '@/app/hooks/useProject';
import { useMQTT } from '@/app/hooks/useMQTT';
import { useBLE } from '@/app/hooks/useBLE';
import { useCommandTracker } from '@/app/hooks/useCommandTracker';
import { HTMLControlRenderer } from '@/app/components/HTMLControlRenderer';
import { SchemaEditor } from '@/app/components/SchemaEditor';
import { CommandStatus } from '@/app/components/CommandStatus';
import { generateCommandId } from '@/app/utils/idGenerator';
import { createDefaultMQTTConfig } from '@/app/utils/mqttConfig';
import { ControlSet } from '@/types/controlSet';
import { FormSchema } from '@/types/formSchema';

const db = getInstantDB();

export default function ProjectPage() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  // Call ALL hooks first, before any conditional returns
  // This ensures hooks are always called in the same order
  const { project, updateControlSets, updateMqttConfig, updateProject } = useProject(projectId || '');
  
  // Handle auth state - allow unauthenticated users for public projects
  // useAuth must be called unconditionally if db exists
  const authState = db?.useAuth();
  const isLoading = authState?.isLoading ?? false;
  const user = authState?.user ?? null;

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
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<'ble' | 'mqtt'>('ble');  // Default to BLE
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [showMqttConfig, setShowMqttConfig] = useState(false);
  const [mqttConfigForm, setMqttConfigForm] = useState(() => 
    mqttConfig || createDefaultMQTTConfig()
  );

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Compute allMessages early (needed for useEffect)
  const allMessages = [...bleMessages, ...mqttMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const scrollToBottom = () => {
    // Directly scroll the container to bottom without using scrollIntoView
    // This prevents iOS from scrolling the viewport
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Initialize active control set and schema
  useEffect(() => {
    if (controlSets.length > 0 && !activeControlSetId) {
      setActiveControlSetId(controlSets[0].id);
    }
  }, [controlSets, activeControlSetId]);

  // Only reset form when opening the editor (load from project config)
  useEffect(() => {
    if (showMqttConfig && project?.mqttConfig) {
      setMqttConfigForm(project.mqttConfig);
    }
  }, [showMqttConfig]); // Only when opening the editor, not when project changes

  // Scroll messages container when new messages arrive or when a command is sent
  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages.length]);

  useEffect(() => {
    if (project) {
      if (project.mqttConfig?.brokerUrl) {
        setActiveMode('mqtt');
      } else {
        setActiveMode('ble');
      }
    }
  }, [project]);

  // Now handle early returns AFTER all hooks are called
  if (!projectId) {
    return (
      <div className="min-h-screen p-2 flex items-center justify-center">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  const isAuthor = project && user && project.userId === user.id;
  const isPublicProject = project?.public === true;
  const canEdit = isAuthor; // Only authors can edit

  const activeControlSet = controlSets.find(cs => cs.id === activeControlSetId);
  const activeSchema = activeControlSet?.schemas[0] || null;  // Always the first/single

  const handleSchemaSave = async (schema: FormSchema) => {
    if (!activeControlSet) return;
    
    const updatedSchemas = [schema];  // Single schema per set
    const updatedControlSets = controlSets.map(cs => 
      cs.id === activeControlSetId ? { ...cs, schemas: updatedSchemas } : cs
    );
    
    await updateControlSets(updatedControlSets);
    setShowSchemaEditor(false);
  };

  const handleDeleteControlSet = async () => {
    if (!activeControlSet || controlSets.length <= 1) {
      alert('Cannot delete the last control set');
      return;
    }
    
    const controlSetName = activeControlSet.schemas[0]?.schema && (activeControlSet.schemas[0].schema as any)?.title || activeControlSet.name || 'Untitled';
    if (!confirm(`Delete control set "${controlSetName}"? This will delete all schemas in it.`)) {
      return;
    }
    
    const updatedControlSets = controlSets.filter(cs => cs.id !== activeControlSetId);
    await updateControlSets(updatedControlSets);
    
    // Switch to first available control set
    if (updatedControlSets.length > 0) {
      setActiveControlSetId(updatedControlSets[0].id);
      if (updatedControlSets[0].schemas.length > 0) {
        // setActiveSchemaId(updatedControlSets[0].schemas[0].id); // Removed
      } else {
        // setActiveSchemaId(''); // Removed
      }
    } else {
      setActiveControlSetId('');
      // setActiveSchemaId(''); // Removed
    }
  };

  const handleCreateControlSet = async () => {
    const schemaTitle = 'New Control';
    const newSchemaId = generateCommandId();
    const newControlSet: ControlSet = {
      id: generateCommandId(),
      schemas: [
        {
          id: newSchemaId,
          type: 'html',
          html: `<div class="flex flex-col items-center p-4">
  <h2 class="text-lg font-semibold mb-4">${schemaTitle}</h2>
  <p class="text-center opacity-70">Click "Edit" to customize this control.</p>
</div>`,
          htmlConfig: {
            globalSendMode: 'immediate',
            debounceMs: 300
          },
          schema: {
            title: schemaTitle,
            type: 'object'
          }
        }
      ]
    };
    
    const updatedControlSets = [...controlSets, newControlSet];
    await updateControlSets(updatedControlSets);
    
    setActiveControlSetId(newControlSet.id);
    setShowSchemaEditor(true);  // Open editor for the new single schema
  };

  const handleGenerateUI = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    const controller = new AbortController();  // For timeout/cancel
    const timeoutId = setTimeout(() => controller.abort(), 10000);  // 10s timeout

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      console.log('Starting client stream for prompt:', aiPrompt.substring(0, 50) + '...');

      const requestBody = {
        prompt: aiPrompt,
        contextHtml: activeSchema?.html || ''
      };

      const response = await fetch('/api/generate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      console.log('Stream response status:', response.status, response.headers.get('content-type'));  // Log response

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (!response.body) throw new Error('No response body');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';  // For accumulating partial lines across chunks

      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Client stream done, processing buffer');
            break;
          }

          if (!value) continue;

          buffer += decoder.decode(value, { stream: true });
          console.log('Client chunk length:', value.length, 'Buffer size:', buffer.length);  // Log progress

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';  // Keep incomplete line for next chunk

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              console.log('Client parsed event:', dataStr.substring(0, 100) + '...');

              if (dataStr === '[DONE]') {
                console.log('Client [DONE] received');
                continue;
              }

              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'partial') {
                  console.log('Partial update, length:', data.html.length);
                  // setPartialHtml(data.html); // No longer needed
                } else if (data.type === 'complete') {
                  console.log('Complete received, length:', data.html.length);
                  // setGeneratedHtml(data.html); // No longer needed
                  // setPartialHtml(''); // No longer needed
                  // Update the active schema's HTML
                  if (activeSchema) {
                    const updatedSchemas = activeControlSet?.schemas.map(s => s.id === activeSchema.id ? { ...s, html: data.html } : s);
                    if (updatedSchemas) {
                      const updatedControlSets = controlSets.map(cs => cs.id === activeControlSetId ? { ...cs, schemas: updatedSchemas } : cs);
                      await updateControlSets(updatedControlSets);
                    }
                  }
                } else if (data.type === 'error') {
                  console.error('Stream error:', data.message);
                  alert(`Generation error: ${data.message}`);
                  setAiGenerating(false);
                  return;
                }
              } catch (parseErr) {
                console.warn('Client parse error:', parseErr, 'on:', dataStr);
              }
            }
          }
        } catch (readErr: unknown) {
          const err = readErr as Error;
          if (err.name === 'AbortError') {
            console.log('Stream aborted (timeout)');
            alert('Generation timed out – try a simpler prompt.');
          } else {
            throw err;
          }
        }
      }
      console.log('Client stream fully processed');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Client generation error:', err);
      if (err.name !== 'AbortError') {
        alert('Failed to generate UI: ' + err.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setAiGenerating(false);
      if (reader) {
        reader.releaseLock();  // Clean up
      }
    }
  };

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

  if (!project) {
    return (
      <div className="min-h-screen p-2 flex items-center justify-center">
        <div className="text-sm">Project not found or loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-4xl mx-auto">
        
        {/* Project Header */}
        <div className="mb-4 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              <span className="opacity-60">{'>'}</span>{' '}
              <span>project:</span>{' '}
              <span>{project?.name || 'Untitled Project'}</span>
            </div>
            {/* Show view only indicator if viewing a public project */}
            {isPublicProject && !isAuthor ? (
                <span className="text-xs opacity-70">view only</span>
            ) : isAuthor ? (
              <label className="text-xs flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.public || false}
                  onChange={(e) => {
                    updateProject({ public: e.target.checked });
                  }}
                  className="cursor-pointer"
                />
                <span>public (view only)</span>
              </label>
            ) : null}
          </div>
          <div className="border-t border-green-500 mb-4 relative">
            </div>

          {/* MQTT Config Toggle (only for authors) */}
          {isAuthor && (
            <div className="mb-2">
            <button
              onClick={() => setShowMqttConfig(!showMqttConfig)}
                className="text-xs px-2 py-1"
            >
              {showMqttConfig ? 'HIDE MQTT CONFIG' : 'EDIT MQTT CONFIG'}
            </button>
            </div>
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
                }}
                className="text-xs"
                style={{ height: '24px', padding: '2px 20px 2px 4px', lineHeight: '20px' }}
              >
                {controlSets.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                  {cs.schemas[0]?.schema?.title || cs.name || 'Untitled'}
                </option>
                ))}
              </select>
            )}
            {canEdit && (
              <div className="flex gap-2 items-center ml-auto">
                {showSchemaEditor && (
                  <>
                    <button
                      onClick={handleDeleteControlSet}
                      disabled={controlSets.length <= 1}
                      className="text-xs px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ height: '24px' }}
                    >
                      Delete Control
                    </button>
                    <button
                      onClick={handleCreateControlSet}
                      className="text-xs px-2 py-1"
                      style={{ height: '24px' }}
                    >
                      New Control
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowSchemaEditor(!showSchemaEditor)}
                  className="text-xs px-2 py-1"
                  style={{ height: '24px' }}
                >
                  {showSchemaEditor ? 'HIDE EDITOR' : 'EDIT'}
                </button>
              </div>
            )}
          </div>
          {showSchemaEditor && canEdit ? (
            <>
              
              {/* Editor below with inline AI */}
            <SchemaEditor
              onSave={handleSchemaSave}
              currentSchema={activeSchema}
              onCommand={(cmd: string) => sendCommand(cmd)}
              onDeleteControlSet={handleDeleteControlSet}
              onCreateControlSet={handleCreateControlSet}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiGenerating={aiGenerating}
                setAiGenerating={setAiGenerating}
                onClose={() => setShowSchemaEditor(false)}
                connected={activeMode === 'ble' ? bleConnected : mqttConnected}  // Pass real connected status
            />
            </>
          ) : activeSchema ? (
            <div className="border border-green-500 p-2 min-h-[200px] rounded">
            <HTMLControlRenderer
              html={activeSchema.html || ''}
              config={activeSchema.htmlConfig || {}}
              connected={activeMode === 'ble' ? bleConnected : mqttConnected}
              onCommand={sendCommand}
              previewMode={false}
            />
            </div>
          ) : (
            <div className="no-schema">
              <p>No control selected.</p>
            </div>
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
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto messages-container p-2">
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
              <div ref={messagesEndRef} />
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
