export interface FormSchema {
  id: string;
  type: 'html';
  html: string;
  htmlConfig?: HTMLControlConfig;
  schema: {
    title: string;
    type: 'object';
    properties?: Record<string, unknown>;
  };
  aiHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface HTMLControlConfig {
  debounceMs?: number;
  throttleMs?: number;
  globalSendMode?: 'immediate' | 'debounced' | 'throttle' | 'onSubmit';
}

export interface FormData {
  [key: string]: any;
}

export type CommandMap = Record<string, string>;

export interface ExtendedRJSFSchema {
  title?: string;
  type?: 'object';
  properties?: Record<string, {
    type?: string;
    title?: string;
    // Add other common RJSF schema properties as needed
  }>;
  required?: string[];
}
