import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './LogsDashboard.css';
import mqtt from 'mqtt';
import { MQTT_WS_URL, MQTT_TOPICS, DEFAULT_CONFIG, FEATURES } from '../config';

const accentGreen = '#4ade80';
const accentOrange = '#fbbf24';
const accentBrown = '#b45309';
const accentGray = '#6b7280';

function useRealtimeDataAnalytics() {
  const [data, setData] = useState({
    batteryTrend: [],
    temperatureTrend: [],
    totalActivityData: [
      { name: 'On Mission', value: 18.5, color: '#3366ff' },
      { name: 'On Charging', value: 2.93, color: '#22c55e' },
      { name: 'At home/Idle', value: 2.7, color: '#fbbf24' },
    ],
  });

  useEffect(() => {
    if (!FEATURES.ENABLE_MQTT) return;
    const client = mqtt.connect(MQTT_WS_URL, {
      keepalive: DEFAULT_CONFIG.MQTT_KEEP_ALIVE,
      reconnectPeriod: DEFAULT_CONFIG.MQTT_RECONNECT_PERIOD,
      clientId: `analytics-dashboard-${Math.random().toString(16).slice(2, 8)}`
    });
    client.on('connect', () => {
      client.subscribe(MQTT_TOPICS.BATTERY);
      client.subscribe(MQTT_TOPICS.TEMPERATURE);
    });
    client.on('message', (topic, message) => {
      if (topic === MQTT_TOPICS.BATTERY) {
        const battery = Number(message.toString());
        setData(prev => ({ ...prev, batteryTrend: [...prev.batteryTrend, { time: Date.now(), value: battery }].slice(-30) }));
      } else if (topic === MQTT_TOPICS.TEMPERATURE) {
        const temperature = Number(message.toString());
        setData(prev => ({ ...prev, temperatureTrend: [...prev.temperatureTrend, { time: Date.now(), value: temperature }].slice(-30) }));
      }
    });
    return () => {
      client.end(true);
    };
  }, []);

  return data;
}

const formatHours = (h) => {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins}m`;
};

const AnalyticsDashboard = () => {
  const data = useRealtimeDataAnalytics();
  const totalActivityTotal = data.totalActivityData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="logs-dashboard" style={{ minHeight: '100vh', padding: 24 , paddingLeft: 70}}>
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
              <Pie data={data.totalActivityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} label={false}>
                {data.totalActivityData.map((entry, idx) => (
                  <Cell key={`cell-activity-${idx}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, marginLeft: 12 }}>
            {data.totalActivityData.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <span style={{ width: 14, height: 14, background: entry.color, borderRadius: '50%', display: 'inline-block' }}></span>
                <span style={{ color: entry.color, fontWeight: 600 }}>{entry.name}</span>
                <span style={{ marginLeft: 8, color: '#222', fontWeight: 500 }}>{formatHours(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 