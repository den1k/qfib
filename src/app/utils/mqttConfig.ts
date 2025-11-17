export interface MQTTConfig {
  brokerUrl: string;
  username: string;
  password: string;
  commandTopic: string;
  statusTopic: string;
  clientId: string;
}

export const MQTT_CONFIG_STORAGE_KEY = 'mrln-mqtt-config';

export const DEFAULT_MQTT_CONFIG: Omit<MQTTConfig, 'clientId'> = {
  brokerUrl: '',
  username: '',
  password: '',
  commandTopic: 'mrln/command',
  statusTopic: 'mrln/status',
};

export function createDefaultMQTTConfig(): MQTTConfig {
  return {
    ...DEFAULT_MQTT_CONFIG,
    clientId: `webapp-client-${Math.random().toString(16).slice(2, 10)}`,
  };
}

export function getEmptyMQTTConfig(): MQTTConfig {
  return {
    ...DEFAULT_MQTT_CONFIG,
    clientId: '',
  };
}

