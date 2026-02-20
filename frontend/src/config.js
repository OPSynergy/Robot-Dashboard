// API Configuration
export const API_BASE_URL = 'http://localhost:8000';

// Feature Flags
export const FEATURES = {
  ENABLE_WEBSOCKET: true,  // Set to true to enable WebSocket connections
  ENABLE_MQTT: true,       // Set to true to enable MQTT connections
};

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  VERIFY_TOKEN: '/api/auth/verify',
  REFRESH_TOKEN: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  STATUS: '/status',
  GOALS: '/goals',
  ADD_GOAL: '/goal/add',
  UPDATE_GOAL: '/goal/update',
  DELETE_GOAL: '/api/robot/goal/delete',
  COMMAND: '/command',
  POSITION: '/api/robot/position',
  BATTERY: '/api/robot/battery',
  SENSORS: '/api/robot/sensors',
  SETTINGS: '/api/robot/settings',
  LOGS: '/api/robot/logs',
  HEALTH: '/health'
};

// WebSocket Configuration
export const WS_BASE_URL = 'ws://localhost:8000';
export const WS_ENDPOINTS = {
  ROBOT_STATUS: '/ws/robot/status',
  ROBOT_POSITION: '/ws/robot/position',
  ROBOT_SENSORS: '/ws/robot/sensors'
};

// MQTT Configuration
export const MQTT_WS_URL = 'ws://localhost:9001';
export const MQTT_TOPICS = {
  SPEED: 'robot/speed',
  BATTERY: 'robot/battery',
  SENSORS: 'robot/sensors',
  POSITION: 'robot/position',
  STATUS: 'robot/status',
  COMMANDS: 'robot/commands',
  ERRORS: 'robot/errors',
  LOGS: 'robot/logs',
  TEMPERATURE: 'robot/temperature',
};

// Default Configuration
export const DEFAULT_CONFIG = {
  // Request timeout in milliseconds
  REQUEST_TIMEOUT: 5000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // WebSocket reconnection
  WS_RECONNECT_INTERVAL: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 10,
  
  // MQTT configuration
  MQTT_KEEP_ALIVE: 60,
  MQTT_RECONNECT_PERIOD: 1000,
  
  // Authentication
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes before expiry
  
  // UI Configuration
  MAP_UPDATE_INTERVAL: 1000,
  STATUS_UPDATE_INTERVAL: 2000,
  SENSOR_UPDATE_INTERVAL: 500
};

// Environment-specific overrides
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export const getWsUrl = (endpoint) => {
  return `${WS_BASE_URL}${endpoint}`;
};