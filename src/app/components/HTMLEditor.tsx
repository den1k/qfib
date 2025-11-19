'use client';

import React, { useCallback } from 'react';
import { FormSchema, HTMLControlConfig } from '@/types/formSchema';
import { HTMLControlRenderer } from './HTMLControlRenderer';
import Link from 'next/link';

interface HTMLEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  html: string;
  onHtmlChange: (html: string) => void;
  config: HTMLControlConfig;
  schema?: FormSchema | null;
  onSave: () => void;
  connected: boolean;
  onCommand: (command: string) => void;
  onCancel?: () => void;
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

export function HTMLEditor({ title, onTitleChange, html, onHtmlChange, config, schema, onSave, connected, onCommand, onCancel }: HTMLEditorProps) {
  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  return (
    <div className="html-editor h-full">
      {/* Header with title input if any */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="title-input" className="text-sm font-medium">Control Title</label>
          <input
            id="title-input"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-sm font-medium"
            placeholder=""
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCancel?.()}
            className="text-xs px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-xs px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>

      {/* Row: Editor */}
      <div className="flex flex-col h-full">
        <div className="flex flex-row gap-4 flex-1">
          {/* Left: HTML Editor */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium">HTML Content</label>
              <Link href="/docs" className="underline text-green-400 hover:text-green-300 text-xs">
                docs
              </Link>
            </div>
            <textarea
              value={html}
              onChange={(e) => onHtmlChange(e.target.value)}
              className="w-full h-full min-h-[400px] border border-gray-700 rounded p-2 text-xs resize-none font-mono"
              placeholder="Enter HTML with Tailwind classes and data attributes..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
