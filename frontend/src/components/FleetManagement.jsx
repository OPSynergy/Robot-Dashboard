import React from 'react';
import './FleetManagement.css';
import robot1 from '../assets/robots/1.png';
import robot2 from '../assets/robots/2.png';
import robot3 from '../assets/robots/3.png';
import robot4 from '../assets/robots/4.png';

const robots = [
  {
    id: 'RO9985',
    type: 'AGV',
    icon: robot1,
    battery: 85,
    position: { x: 150, y: 200 },
    status: 'Idle',
    task: 'Idle',
    online: true,
  },
  {
    id: 'RO2398',
    type: 'Picker',
    icon: robot2,
    battery: 92,
    position: { x: 300, y: 150 },
    status: 'Picking',
    task: 'Picking',
    online: true,
  },
  {
    id: 'RO1569',
    type: 'Sorter',
    icon: robot3,
    battery: 78,
    position: { x: 450, y: 250 },
    status: 'Sorting',
    task: 'Sorting',
    online: true,
  },
  {
    id: 'RO2024',
    type: 'Transport',
    icon: robot4,
    battery: 45,
    position: { x: 200, y: 300 },
    status: 'Idle',
    task: 'Idle',
    online: false,
  },
];

const getBatteryColor = (battery) => {
  if (battery > 80) return '#4ade80';
  if (battery > 50) return '#fbbf24';
  return '#f87171';
};

const FleetManagement = () => (
  <div className="fleet-management-container">
    <div className="fleet-robots-list">
      {robots.map(robot => (
        <div className="fleet-robot-card-v2" key={robot.id}>
          <div className="fleet-robot-header">
            <img src={robot.icon} alt={robot.id} className="fleet-robot-img" />
            <div>
              <div className="fleet-robot-id">{robot.id}</div>
              <div className="fleet-robot-type">{robot.type}</div>
            </div>
            <div className="fleet-robot-status-icons">
              {robot.online ? (
                <span title="Online" style={{ color: '#4ade80', fontSize: 18 }}>📶</span>
              ) : (
                <span title="Offline" style={{ color: '#f87171', fontSize: 18 }}>📶</span>
              )}
              <span title="Delete" style={{ color: '#f87171', fontSize: 18, marginLeft: 8, cursor: 'pointer' }}>🗑️</span>
            </div>
          </div>
          <div className="fleet-robot-battery-row">
            <span style={{ fontSize: 14 }}>{robot.battery}%</span>
            <div className="fleet-robot-battery-bar-bg">
              <div
                className="fleet-robot-battery-bar"
                style={{
                  width: `${robot.battery}%`,
                  background: getBatteryColor(robot.battery),
                }}
              />
            </div>
          </div>
          <div className="fleet-robot-info-row">
            <span>📍 X: {robot.position.x}, Y: {robot.position.y}</span>
            <span>📝 {robot.task}</span>
          </div>
          <div className="fleet-robot-actions-row">
            <button
              className="fleet-robot-action-btn add"
              style={{ background: '#4ade80', color: '#fff' }}
            >
              Add
            </button>
            <button
              className="fleet-robot-action-btn remove"
              style={{ background: '#f87171', color: '#fff' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FleetManagement; 