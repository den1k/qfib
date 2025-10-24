import { FormSchema } from '../../types/formSchema';

export const defaultSchemas: FormSchema[] = [
  {
    id: 'default-movement',
    name: 'Movement Controls',
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          title: 'Action',
          enum: ['open-slow', 'close-slow', 'open-fast', 'close-fast'],
          enumNames: ['🐌 Open Slowly', '🐌 Close Slowly', '⚡ Open Fast', '⚡ Close Fast'],
          'x-commandMap': {
            'open-slow': 'smoothMove:angle=0;duration=3000',
            'close-slow': 'smoothMove:angle=180;duration=3000',
            'open-fast': 'smoothMove:angle=0;duration=100',
            'close-fast': 'smoothMove:angle=180;duration=100'
          }
        }
      }
    },
    uiSchema: {
      action: {
        'ui:widget': 'radio'
      }
    },
    config: {
      globalSendMode: 'onSubmit'
    }
  },
  {
    id: 'advanced-controls',
    name: 'Advanced Controls',
    schema: {
      type: 'object',
      properties: {
        angle: {
          type: 'number',
          title: 'Angle',
          minimum: 0,
          maximum: 180,
          default: 90,
          'x-command': 'smoothMove:angle={angle};duration={duration}',
          'x-sendMode': 'debounced',
          'x-debounceMs': 300
        },
        duration: {
          type: 'number',
          title: 'Duration (ms)',
          minimum: 50,
          maximum: 5000,
          default: 1000,
          'x-sendMode': 'debounced',
          'x-debounceMs': 300
        },
        speed: {
          type: 'number',
          title: 'Speed',
          minimum: 1,
          maximum: 10,
          default: 5,
          'x-command': 'setSpeed:{speed}',
          'x-sendMode': 'immediate'
        }
      }
    },
    uiSchema: {
      angle: {
        'ui:widget': 'range'
      },
      duration: {
        'ui:widget': 'range'
      },
      speed: {
        'ui:widget': 'range'
      }
    },
    config: {
      globalSendMode: 'debounced',
      debounceMs: 300
    }
  },
  {
    id: 'custom-command',
    name: 'Custom Command',
    schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          title: 'Command',
          'x-command': '{command}',
          'x-sendMode': 'onSubmit'
        }
      }
    },
    uiSchema: {
      command: {
        'ui:widget': 'textarea',
        'ui:options': {
          rows: 3
        }
      }
    },
    config: {
      globalSendMode: 'onSubmit'
    }
  }
];
