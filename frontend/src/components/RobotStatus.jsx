import React, { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import axios from 'axios';
import { MQTT_WS_URL, MQTT_TOPICS, DEFAULT_CONFIG, FEATURES, API_BASE_URL, API_ENDPOINTS } from '../config';
import './RobotStatus.css';

const RobotStatus = ({ wsData, isWsConnected, position = [0, 0], orientation = 0, currentTask = '' }) => {
  const [robotState, setRobotState] = useState({
    speed: 0,
    battery: 0,
    temperature: 0,
    sensors: {
      Lidar: 0,
      Camera: 0,
      Ultrasonic: 0,
    },
  });

  const mqttClientRef = useRef(null);

  // MQTT Connection
  useEffect(() => {
    if (!FEATURES.ENABLE_MQTT) {
      console.log('MQTT connections are disabled');
      return;
    }

    const connectMQTT = () => {
      try {
        console.log('Attempting to connect to MQTT broker at:', MQTT_WS_URL);
        mqttClientRef.current = mqtt.connect(MQTT_WS_URL, {
          keepalive: DEFAULT_CONFIG.MQTT_KEEP_ALIVE,
          reconnectPeriod: DEFAULT_CONFIG.MQTT_RECONNECT_PERIOD,
          clientId: `robot-dashboard-${Math.random().toString(16).slice(2, 8)}`
        });

        mqttClientRef.current.on('connect', () => {
          console.log('Connected to MQTT broker successfully');
          mqttClientRef.current.subscribe(MQTT_TOPICS.SPEED);
          mqttClientRef.current.subscribe(MQTT_TOPICS.BATTERY);
          mqttClientRef.current.subscribe(MQTT_TOPICS.SENSORS);
          mqttClientRef.current.subscribe(MQTT_TOPICS.TEMPERATURE);
          console.log('Subscribed to MQTT topics:', [MQTT_TOPICS.SPEED, MQTT_TOPICS.BATTERY, MQTT_TOPICS.SENSORS, MQTT_TOPICS.TEMPERATURE]);
        });

        mqttClientRef.current.on('error', (error) => {
          console.error('MQTT Error:', error);
        });

        mqttClientRef.current.on('message', (topic, message) => {
          console.log('Received MQTT message:', topic, message.toString());
          try {
            if (topic === MQTT_TOPICS.SPEED) {
              const speed = Number(message.toString());
              console.log('Updating speed to:', speed);
              setRobotState(prev => ({ ...prev, speed }));
            } else if (topic === MQTT_TOPICS.BATTERY) {
              const battery = Number(message.toString());
              console.log('Updating battery to:', battery);
              setRobotState(prev => ({ ...prev, battery }));
            } else if (topic === MQTT_TOPICS.SENSORS) {
              const sensors = JSON.parse(message.toString());
              console.log('Updating sensors to:', sensors);
              setRobotState(prev => ({ ...prev, sensors }));
            } else if (topic === MQTT_TOPICS.TEMPERATURE) {
              const temperature = Number(message.toString());
              console.log('Updating temperature to:', temperature);
              setRobotState(prev => ({ ...prev, temperature }));
            }
          } catch (e) {
            console.error('Error processing MQTT message:', e);
          }
        });

        mqttClientRef.current.on('close', () => {
          console.log('MQTT connection closed');
        });

        mqttClientRef.current.on('reconnect', () => {
          console.log('MQTT reconnecting...');
        });
      } catch (error) {
        console.error('Failed to connect to MQTT:', error);
      }
    };

    connectMQTT();

    return () => {
      if (mqttClientRef.current) {
        console.log('Disconnecting MQTT client');
        mqttClientRef.current.end();
      }
    };
  }, []);

  // Update robot state when WebSocket data changes
  useEffect(() => {
    if (wsData) {
      setRobotState(prev => ({
        ...prev,
        speed: wsData.speed !== undefined ? wsData.speed : prev.speed,
        battery: wsData.battery || prev.battery,
        sensors: wsData.sensors || prev.sensors,
      }));
    }
  }, [wsData]);

  const handleSpeedChange = async (amount) => {
    const currentSpeed = robotState.speed;
    let newSpeed = currentSpeed + amount;

    // Clamp speed between 0 and 1
    newSpeed = Math.max(0, Math.min(newSpeed, 1));

    try {
      await axios.post(`${API_BASE_URL}${API_ENDPOINTS.COMMAND}`, {
        type: 'set_speed',
        parameters: { speed: newSpeed }
      });
    } catch (error) {
      console.error('Error setting speed:', error);
    }
  };

  // Use WebSocket data if available, otherwise fall back to props
  const displayPosition = wsData && (wsData.position[0] !== 0 || wsData.position[1] !== 0) ? wsData.position : position;
  const displayOrientation = wsData && wsData.orientation !== 0 ? wsData.orientation : orientation;
  const displayCurrentTask = wsData && wsData.currentTask ? wsData.currentTask : currentTask;

  return (
    <div className="robot-status">
      <h2>
        Robot Status 
        {FEATURES.ENABLE_WEBSOCKET && (
          isWsConnected ? 
            <span style={{ color: 'green', fontSize: '12px', marginLeft: '10px' }}>● Live</span> :
            <span style={{ color: 'red', fontSize: '12px', marginLeft: '10px' }}>● Offline</span>
        )}
      </h2>
      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">Position</span>
          <div className="status-value">
            <div>X: {displayPosition[0]}</div>
            <div>Y: {displayPosition[1]}</div>
          </div>
        </div>
        <div className="status-item">
          <span className="status-label">Orientation</span>
          <span className="status-value">{displayOrientation}°</span>
        </div>
        <div className="status-item">
          <span className="status-label">Speed</span>
          <div className="speed-control">
            <button 
              onClick={() => handleSpeedChange(-0.1)} 
              className="speed-btn"
              disabled={robotState.speed <= 0}
            >
              -
            </button>
            <span className="status-value">
              {typeof robotState.speed === 'number' ? robotState.speed.toFixed(2) : robotState.speed} m/s
            </span>
            <button 
              onClick={() => handleSpeedChange(0.1)} 
              className="speed-btn"
              disabled={robotState.speed >= 1}
            >
              +
            </button>
          </div>
        </div>
        <div className="status-item">
          <span className="status-label">Battery</span>
          <span className="status-value">{robotState.battery}%</span>
        </div>
        <div className="status-item">
          <span className="status-label">Temperature</span>
          <span className="status-value">{robotState.temperature ? robotState.temperature + '°C' : 'N/A'}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Current Task</span>
          <span className="status-value">{displayCurrentTask || 'None'}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Sensors</span>
          <div className="status-value">
            <div>Lidar: {robotState.sensors.Lidar}</div>
            <div>Camera: {robotState.sensors.Camera}</div>
            <div>Ultrasonic: {robotState.sensors.Ultrasonic}</div>
          </div>
        </div>
        {wsData && wsData.lastUpdated && (
          <div className="status-item">
            <span className="status-label">Last Updated</span>
            <span className="status-value" style={{ fontSize: '12px', color: '#666' }}>
              {wsData.lastUpdated}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotStatus;