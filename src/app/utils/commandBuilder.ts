import { ExtendedRJSFSchema, FormData, CommandMap } from '../types/formSchema';

export function buildCommand(
  fieldSchema: ExtendedRJSFSchema,
  formData: FormData,
  fieldName: string,
  fieldValue: any
): string | null {
  // Check for direct command template
  if (fieldSchema['x-command']) {
    return parseCommandTemplate(fieldSchema['x-command'], formData, fieldName, fieldValue);
  }

  // Check for command map (useful for enum fields)
  if (fieldSchema['x-commandMap']) {
    const commandMap = fieldSchema['x-commandMap'] as CommandMap;
    if (commandMap[fieldValue]) {
      return parseCommandTemplate(commandMap[fieldValue], formData, fieldName, fieldValue);
    }
  }

  // Default: use field name as command parameter
  return `${fieldName}=${fieldValue}`;
}

function parseCommandTemplate(
  template: string,
  formData: FormData,
  fieldName: string,
  fieldValue: any
): string {
  let command = template;

  // Replace {fieldName} with actual value
  command = command.replace(new RegExp(`\\{${fieldName}\\}`, 'g'), String(fieldValue));

  // Replace other field placeholders with their values
  Object.keys(formData).forEach(key => {
    const value = formData[key];
    if (typeof value === 'object' && value !== null) {
      // Handle nested objects like {motor.speed}
      Object.keys(value).forEach(nestedKey => {
        const placeholder = `{${key}.${nestedKey}}`;
        command = command.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value[nestedKey]));
      });
    } else {
      // Handle simple values
      const placeholder = `{${key}}`;
      command = command.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }
  });

  return command;
}

export function getFieldSendMode(
  fieldSchema: ExtendedRJSFSchema,
  globalSendMode: 'immediate' | 'debounced' | 'onSubmit'
): 'immediate' | 'debounced' | 'onSubmit' {
  return fieldSchema['x-sendMode'] || globalSendMode;
}

export function getFieldDebounceMs(
  fieldSchema: ExtendedRJSFSchema,
  globalDebounceMs: number = 300
): number {
  return fieldSchema['x-debounceMs'] || globalDebounceMs;
}
