import { FormSchema } from '../../types/formSchema';

export const defaultHTMLControls: FormSchema[] = [
  {
    id: 'simple-rc-controls',
    type: 'html',
    schema: {
      title: 'Simple RC Controls',
      type: 'object'
    },
    html: `<div class="flex flex-col items-center p-4">
  <!-- Direction buttons -->
  <div class="relative" style="width: 240px; height: 240px;">
    <!-- Top row: rotate left, forward, rotate right -->
    <div class="absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-2">
      <button data-command="rotate:angle=-15" class="simple-rc-button">↶</button>
      <button data-command="forward" class="simple-rc-button">↑</button>
      <button data-command="rotate:angle=15" class="simple-rc-button">↷</button>
    </div>

    <!-- Middle row: left, stop, right -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
      <button data-command="left" class="simple-rc-button">←</button>
      <button data-command="stop" class="simple-rc-button">⏹</button>
      <button data-command="right" class="simple-rc-button">→</button>
    </div>

    <!-- Bottom button -->
    <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2">
      <button data-command="back" class="simple-rc-button">↓</button>
    </div>
  </div>

  <!-- Speed Slider -->
  <div class="mt-8 flex flex-col items-center" style="width: 256px;">
    <label class="block text-center mb-2">Speed: <span data-field="speed">5</span></label>
    <div class="w-full relative">
      <input
        type="range"
        min="1"
        max="10"
        data-field="speed"
        data-command="speed:{value}"
        data-send-mode="debounced"
        data-debounce-ms="200"
        class="w-full"
      />
      <div class="flex justify-between mt-1 text-xs opacity-70 absolute left-0 right-0" style="padding-left: 5px; padding-right: 5px;">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="mt-8 flex gap-2">
    <button data-command="clean" class="simple-rc-button px-4 py-2 text-sm">Clean</button>
    <button data-command="power" class="simple-rc-button px-4 py-2 text-sm">Power</button>
    <button data-command="wake" class="simple-rc-button px-4 py-2 text-sm">Wake</button>
    <button data-command="dock" class="simple-rc-button px-4 py-2 text-sm">Dock</button>
  </div>
</div>`,
    htmlConfig: {
      debounceMs: 300,
      globalSendMode: 'immediate'
    }
  },

  {
    id: 'wifi-provisioning',
    type: 'html',
    schema: {
      title: 'WiFi Provisioning',
      type: 'object'
    },
    html: `<form data-send-mode="onSubmit" class="space-y-4 max-w-sm mx-auto">
  <h3 class="text-lg font-semibold mb-4">WiFi Setup</h3>

  <div>
    <label class="block text-sm font-medium mb-2">Network Name (SSID):</label>
    <input
      type="text"
      data-field="ssid"
      class="w-full"
      placeholder="Enter WiFi network name"
      required
    />
  </div>

  <div>
    <label class="block text-sm font-medium mb-2">Password:</label>
    <input
      type="password"
      data-field="password"
      class="w-full"
      placeholder="Enter WiFi password"
      required
    />
  </div>

  <button
    type="submit"
    data-command="PROVISION:ssid={ssid};pass={password}"
    class="w-full py-2 px-4 font-medium"
  >
    Connect to WiFi
  </button>

  <p class="text-xs opacity-70 text-center">
    This will configure the device to connect to the specified WiFi network.
  </p>
</form>`,
    htmlConfig: {
      debounceMs: 300,
      globalSendMode: 'onSubmit'
    }
  },

  {
    id: 'motor-control',
    type: 'html',
    schema: {
      title: 'Motor Control',
      type: 'object'
    },
    html: `<div class="space-y-6 max-w-md mx-auto p-4">
  <h3 class="text-lg font-semibold mb-4">Motor Control</h3>

  <!-- Motor A Speed -->
  <div>
    <label class="block text-sm font-medium mb-2">
      Motor A Speed: <span data-field="motorA" class="font-mono">-0</span>
    </label>
    <input
      type="range"
      min="-255"
      max="255"
      data-field="motorA"
      data-command="motor:a:{value}"
      data-send-mode="debounced"
      data-debounce-ms="150"
      class="w-full"
    />
    <div class="flex justify-between mt-1 text-xs opacity-70">
      <span>Reverse</span>
      <span>Stop</span>
      <span>Forward</span>
    </div>
  </div>

  <!-- Motor B Speed -->
  <div>
    <label class="block text-sm font-medium mb-2">
      Motor B Speed: <span data-field="motorB" class="font-mono">-0</span>
    </label>
    <input
      type="range"
      min="-255"
      max="255"
      data-field="motorB"
      data-command="motor:b:{value}"
      data-send-mode="debounced"
      data-debounce-ms="150"
      class="w-full"
    />
    <div class="flex justify-between mt-1 text-xs opacity-70">
      <span>Reverse</span>
      <span>Stop</span>
      <span>Forward</span>
    </div>
  </div>

  <!-- Preset Buttons -->
  <div class="grid grid-cols-2 gap-2">
    <button
      data-command="motor:a:128;motor:b:128"
      class="px-3 py-2 text-sm font-medium"
    >
      Forward
    </button>
    <button
      data-command="motor:a:-128;motor:b:-128"
      class="px-3 py-2 text-sm font-medium"
    >
      Reverse
    </button>
    <button
      data-command="motor:a:128;motor:b:-128"
      class="px-3 py-2 text-sm font-medium"
    >
      Turn Left
    </button>
    <button
      data-command="motor:a:-128;motor:b:128"
      class="px-3 py-2 text-sm font-medium"
    >
      Turn Right
    </button>
  </div>

  <button
    data-command="motor:stop"
    class="w-full px-3 py-2 text-sm font-medium"
  >
    Stop All Motors
  </button>
</div>`,
    htmlConfig: {
      debounceMs: 300,
      globalSendMode: 'immediate'
    }
  }
];
