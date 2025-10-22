const path = require("path");
const fs = require("fs");

// Load environment variables from config.env
const envPath = path.join(__dirname, "config.env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  envFile.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#")) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    MQTT_BROKER_URL: process.env.MQTT_BROKER_URL,
    MQTT_COMMAND_TOPIC: process.env.MQTT_COMMAND_TOPIC,
    MQTT_STATUS_TOPIC: process.env.MQTT_STATUS_TOPIC,
    EMQX_API_URL: process.env.EMQX_API_URL,
    EMQX_API_APP_ID: process.env.EMQX_API_APP_ID,
    EMQX_API_SECRET: process.env.EMQX_API_SECRET,
  },
};

module.exports = nextConfig;
