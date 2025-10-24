import React, { useState, useEffect } from 'react';
import { FormSchema } from '../../types/formSchema';
import { defaultSchemas } from '../defaults/defaultSchemas';

interface SchemaEditorProps {
  onSave: (schema: FormSchema) => void;
  currentSchema: FormSchema | null;
}

export function SchemaEditor({ onSave, currentSchema }: SchemaEditorProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [schemaName, setSchemaName] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (currentSchema) {
      setJsonText(JSON.stringify(currentSchema, null, 2));
      setSchemaName(currentSchema.name);
    } else {
      // Load default schema as template
      const template = defaultSchemas[0];
      setJsonText(JSON.stringify(template, null, 2));
      setSchemaName(template.name);
    }
  }, [currentSchema]);

  const validateJson = (text: string): FormSchema | null => {
    try {
      const parsed = JSON.parse(text);
      
      // Basic validation
      if (!parsed.id || !parsed.name || !parsed.schema) {
        throw new Error('Schema must have id, name, and schema properties');
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
      // Update name if changed
      if (schemaName !== schema.name) {
        schema.name = schemaName;
      }
      
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
          <input
            type="text"
            value={schemaName}
            onChange={(e) => setSchemaName(e.target.value)}
            placeholder="Schema Name"
            className="schema-name-input"
          />
          
          <div className="editor-actions">
            <button onClick={handleSave} className="save-button">
              Save Schema
            </button>
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
                    <pre className="preview-json">
                      {JSON.stringify(schema, null, 2)}
                    </pre>
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
  "name": "Schema Name",
  "schema": {
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
