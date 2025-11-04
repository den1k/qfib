import React, { useState, useCallback, useRef } from 'react';
import Form from '@rjsf/core';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const sendFieldCommand = useCallback((fieldName: string, fieldValue: any, fieldSchema: any) => {
    if (!connected) return;
    
    const command = buildCommand(fieldSchema, formData, fieldName, fieldValue);
    if (command) {
      onCommand(command);
    }
  }, [connected, formData, onCommand]);

  const handleFormChange = useCallback((e: any) => {
    const newFormData = e.formData || {};
    const previousFormData = formData;
    setFormData(newFormData);
    
    if (!schema) return;
    
    // Skip sending commands during initial form load
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    
    // Find which field actually changed
    const changedFields = Object.keys(newFormData).filter(fieldName => {
      return newFormData[fieldName] !== previousFormData[fieldName];
    });
    
    // Only process fields that actually changed
    changedFields.forEach(fieldName => {
      const fieldValue = newFormData[fieldName];
      const fieldSchema = schema.schema.properties?.[fieldName] as any;
      
      if (!fieldSchema) return;

      const sendMode = getFieldSendMode(fieldSchema, schema.config.globalSendMode);
      
      if (sendMode === 'never') {
        // Don't send any command for this field
        return;
      } else if (sendMode === 'immediate') {
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
  }, [schema, sendFieldCommand, formData, isInitialLoad]);

  const handleSubmit = useCallback((e: any) => {
    const submitData = e.formData;
    if (!connected || !schema || !submitData) return;
    
    // Special handling for WiFi provisioning: if form has ssid and password, generate PROVISION command
    if (submitData.ssid !== undefined && submitData.password !== undefined) {
      const ssid = submitData.ssid || '';
      const password = submitData.password || '';
      if (ssid && password) {
        onCommand(`PROVISION:ssid=${ssid};pass=${password}`);
        return;
      }
    }
    
    // Process onSubmit fields
    Object.keys(submitData).forEach(fieldName => {
      const fieldValue = submitData[fieldName];
      const fieldSchema = schema.schema.properties?.[fieldName] as any;
      
      if (!fieldSchema) return;

      const sendMode = getFieldSendMode(fieldSchema, schema.config.globalSendMode);
      
      if (sendMode === 'onSubmit') {
        sendFieldCommand(fieldName, fieldValue, fieldSchema);
      }
      // Note: 'never' mode is handled in the onChange handler, not here
    });
  }, [schema, connected, sendFieldCommand, onCommand]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  if (!schema) {
    return (
      <div className="no-schema">
        <p>No form schema selected. Please create or select a schema.</p>
      </div>
    );
  }

  // Debug: Log schema properties
  if (process.env.NODE_ENV === 'development') {
    console.log('DynamicFormRenderer schema:', {
      schemaName: schema.name,
      properties: Object.keys(schema.schema?.properties || {}),
      hasUiSchema: !!schema.uiSchema
    });
  }

  // Check if any fields need onSubmit mode OR if globalSendMode is onSubmit
  const hasOnSubmitFields = Object.values(schema.schema.properties || {}).some((fieldSchema: any) => {
    const sendMode = getFieldSendMode(fieldSchema, schema.config.globalSendMode);
    return sendMode === 'onSubmit';
  });
  
  // Show submit button only if we have form fields that need submission AND no custom buttons handle it
  // If there are custom buttons for form submission (like PROVISION:FORM_SUBMIT), don't show submit button
  const hasFormSubmitButton = schema.config.customButtons?.some((btn: any) => 
    btn.command === 'PROVISION:FORM_SUBMIT' || btn.id === 'provision-wifi'
  );
  const hasFormFieldsToSubmit = Object.keys(schema.schema.properties || {}).length > 0;
  // Only show submit if we have fields AND no custom button is handling submission
  const showSubmitButton = hasOnSubmitFields || 
    (schema.config.globalSendMode === 'onSubmit' && hasFormFieldsToSubmit && !hasFormSubmitButton);

  // Create custom button templates that hide submit button when not needed
  const conditionalButtonTemplates = {
    ...CustomButtonTemplates,
    SubmitButton: showSubmitButton ? CustomButtonTemplates.SubmitButton : () => null
  };

  return (
    <div className="dynamic-form-renderer">
      <Form
        schema={schema.schema}
        uiSchema={schema.uiSchema}
        formData={formData}
        onChange={handleFormChange}
        onSubmit={showSubmitButton ? handleSubmit : undefined}
        validator={validator}
        templates={{
          FieldTemplate: CustomFieldTemplate,
          ObjectFieldTemplate: CustomObjectFieldTemplate,
          TitleFieldTemplate: CustomTitleField,
          BaseInputTemplate: CustomBaseInputTemplate,
          ButtonTemplates: conditionalButtonTemplates
        }}
        widgets={customWidgets}
        showErrorList={false}
        liveValidate={false}
        formContext={{
          customButtons: schema.config.customButtons,
          onCommand: onCommand,
          formData: formData,
          connected: connected,
          submitForm: () => {
            // Manually trigger form submission
            if (schema && formData && connected) {
              // Create a synthetic submit event with formData
              handleSubmit({ formData } as any);
            }
          }
        }}
      />
    </div>
  );
}
