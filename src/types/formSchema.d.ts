import { RJSFSchema, UiSchema } from '@rjsf/utils';

export interface FormSchema {
  id: string;
  name: string;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  config: FormConfig;
}

export interface FormConfig {
  globalSendMode: 'immediate' | 'debounced' | 'onSubmit';
  debounceMs?: number;
}

export interface FieldCommandConfig {
  command?: string; // Template like "smoothMove:angle={value};duration={duration}"
  sendMode?: 'immediate' | 'debounced' | 'onSubmit';
  debounceMs?: number;
}

export interface CommandMap {
  [key: string]: string;
}

export interface ExtendedRJSFSchema extends RJSFSchema {
  'x-command'?: string;
  'x-sendMode'?: 'immediate' | 'debounced' | 'onSubmit';
  'x-debounceMs'?: number;
  'x-commandMap'?: CommandMap;
}

export interface FormData {
  [key: string]: any;
}
