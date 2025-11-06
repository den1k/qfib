import { FormSchema } from '../../types/formSchema';

export const defaultSchemas: FormSchema[] = [
  {
    id: 'default-movement',
    schema: {
      title: 'Movement Controls',
      type: 'object',
      properties: {}
    },
    config: {
      globalSendMode: 'immediate',
      customButtons: [
        { id: 'servo1-openSlow', label: '🐌 Open Slowly', command: 'smoothMove:angle=0;duration=3000;servo=1', group: 'Servo 1' },
        { id: 'servo1-closeSlow', label: '🐌 Close Slowly', command: 'smoothMove:angle=180;duration=3000;servo=1', group: 'Servo 1' },
        { id: 'servo1-openFast', label: '⚡ Open Fast', command: 'smoothMove:angle=0;duration=100;servo=1', group: 'Servo 1' },
        { id: 'servo1-closeFast', label: '⚡ Close Fast', command: 'smoothMove:angle=180;duration=100;servo=1', group: 'Servo 1' },
        { id: 'servo2-openSlow', label: '🐌 Open Slowly', command: 'smoothMove:angle=0;duration=3000;servo=2', group: 'Servo 2' },
        { id: 'servo2-closeSlow', label: '🐌 Close Slowly', command: 'smoothMove:angle=180;duration=3000;servo=2', group: 'Servo 2' },
        { id: 'servo2-openFast', label: '⚡ Open Fast', command: 'smoothMove:angle=0;duration=100;servo=2', group: 'Servo 2' },
        { id: 'servo2-closeFast', label: '⚡ Close Fast', command: 'smoothMove:angle=180;duration=100;servo=2', group: 'Servo 2' }
      ]
    }
  },
  {
    id: 'advanced-controls',
    schema: {
      title: 'Advanced Controls',
      type: 'object',
      properties: {
        angle1: {
          type: 'number',
          title: 'Servo 1: Angle',
          minimum: 0,
          maximum: 180,
          default: 90,
          'x-command': 'smoothMove:angle={angle1};duration={duration1};servo=1',
          'x-sendMode': 'debounced',
          'x-debounceMs': 300,
          'x-group': 'Servo 1'
        },
        duration1: {
          type: 'number',
          title: 'Servo 1: Duration (ms)',
          minimum: 100,
          maximum: 10000,
          default: 1000,
          'x-sendMode': 'never',
          'x-group': 'Servo 1'
        },
        angle2: {
          type: 'number',
          title: 'Servo 2: Angle',
          minimum: 0,
          maximum: 180,
          default: 90,
          'x-command': 'smoothMove:angle={angle2};duration={duration2};servo=2',
          'x-sendMode': 'debounced',
          'x-debounceMs': 300,
          'x-group': 'Servo 2'
        },
        duration2: {
          type: 'number',
          title: 'Servo 2: Duration (ms)',
          minimum: 100,
          maximum: 10000,
          default: 1000,
          'x-sendMode': 'never',
          'x-group': 'Servo 2'
        }
      }
    },
    uiSchema: {
      angle1: {
        'ui:widget': 'range'
      },
      duration1: {
        'ui:widget': 'range'
      },
      angle2: {
        'ui:widget': 'range'
      },
      duration2: {
        'ui:widget': 'range'
      }
    },
    config: {
      globalSendMode: 'debounced',
      debounceMs: 300
    }
  },
  {
    id: 'dual-servo-controls',
    schema: {
      title: 'Dual Servo Controls',
      type: 'object',
      properties: {
        angle1: {
          type: 'number',
          title: 'Servo 1 Angle',
          minimum: 0,
          maximum: 180,
          default: 90,
          'x-command': 'smoothMove:angle={angle1};duration={duration};servo=1',
          'x-sendMode': 'debounced',
          'x-debounceMs': 300
        },
        angle2: {
          type: 'number',
          title: 'Servo 2 Angle',
          minimum: 0,
          maximum: 180,
          default: 90,
          'x-command': 'smoothMove:angle={angle2};duration={duration};servo=2',
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
      angle1: {
        'ui:widget': 'range'
      },
      angle2: {
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
    schema: {
      title: 'Custom Command',
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
