import React, { useRef, useState, useEffect } from 'react';
import { FormSchema, HTMLControlConfig } from '../../types/formSchema';
import { HTMLEditor } from './HTMLEditor';
import { HTMLControlRenderer } from './HTMLControlRenderer';  // Add import

interface SchemaEditorProps {
  onSave: (schema: FormSchema) => void;
  currentSchema: FormSchema | null;
  onCommand?: (command: string) => void;
  onDeleteControlSet?: () => void;
  onCreateControlSet?: () => void;
  aiPrompt: string;
  setAiPrompt: (s: string) => void;
  aiGenerating: boolean;
  setAiGenerating: (b: boolean) => void;
  onClose?: () => void;
  connected?: boolean;  // New prop for connection status
}

const DEFAULT_HTML = `<div class="flex flex-col items-center p-4">
  <h2 class="text-xl font-bold mb-4">Custom Control</h2>

  <!-- Example buttons -->
  <div class="flex gap-2 mb-4">
    <button
      data-command="forward"
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Forward
    </button>
    <button
      data-command="stop"
      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      Stop
    </button>
  </div>

  <!-- Example slider -->
  <div class="w-64">
    <label class="block mb-2">Speed: <span data-field="speed">5</span></label>
    <input
      type="range"
      min="1"
      max="10"
      data-field="speed"
      data-command="speed:{value}"
      data-send-mode="debounced"
      data-debounce-ms="300"
      class="w-full"
    />
  </div>
</div>`;

const DEFAULT_CONFIG: HTMLControlConfig = {
  debounceMs: 300,
  throttleMs: 100,
  globalSendMode: 'immediate'
};

export function SchemaEditor({ onSave, currentSchema, onCommand, onDeleteControlSet, onCreateControlSet, aiPrompt, setAiPrompt, aiGenerating, setAiGenerating, onClose, connected }: SchemaEditorProps) {
  const [editingTitle, setEditingTitle] = useState(currentSchema?.schema?.title || 'Custom HTML Control');
  const [editingHtml, setEditingHtml] = useState(currentSchema?.html || DEFAULT_HTML);
  const [editingConfig, setEditingConfig] = useState<HTMLControlConfig>(currentSchema?.htmlConfig || DEFAULT_CONFIG);
  const [aiHistory, setAiHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>(currentSchema?.aiHistory || []);

  useEffect(() => {
    if (currentSchema) {
      setEditingTitle(currentSchema.schema?.title || 'Custom HTML Control');
      setEditingHtml(currentSchema?.html || DEFAULT_HTML);
      setEditingConfig(currentSchema?.htmlConfig || DEFAULT_CONFIG);
      setAiHistory(currentSchema?.aiHistory || []);
    }
  }, [currentSchema]);

  const handleLocalSave = async () => {
    if (!currentSchema) return;
    const updatedSchema: FormSchema = {
      ...currentSchema,
      type: 'html',
      html: editingHtml,
      htmlConfig: editingConfig,
      schema: {
        ...currentSchema.schema,
        title: editingTitle,
        type: 'object'
      },
      aiHistory: aiHistory  // Persist history
    };
    await onSave(updatedSchema);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !editingHtml) return;
    setAiGenerating(true);

    // Add new user message to history
    const newUserMsg = { role: 'user' as const, content: aiPrompt };
    const newHistory = [...aiHistory, newUserMsg];
    setAiHistory(newHistory);

    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const requestBody = {
      messages: newHistory,
      contextHtml: editingHtml
    };

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), 30000);
      
      const response = await fetch('/api/generate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (!response.body) throw new Error('No response body');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (!value) continue;

          buffer += decoder.decode(value, { stream: true });
      
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();

              if (dataStr === '[DONE]') {
                continue;
              }

              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'partial') {
                  if (data.html) {
                    setEditingHtml(data.html);
                  } else {
                  }
                } else if (data.type === 'complete') {
                  if (data.html) {
                    setEditingHtml(data.html);
                    // Append to history as assistant
                    setAiHistory(prev => [...prev, { role: 'assistant' as const, content: data.html }]);
                    // Do NOT auto-save - user reviews and clicks Save
                  } else {
                  }
                } else if (data.type === 'error') {
                  console.error('Stream error:', data.message);
                  alert(`Generation error: ${data.message}`);
                  setAiGenerating(false);
                  return;
                } else {
                }
              } catch (parseErr) {
              }
            }
          }
        } catch (readErr: unknown) {
          const err = readErr as Error;
          if (err.name === 'AbortError') {
            alert('Generation timed out – try a simpler prompt.');
          } else {
            throw err;
          }
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('AI generation error:', err);
      if (err.name !== 'AbortError') {
        alert('Failed to generate UI: ' + err.message);
    }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    setAiGenerating(false);
      if (reader) reader.releaseLock();
      if (controller) controller.abort();
    }
    setAiPrompt('');
  };

  return (
    <div className="schema-editor">
      {/* Remove the entire editor-header section */}
      <div className="editor-content">
        {currentSchema?.html && (
          <div className="mb-4">
            <h5 className="text-xs font-medium mb-2">Live Preview</h5>
            <div className="border border-green-500 p-2 min-h-[200px]">
              <HTMLControlRenderer
                html={editingHtml}
                config={editingConfig}
                connected={connected ?? false}
                onCommand={onCommand ?? (() => {})}
                previewMode={true}
              />
            </div>
          </div>
        )}
        
        <HTMLEditor
          title={editingTitle}
          onTitleChange={setEditingTitle}
          html={editingHtml}
          onHtmlChange={setEditingHtml}
          config={editingConfig}
          onSave={handleLocalSave}
          connected={false}  // Edit mode
          onCommand={onCommand || (() => {})}
          onCancel={onClose}  // Use onClose
        />
        
        {/* Inline AI with chat history */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <h5 className="text-xs mb-2 font-medium">AI Edit HTML</h5>
          
          {/* Chat history UI REMOVED - no visible previous messages */}
          
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe changes to the HTML above, e.g., 'add a range slider for volume with data-field=volume and data-command=volume:{value}'"
            className="w-full p-2 text-xs border border-gray-700 rounded mb-2"
            rows={2}
          />
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating || !aiPrompt.trim() || !editingHtml}
            className={`text-xs px-3 py-1 rounded ${aiGenerating || !aiPrompt.trim() || !editingHtml ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            {aiGenerating ? 'Generating...' : 'Generate HTML Changes'}
          </button>
          {editingHtml ? null : <p className="text-xs text-gray-400 mt-1">Select a schema with HTML to edit.</p>}
        </div>
      </div>
    </div>
  );
}
