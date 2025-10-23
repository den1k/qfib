#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <EEPROM.h>

#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#define EEPROM_SIZE 512
#define MAX_SSID_LEN 32
#define MAX_PASS_LEN 64
#define MAX_URL_LEN 128

#define MAX_HOST_LEN 64
#define PORT_SIZE 2 // uint16_t
#define MAX_PATH_LEN 32

char wifi_ssid[MAX_SSID_LEN];
char wifi_pass[MAX_PASS_LEN];
char ws_host[MAX_HOST_LEN];
uint16_t ws_port = 80;
char ws_path[MAX_PATH_LEN] = "/";

char ssid[MAX_SSID_LEN];
char password[MAX_PASS_LEN];
char url[MAX_URL_LEN];
bool provisioned = false;

BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic = NULL;
bool deviceConnected = false;
String rxValue = "";

WebSocketsClient webSocket;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      rxValue = pCharacteristic->getValue().c_str();
      // Handle commands from app
      if (rxValue == "up") {
        // Example: Move up (replace with your motor/pin logic)
        Serial.println("Up command received");
        pTxCharacteristic->setValue("Executed: up");
      } else if (rxValue == "down") {
        Serial.println("Down command received");
        pTxCharacteristic->setValue("Executed: down");
      } else if (rxValue == "left") {
        Serial.println("Left command received");
        pTxCharacteristic->setValue("Executed: left");
      } else if (rxValue == "right") {
        Serial.println("Right command received");
        pTxCharacteristic->setValue("Executed: right");
      } else if (rxValue.startsWith("PROVISION:")) {
        // Parse: PROVISION:ssid=foo;pass=bar
        String payload = rxValue.substring(10); // Skip "PROVISION:"
        // Split by ';'
        int firstSemi = payload.indexOf(';');
        
        if (firstSemi != -1) {
          // Parse: ssid=MyWiFi;pass=MyPass
          // Find the '=' positions for each field
          int ssidEq = payload.indexOf('=');
          int passEq = payload.indexOf('=', firstSemi);
          
          if (ssidEq != -1 && passEq != -1) {
            // Extract SSID: from after '=' to first ';'
            String ssidStr = payload.substring(ssidEq + 1, firstSemi);
            ssidStr.toCharArray(wifi_ssid, MAX_SSID_LEN);
            
            // Extract Password: from after '=' to end
            String passStr = payload.substring(passEq + 1);
            passStr.toCharArray(wifi_pass, MAX_PASS_LEN);
            
            // Store WiFi credentials
            int eeprom_addr = 0;
            EEPROM.write(eeprom_addr++, true);
            EEPROM.put(eeprom_addr, wifi_ssid); eeprom_addr += MAX_SSID_LEN;
            EEPROM.put(eeprom_addr, wifi_pass); eeprom_addr += MAX_PASS_LEN;
            EEPROM.commit();
            
            pTxCharacteristic->setValue("WiFi credentials saved! Rebooting...");
            pTxCharacteristic->notify();
            delay(1000);
            ESP.restart();
          } else {
            pTxCharacteristic->setValue("Invalid format. Use: PROVISION:ssid=...;pass=...");
          }
        } else {
          pTxCharacteristic->setValue("Invalid format. Use: PROVISION:ssid=...;pass=...");
        }
      } else {
        // Free-form command
        Serial.println("Custom command: " + rxValue);
        pTxCharacteristic->setValue("Executed: " + rxValue);
      }
      pTxCharacteristic->notify();
      rxValue = "";  // Clear after processing
    }
};

void onWebSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[WSc] Disconnected!\n");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WSc] Connected to url: %s\n", payload);
      // Send confirmation like BLE TX
      webSocket.sendTXT("Connected via WiFi");
      break;
    case WStype_TEXT:
      String msg = String((char*)payload);
      Serial.printf("[WSc] Received: %s\n", payload);
      // Interpret signals same as BLE: parse commands
      if (msg == "up") {
        Serial.println("Up via WiFi");
        webSocket.sendTXT("Executed: up");
      } else if (msg == "down") {
        Serial.println("Down via WiFi");
        webSocket.sendTXT("Executed: down");
      } else if (msg == "left") {
        Serial.println("Left via WiFi");
        webSocket.sendTXT("Executed: left");
      } else if (msg == "right") {
        Serial.println("Right via WiFi");
        webSocket.sendTXT("Executed: right");
      } else {
        webSocket.sendTXT("Executed: " + msg);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE work!");

  BLEDevice::init("ESP32");  // Device name - matches app filter
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // TX Characteristic - for sending to app (notify)
  pTxCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID_TX,
                      BLECharacteristic::PROPERTY_NOTIFY
                    );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // RX Characteristic - for receiving from app (write)
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                       CHARACTERISTIC_UUID_RX,
                       BLECharacteristic::PROPERTY_WRITE
                     );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  // Start service
  pService->start();

  // Start advertising
  pServer->getAdvertising()->start();
  Serial.println("Waiting for a client connection to notify...");

  EEPROM.begin(EEPROM_SIZE);
  int eeprom_addr = 0;
  provisioned = EEPROM.read(eeprom_addr++);
  if (provisioned) {
    EEPROM.get(eeprom_addr, wifi_ssid); eeprom_addr += MAX_SSID_LEN;
    EEPROM.get(eeprom_addr, wifi_pass); eeprom_addr += MAX_PASS_LEN;
    EEPROM.get(eeprom_addr, ws_host); eeprom_addr += MAX_HOST_LEN;
    EEPROM.get(eeprom_addr, ws_port); eeprom_addr += sizeof(uint16_t);
    EEPROM.get(eeprom_addr, ws_path); eeprom_addr += MAX_PATH_LEN;
    
    WiFi.begin(wifi_ssid, wifi_pass);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("WiFi connected!");
      webSocket.begin(ws_host, ws_port, ws_path);
      webSocket.onEvent(onWebSocketEvent);
      webSocket.setReconnectInterval(5000);
      // Keep BLE advertising active for reconnection capability
      Serial.println("BLE advertising kept active for reconnection");
    } else {
      Serial.println("WiFi failed, fallback to BLE provisioning");
    }
  }
}

void loop() {
  if (deviceConnected) {
    // Optional: Send periodic status updates
    // pTxCharacteristic->setValue("Status: Connected");
    // pTxCharacteristic->notify();
    delay(1000);
  }
  if (provisioned && WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
  }
  delay(2000);
}
