import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FaBatteryFull, FaTachometerAlt, FaMapMarkerAlt, FaTemperatureHigh } from 'react-icons/fa';
import './LogsDashboard.css';
import mqtt from 'mqtt';
import { MQTT_WS_URL, MQTT_TOPICS, DEFAULT_CONFIG, FEATURES } from '../config';

const cardBg = '#232837';
const accentGreen = '#4ade80';
const accentBlue = '#60a5fa';
const accentPurple = '#a78bfa';
const accentOrange = '#fbbf24';
const accentCyan = '#22d3ee';
const accentRed = '#ef4444';
const accentGray = '#6b7280';

function useRealtimeDataDiagnostics() {
  const [data, setData] = useState({
    battery: 85,
    speed: 1.2,
    temperature: 38,
    sensors: { Lidar: 450, Camera: 30, Ultrasonic: 120 },
    position: { x: 150, y: 200 },
    speedTrend: [],
    positionPath: [],
    sensorReadings: [],
    sensorStatus: [
      { name: 'LiDAR', value: 450 },
      { name: 'Ultrasonic', value: 120 },
      { name: 'Camera', value: 30 }
    ]
  });

  // Simulate data for demo purposes
  useEffect(() => {
    let battery = 85;
    let speed = 1.2;
    let temperature = 38;
    let posX = 150;
    let posY = 200;
    let direction = { x: 1, y: 1 };

    const simulateData = () => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Simulate battery (slow discharge)
      battery += (Math.random() - 0.52) * 0.5;
      battery = Math.max(15, Math.min(100, battery));

      // Simulate speed fluctuation
      speed += (Math.random() - 0.5) * 0.3;
      speed = Math.max(0, Math.min(3, speed));

      // Simulate temperature
      temperature += (Math.random() - 0.5) * 2;
      temperature = Math.max(25, Math.min(60, temperature));

      // Simulate position movement (robot moving around)
      posX += direction.x * (Math.random() * 10 + 2);
      posY += direction.y * (Math.random() * 8 + 2);
      
      // Bounce off boundaries
      if (posX > 400 || posX < 50) direction.x *= -1;
      if (posY > 350 || posY < 50) direction.y *= -1;
      posX = Math.max(50, Math.min(400, posX));
      posY = Math.max(50, Math.min(350, posY));

      // Simulate sensor readings
      const lidar = Math.floor(400 + Math.random() * 200);
      const ultrasonic = Math.floor(80 + Math.random() * 100);
      const camera = Math.floor(25 + Math.random() * 15);

      setData(prev => ({
        battery: parseFloat(battery.toFixed(1)),
        speed: parseFloat(speed.toFixed(2)),
        temperature: parseFloat(temperature.toFixed(1)),
        sensors: { Lidar: lidar, Camera: camera, Ultrasonic: ultrasonic },
        position: { x: Math.round(posX), y: Math.round(posY) },
        speedTrend: [...prev.speedTrend, { time: timeLabel, value: parseFloat(speed.toFixed(2)) }].slice(-20),
        positionPath: [...prev.positionPath, { x: Math.round(posX), y: Math.round(posY) }].slice(-30),
        sensorReadings: [...prev.sensorReadings, { time: timeLabel, lidar, ultrasonic }].slice(-20),
        sensorStatus: [
          { name: 'LiDAR', value: lidar },
          { name: 'Ultrasonic', value: ultrasonic },
          { name: 'Camera', value: camera }
        ]
      }));
    };

    // Generate initial data points
    for (let i = 0; i < 10; i++) {
      simulateData();
    }

    const interval = setInterval(simulateData, 1500);
    return () => clearInterval(interval);
  }, []);

  // Also try MQTT if enabled
  useEffect(() => {
    if (!FEATURES.ENABLE_MQTT) return;
    try {
      const client = mqtt.connect(MQTT_WS_URL, {
        keepalive: DEFAULT_CONFIG.MQTT_KEEP_ALIVE,
        reconnectPeriod: DEFAULT_CONFIG.MQTT_RECONNECT_PERIOD,
        clientId: `diagnostics-dashboard-${Math.random().toString(16).slice(2, 8)}`
      });
      client.on('connect', () => {
        client.subscribe(MQTT_TOPICS.SPEED);
        client.subscribe(MQTT_TOPICS.BATTERY);
        client.subscribe(MQTT_TOPICS.POSITION);
        client.subscribe(MQTT_TOPICS.TEMPERATURE);
        client.subscribe(MQTT_TOPICS.SENSORS);
      });
      client.on('message', (topic, message) => {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (topic === MQTT_TOPICS.SPEED) {
          const speed = Number(message.toString());
          setData(prev => ({ ...prev, speed, speedTrend: [...prev.speedTrend, { time: timeLabel, value: speed }].slice(-20) }));
        } else if (topic === MQTT_TOPICS.BATTERY) {
          const battery = Number(message.toString());
          setData(prev => ({ ...prev, battery }));
        } else if (topic === MQTT_TOPICS.POSITION) {
          try {
            const pos = JSON.parse(message.toString());
            setData(prev => {
              const newPosition = { x: pos.x, y: pos.y };
              const newPositionPath = [...prev.positionPath, newPosition].slice(-30);
              return { ...prev, position: newPosition, positionPath: newPositionPath };
            });
          } catch (e) {}
        } else if (topic === MQTT_TOPICS.TEMPERATURE) {
          const temperature = Number(message.toString());
          setData(prev => ({ ...prev, temperature }));
        } else if (topic === MQTT_TOPICS.SENSORS) {
          try {
            const sensors = JSON.parse(message.toString());
            setData(prev => ({
              ...prev,
              sensors,
              sensorReadings: [
                ...prev.sensorReadings,
                { time: timeLabel, lidar: sensors.Lidar, ultrasonic: sensors.Ultrasonic }
              ].slice(-20),
              sensorStatus: [
                { name: 'LiDAR', value: sensors.Lidar },
                { name: 'Ultrasonic', value: sensors.Ultrasonic },
                { name: 'Camera', value: sensors.Camera }
              ]
            }));
          } catch (e) {}
        }
      });
      return () => {
        client.end(true);
      };
    } catch (e) {
      console.warn('MQTT connection failed, using simulated data');
    }
  }, []);

  return data;
}

const DiagnosticsDashboard = () => {
  const data = useRealtimeDataDiagnostics();

  return (
    <div className="logs-dashboard" style={{ minHeight: '100vh', padding: 24, paddingLeft:70 }}>
      {/* Key Metrics Cards */}
      <div className="logs-metrics-cards">
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <FaBatteryFull size={32} color={accentGreen} />
          <div className="logs-metric-label">Battery</div>
          <div className="logs-metric-value" style={{ color: accentGreen }}>{data.battery.toFixed(1)}%</div>
        </div>
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <FaTachometerAlt size={32} color={accentBlue} />
          <div className="logs-metric-label">Speed</div>
          <div className="logs-metric-value" style={{ color: accentBlue }}>{data.speed.toFixed(2)} m/s</div>
        </div>
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <FaTemperatureHigh size={32} color={accentOrange} />
          <div className="logs-metric-label">Temperature</div>
          <div className="logs-metric-value" style={{ color: accentOrange }}>{data.temperature.toFixed(2)}°C</div>
        </div>
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <FaMapMarkerAlt size={32} color={accentPurple} />
          <div className="logs-metric-label">Position</div>
          <div className="logs-metric-value" style={{ color: accentPurple }}>X:{data.position.x} Y:{data.position.y}</div>
        </div>
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <div className="logs-metric-label">Lidar</div>
          <div className="logs-metric-value" style={{ color: accentCyan }}>{data.sensors.Lidar}</div>
        </div>
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <div className="logs-metric-label">Camera</div>
          <div className="logs-metric-value" style={{ color: accentBlue }}>{data.sensors.Camera}</div>
        </div>
        <div className="logs-metric-card" style={{ background: cardBg }}>
          <div className="logs-metric-label">Ultrasonic</div>
          <div className="logs-metric-value" style={{ color: accentGreen }}>{data.sensors.Ultrasonic}</div>
        </div>
      </div>
      {/* Charts Grid */}
      <div className="logs-charts-grid">
        {/* Speed Monitoring Line Chart */}
        <div className="logs-chart-card">
          <div className="logs-chart-title">Speed Monitoring</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.speedTrend}>
              <XAxis dataKey="time" stroke={accentGray} />
              <YAxis stroke={accentGray} />
              <CartesianGrid strokeDasharray="3 3" stroke={accentGray} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={accentBlue} strokeWidth={2} dot={false} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Position Trajectory Scatter Plot */}
        <div className="logs-chart-card">
          <div className="logs-chart-title">Position Trajectory</div>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart>
              <XAxis dataKey="x" name="X" stroke={accentGray} />
              <YAxis dataKey="y" name="Y" stroke={accentGray} />
              <CartesianGrid strokeDasharray="3 3" stroke={accentGray} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Trajectory" data={data.positionPath} fill={accentPurple} />
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {/* Sensor Readings Bar + Line Chart */}
        <div className="logs-chart-card">
          <div className="logs-chart-title">Sensor Readings</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.sensorReadings}>
              <XAxis dataKey="time" stroke={accentGray} tick={false} />
              <YAxis stroke={accentGray} />
              <CartesianGrid strokeDasharray="3 3" stroke={accentGray} />
              <Tooltip />
              <Bar dataKey="lidar" fill={accentPurple} name="LiDAR Points" />
              <Line type="monotone" dataKey="ultrasonic" stroke={accentCyan} name="Ultrasonic Distance" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Sensor Status Pie Chart */}
        <div className="logs-chart-card">
          <div className="logs-chart-title">Sensor Status</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.sensorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                {data.sensorStatus.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={[accentPurple, accentCyan, accentBlue, accentGreen, accentOrange, accentRed][idx % 6]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsDashboard; 