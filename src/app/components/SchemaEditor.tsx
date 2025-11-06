import React, { useState, useEffect } from 'react';
import { FormSchema } from '../../types/formSchema';
import { defaultSchemas } from '../defaults/defaultSchemas';
import { DynamicFormRenderer } from './DynamicFormRenderer';

interface SchemaEditorProps {
  onSave: (schema: FormSchema) => void;
  currentSchema: FormSchema | null;
  onCommand?: (command: string) => void;
  onDeleteControlSet?: () => void;
  onCreateControlSet?: () => void;
}

export function SchemaEditor({ onSave, currentSchema, onCommand, onDeleteControlSet, onCreateControlSet }: SchemaEditorProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (currentSchema) {
      setJsonText(JSON.stringify(currentSchema, null, 2));
    } else {
      // Load default schema as template
      const template = defaultSchemas[0];
      setJsonText(JSON.stringify(template, null, 2));
    }
  }, [currentSchema]);

  const validateJson = (text: string): FormSchema | null => {
    try {
      const parsed = JSON.parse(text);
      
      // Basic validation
      if (!parsed.id || !parsed.schema) {
        throw new Error('Schema must have id and schema properties');
      }
      
      if (!parsed.config) {
        parsed.config = { globalSendMode: 'onSubmit' };
      }
      
      return parsed as FormSchema;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      return null;
    }
  };

  const handleSave = () => {
    setError(null);
    const schema = validateJson(jsonText);
    
    if (schema) {
      onSave(schema);
      setError(null);
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    setError(null);
  };

  return (
    <div className="schema-editor">
      <div className="editor-header">
        <div className="editor-controls">
          <div className="editor-actions">
            <button onClick={handleSave} className="save-button">
              Save Schema
            </button>
            {onDeleteControlSet && (
              <button 
                onClick={onDeleteControlSet}
                className="delete-button"
              >
                Delete Control
              </button>
            )}
            {onCreateControlSet && (
              <button 
                onClick={onCreateControlSet}
                className="new-button"
              >
                New Control
              </button>
            )}
            <button 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="preview-button"
            >
              {isPreviewMode ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
        </div>
      </div>

      <div className="editor-content">
        <div className="json-editor">
          <textarea
            value={jsonText}
            onChange={handleJsonChange}
            className={`json-textarea ${error ? 'error' : ''}`}
            placeholder="Enter JSON schema..."
            rows={20}
          />
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}
        </div>

        {isPreviewMode && (
          <div className="preview-panel">
            <h3>Preview</h3>
            <div className="preview-content">
              {(() => {
                const schema = validateJson(jsonText);
                if (schema) {
                  return (
                    <DynamicFormRenderer
                      schema={schema}
                      connected
                      onCommand={onCommand || (() => console.log('Preview mode - command not sent'))}
                    />
                  );
                }
                return <div className="preview-error">Invalid schema</div>;
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="editor-help">
        <h4>Schema Help</h4>
        <div className="help-content">
          <p><strong>Basic Structure:</strong></p>
          <pre>{`{
    "id": "unique-id",
    "schema": {
      "title": "Schema Name",
    "type": "object",
    "properties": {
      "fieldName": {
        "type": "string",
        "title": "Field Title",
        "x-command": "command:param={fieldName}",
        "x-sendMode": "immediate|debounced|onSubmit"
      }
    }
  },
  "config": {
    "globalSendMode": "onSubmit"
  }
}`}</pre>
          
          <p><strong>Send Modes:</strong></p>
          <ul>
            <li><code>immediate</code> - Send command as soon as field changes</li>
            <li><code>debounced</code> - Send command after delay (default 300ms)</li>
            <li><code>onSubmit</code> - Send command when form is submitted</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
