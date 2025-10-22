## qfib - BLE Microcontroller Control App

q(ueue) (wi)fi b(luetooth)

This is a Next.js web app for controlling ESP32 microcontrollers over Bluetooth Low Energy (BLE) using the Web Bluetooth API.

🌐 **Live Demo**: [https://qfib.netlify.app/](https://qfib.netlify.app/)

### Features
- Scan and connect to ESP32 devices (filtered by "ESP" name prefix).
- Send commands via arrow keys (defaults: forward/back/left/right) or free-form chat input.
- Receive responses/notifications from the ESP32 in a chat log.
- Uses Nordic UART Service (NUS) for serial-like communication.

### Running the Web App
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open http://localhost:3000 in Chrome/Edge (requires Bluetooth support).
4. Click "Connect to ESP32", select your device.
5. Use arrow keys or chat to send commands.

### ESP32 Firmware Setup
The app expects the ESP32 to advertise as "ESP32" with NUS UUIDs. Use the provided Arduino sketch:

1. Install [Arduino IDE](https://www.arduino.cc/en/software) and [ESP32 Board Package](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html).
2. Open `firmware/ESP32_NUS.ino` in Arduino IDE.
3. Select your ESP32 board (e.g., "ESP32 Dev Module") and port.
4. Upload the sketch to your ESP32.
5. Open Serial Monitor (115200 baud) for debug logs.
6. The ESP32 will advertise via BLE—connect from the web app.

#### Customizing the Firmware
- In `setup()`: Change `BLEDevice::init("ESP32")` to your preferred device name (must start with "ESP" for app filter).
- In `onWrite()`: Extend command handling (e.g., integrate motors, sensors). Currently handles arrow defaults and echoes custom commands.
- For periodic sends: Uncomment the loop section to notify status updates.

### Notes
- **Browser Support**: Chrome 56+ / Edge 79+ on desktop; mobile Android Chrome works, but iOS Safari does not support Web Bluetooth.
- **HTTPS/Localhost**: BLE requires secure context—use localhost for dev.
- **Troubleshooting**:
  - If connection fails: Ensure UUIDs match (NUS standard).
  - No commands received on ESP32: Check Serial Monitor for logs.
  - Permissions: Browser will prompt for BLE access.

### Project Structure
- `src/app/page.tsx`: Main UI (connection, keys, chat).
- `src/app/hooks/useBLE.ts`: BLE logic with NUS.
- `src/types/bluetooth.d.ts`: Web Bluetooth types.
- `firmware/ESP32_NUS.ino`: ESP32 Arduino sketch.

For issues or enhancements (e.g., custom mappings, multiple devices), see the code or ask!
