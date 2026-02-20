import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FaBatteryFull, FaTachometerAlt, FaMapMarkerAlt, FaTemperatureHigh } from 'react-icons/fa';
import './LogsDashboard.css';
import mqtt from 'mqtt';
import { MQTT_WS_URL, MQTT_TOPICS, DEFAULT_CONFIG, FEATURES } from '../config';

const darkBg = '#181c24';
const cardBg = '#232837';
const textColor = '#fff';
const accentGreen = '#4ade80';
const accentBlue = '#60a5fa';
const accentPurple = '#a78bfa';
const accentOrange = '#fbbf24';
const accentCyan = '#22d3ee';
const accentBrown = '#b45309';
const accentRed = '#ef4444';
const accentGray = '#6b7280';

// Simulated real-time data generator
function useRealtimeData(eStopActive) {
  const [data, setData] = useState({
    battery: 0,
    speed: 0,
    temperature: 0,
    sensors: { Lidar: 0, Camera: 0, Ultrasonic: 0 },
    position: { x: 0, y: 0 },
    batteryTrend: [],
    speedTrend: [],
    positionPath: [],
    sensorReadings: [],
    temperatureTrend: [],
    systemUsage: [],
    sensorStatus: []
  });

  // MQTT integration for battery, speed, temperature, sensors, and position
  useEffect(() => {
    if (!FEATURES.ENABLE_MQTT || eStopActive) return;
    const client = mqtt.connect(MQTT_WS_URL, {
      keepalive: DEFAULT_CONFIG.MQTT_KEEP_ALIVE,
      reconnectPeriod: DEFAULT_CONFIG.MQTT_RECONNECT_PERIOD,
      clientId: `logs-dashboard-${Math.random().toString(16).slice(2, 8)}`
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
        setData(prev => ({ ...prev, battery, batteryTrend: [...prev.batteryTrend, { time: Date.now(), value: battery }].slice(-30) }));
      } else if (topic === MQTT_TOPICS.POSITION) {
        try {
          const pos = JSON.parse(message.toString());
      setData(prev => {
            const newPosition = { x: pos.x, y: pos.y };
            const newPositionPath = [...prev.positionPath, newPosition].slice(-30);
            return { ...prev, position: newPosition, positionPath: newPositionPath };
          });
        } catch (e) {
          // Ignore invalid position
        }
      } else if (topic === MQTT_TOPICS.TEMPERATURE) {
        const temperature = Number(message.toString());
        setData(prev => ({ ...prev, temperature, temperatureTrend: [...prev.temperatureTrend, { time: Date.now(), value: temperature }].slice(-30) }));
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
        } catch (e) {
          // Ignore invalid sensors
        }
      }
    });
    return () => {
      client.end(true); // Force disconnect and prevent reconnection
    };
  }, [eStopActive]);

  return data;
}

const LogsDashboard = ({ position, goals, eStopActive }) => {
  const [positionPath, setPositionPath] = useState([]);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('Diagnostics');

  // Update current position and trajectory when position prop changes
  useEffect(() => {
    if (position && Array.isArray(position) && position.length === 2) {
      const newPos = { x: position[0], y: position[1] };
      setCurrentPosition(newPos);
      setPositionPath(prev => [...prev, newPos].slice(-30));
    }
  }, [position]);

  // Add goal positions to trajectory when goals change
  useEffect(() => {
    if (goals && Array.isArray(goals)) {
      const goalPositions = goals.map(g => ({ x: g.x, y: g.y })).filter(g => g.x !== undefined && g.y !== undefined);
      setPositionPath(prev => {
        const combined = [...prev, ...goalPositions];
        // Remove duplicates and keep last 30
        const unique = Array.from(new Set(combined.map(p => `${p.x},${p.y}`))).map(str => {
          const [x, y] = str.split(',').map(Number);
          return { x, y };
        });
        return unique.slice(-30);
      });
    }
  }, [goals]);

  // ...rest of useRealtimeData for other metrics (battery, speed, etc.)
  const data = useRealtimeData(eStopActive);
  // Override position and positionPath with real values
  data.position = currentPosition;
  data.positionPath = positionPath;

  // Mock data for total robot activity
  const totalActivityData = [
    { name: 'On Mission', value: 18.5, color: '#3366ff' }, // hours
    { name: 'On Charging', value: 2.93, color: '#22c55e' }, // hours
    { name: 'At home/Idle', value: 2.7, color: '#fbbf24' }, // hours
  ];
  const totalActivityTotal = totalActivityData.reduce((acc, curr) => acc + curr.value, 0);
  const formatHours = (h) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="logs-dashboard" style={{ background: darkBg, color: textColor, minHeight: '100vh', padding: 24 }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          className={`logs-top-btn${activeTab === 'Analytics' ? ' active' : ''}`}
          onClick={() => setActiveTab('Analytics')}
        >
          Analytics
        </button>
        <button
          className={`logs-top-btn${activeTab === 'Diagnostics' ? ' active' : ''}`}
          onClick={() => setActiveTab('Diagnostics')}
        >
          Diagnostics
        </button>
      </div>
      {activeTab === 'Analytics' && (
      <div className="logs-charts-grid">
        {/* Battery Level Trend Area Chart */}
        <div className="logs-chart-card">
          <div className="logs-chart-title">Battery Level Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.batteryTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentGreen} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={accentGreen} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke={accentGray} />
              <YAxis stroke={accentGray} />
              <CartesianGrid strokeDasharray="3 3" stroke={accentGray} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={accentGreen} fillOpacity={1} fill="url(#batteryGradient)" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Temperature Area Chart */}
        <div className="logs-chart-card">
          <div className="logs-chart-title">Temperature Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.temperatureTrend}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentOrange} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={accentBrown} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke={accentGray} />
              <YAxis stroke={accentGray} />
              <CartesianGrid strokeDasharray="3 3" stroke={accentGray} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={accentOrange} fillOpacity={1} fill="url(#tempGradient)" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Total Robot Activity Pie Chart */}
        <div className="logs-chart-card">
          <div className="logs-chart-title" style={{ marginBottom: 8 }}>Total Activity <span style={{ float: 'right', fontWeight: 500 }}>{formatHours(totalActivityTotal)}</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={totalActivityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} label={false}>
                {totalActivityData.map((entry, idx) => (
                  <Cell key={`cell-activity-${idx}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, marginLeft: 12 }}>
            {totalActivityData.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <span style={{ width: 14, height: 14, background: entry.color, borderRadius: '50%', display: 'inline-block' }}></span>
                <span style={{ color: entry.color, fontWeight: 600 }}>{entry.name}</span>
                <span style={{ marginLeft: 8, color: '#fff', fontWeight: 500 }}>{formatHours(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
      {activeTab === 'Diagnostics' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '1.2rem' }}>
          Diagnostics data is now available in the Diagnostics section from the sidebar.
        </div>
      )}
    </div>
  );
};

export default LogsDashboard; 