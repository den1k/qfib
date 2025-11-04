# Simple RC Controls Schema Example

To integrate Simple RC controls into a custom schema, add a field with the `SimpleRCWidget` in the uiSchema.

## Example Schema

```json
{
  "schema": {
    "type": "object",
    "properties": {
      "rcControls": {
        "type": "string",
        "title": "Simple RC Controls",
        "description": "Control your device with directional buttons and speed control"
      }
    }
  },
  "uiSchema": {
    "rcControls": {
      "ui:widget": "SimpleRCWidget"
    }
  },
  "config": {
    "globalSendMode": "immediate"
  }
}
```

## Complete Example

Here's a complete schema definition you can use in the schema editor:

```json
{
  "id": "simple-rc-controls-schema",
  "name": "Simple RC Controls",
  "schema": {
    "type": "object",
    "properties": {
      "rcControls": {
        "type": "string",
        "title": "Simple RC Controls",
        "description": "Control your device with directional buttons and speed control"
      }
    }
  },
  "uiSchema": {
    "rcControls": {
      "ui:widget": "SimpleRCWidget"
    }
  },
  "config": {
    "globalSendMode": "immediate",
    "customButtons": []
  }
}
```

## Notes

- The field type can be `"object"` or any other type - what matters is the `ui:widget` specification in the uiSchema
- The `globalSendMode` should be set to `"immediate"` if you want commands to send immediately when buttons are clicked
- The Simple RC Controls component will automatically:
  - Append speed to movement commands (forward, backward, rotate)
  - Send speed updates when the slider changes
  - Disable controls when not connected

## Command Format

The controls send commands in the following format:
- Movement commands: `forward;speed=5`, `backward;speed=5`, `rotate:angle=45;speed=5`
- Stop command: `stop` (no speed appended)
- Speed updates: `speed:5`

