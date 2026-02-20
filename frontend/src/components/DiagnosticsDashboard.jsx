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
    battery: 0,
    speed: 0,
    temperature: 0,
    sensors: { Lidar: 0, Camera: 0, Ultrasonic: 0 },
    position: { x: 0, y: 0 },
    speedTrend: [],
    positionPath: [],
    sensorReadings: [],
    sensorStatus: []
  });

  useEffect(() => {
    if (!FEATURES.ENABLE_MQTT) return;
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
      if (topic === MQTT_TOPICS.SPEED) {
        const speed = Number(message.toString());
        setData(prev => ({ ...prev, speed, speedTrend: [...prev.speedTrend, { time: Date.now(), value: speed }].slice(-30) }));
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
              {
                time: Date.now(),
                lidar: sensors.Lidar,
                ultrasonic: sensors.Ultrasonic
              }
            ].slice(-30),
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