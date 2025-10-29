import { FormSchema } from '../../types/formSchema';

export const defaultSchemas: FormSchema[] = [
  {
    id: 'default-movement',
    name: 'Movement Controls',
    schema: {
      type: 'object',
      properties: {}
    },
    config: {
      globalSendMode: 'immediate',
      customButtons: [
        { id: 'openSlow', label: '🐌 Open Slowly', command: 'smoothMove:angle=0;duration=3000' },
        { id: 'closeSlow', label: '🐌 Close Slowly', command: 'smoothMove:angle=180;duration=3000' },
        { id: 'openFast', label: '⚡ Open Fast', command: 'smoothMove:angle=0;duration=100' },
        { id: 'closeFast', label: '⚡ Close Fast', command: 'smoothMove:angle=180;duration=100' }
      ]
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
          minimum: 100,
          maximum: 10000,
          default: 1000,
          'x-sendMode': 'never'
        }
      }
    },
    uiSchema: {
      angle: {
        'ui:widget': 'range'
      },
      duration: {
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
        'ui:widget': 'text',
        'ui:placeholder': 'Enter command...'
      }
    },
    config: {
      globalSendMode: 'onSubmit'
    }
  }
];
