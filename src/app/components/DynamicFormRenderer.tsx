import React, { useState, useCallback, useRef } from 'react';
import Form from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { debounce } from 'lodash.debounce';
import { FormSchema } from '../../types/formSchema';
import { buildCommand, getFieldSendMode, getFieldDebounceMs } from '../utils/commandBuilder';
import { CustomFieldTemplate, CustomObjectFieldTemplate, CustomTitleField, CustomBaseInputTemplate, CustomButtonTemplates, customWidgets } from './CustomRJSFTheme';

interface DynamicFormRendererProps {
  schema: FormSchema | null;
  connected: boolean;
  onCommand: (command: string) => void;
}

export function DynamicFormRenderer({ schema, connected, onCommand }: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<any>({});
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  if (!schema) {
    return (
      <div className="no-schema">
        <p>No form schema selected. Please create or select a schema.</p>
      </div>
    );
  }

  const handleFormChange = useCallback(({ formData: newFormData }: { formData: any }) => {
    setFormData(newFormData);
    
    // Process each field for immediate/debounced sending
    Object.keys(newFormData).forEach(fieldName => {
      const fieldValue = newFormData[fieldName];
      const fieldSchema = schema.schema.properties?.[fieldName] as any;
      
      if (!fieldSchema) return;

      const sendMode = getFieldSendMode(fieldSchema, schema.config.globalSendMode);
      
      if (sendMode === 'immediate') {
        sendFieldCommand(fieldName, fieldValue, fieldSchema);
      } else if (sendMode === 'debounced') {
        const debounceMs = getFieldDebounceMs(fieldSchema, schema.config.debounceMs);
        
        // Clear existing timer
        const existingTimer = debounceTimers.current.get(fieldName);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Set new timer
        const timer = setTimeout(() => {
          sendFieldCommand(fieldName, fieldValue, fieldSchema);
          debounceTimers.current.delete(fieldName);
        }, debounceMs);
        
        debounceTimers.current.set(fieldName, timer);
      }
    });
  }, [schema, formData]);

  const sendFieldCommand = (fieldName: string, fieldValue: any, fieldSchema: any) => {
    if (!connected) return;
    
    const command = buildCommand(fieldSchema, formData, fieldName, fieldValue);
    if (command) {
      onCommand(command);
    }
  };

  const handleSubmit = useCallback(({ formData: submitData }: { formData: any }) => {
    if (!connected) return;
    
    // Process onSubmit fields
    Object.keys(submitData).forEach(fieldName => {
      const fieldValue = submitData[fieldName];
      const fieldSchema = schema.schema.properties?.[fieldName] as any;
      
      if (!fieldSchema) return;

      const sendMode = getFieldSendMode(fieldSchema, schema.config.globalSendMode);
      
      if (sendMode === 'onSubmit') {
        sendFieldCommand(fieldName, fieldValue, fieldSchema);
      }
    });
  }, [schema, formData, connected, onCommand]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="dynamic-form-renderer">
      <Form
        schema={schema.schema}
        uiSchema={schema.uiSchema}
        formData={formData}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        templates={{
          FieldTemplate: CustomFieldTemplate,
          ObjectFieldTemplate: CustomObjectFieldTemplate,
          TitleFieldTemplate: CustomTitleField,
          BaseInputTemplate: CustomBaseInputTemplate,
          ButtonTemplates: CustomButtonTemplates
        }}
        widgets={customWidgets}
        showErrorList={false}
        liveValidate={false}
      >
        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={!connected}
          >
            Send Commands
          </button>
        </div>
      </Form>
    </div>
  );
}
