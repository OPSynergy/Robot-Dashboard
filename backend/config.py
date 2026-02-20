# Backend Configuration Settings
# File: backend/config.py

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MQTT Broker Settings
MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_KEEPALIVE = int(os.getenv('MQTT_KEEPALIVE', 60))

# Robot Settings
ROBOT_ID = os.getenv('ROBOT_ID', 'robot_001')
PUBLISH_INTERVAL = float(os.getenv('PUBLISH_INTERVAL', 2.0))

# Topic Structure
TOPICS = {
    'temperature': f'{ROBOT_ID}/sensors/temperature',
    'battery': f'{ROBOT_ID}/sensors/battery',
    'humidity': f'{ROBOT_ID}/sensors/humidity',
    'location': f'{ROBOT_ID}/location',
    'status': f'{ROBOT_ID}/status',
    'motor_speed': f'{ROBOT_ID}/motor/speed',
    'commands': f'{ROBOT_ID}/commands'
}

# Sensor Simulation Ranges
SENSOR_RANGES = {
    'temperature': {'min': 20.0, 'max': 35.0},
    'battery': {'min': 10, 'max': 100},
    'humidity': {'min': 30.0, 'max': 80.0},
    'location_x': {'min': -50, 'max': 50},
    'location_y': {'min': -50, 'max': 50},
    'motor_speed': {'min': 0, 'max': 100}
}

# Robot Status Options
ROBOT_STATUSES = ['idle', 'moving', 'charging', 'error', 'maintenance']

# Debug Settings
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')