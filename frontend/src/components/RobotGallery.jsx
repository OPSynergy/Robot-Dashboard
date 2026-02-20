import React, { useState, useEffect } from 'react';
import { sendCommand } from './api';
import './RobotGallery.css';

const btnBase = {
  background: '#232428',
  border: 'none',
  borderRadius: '16px',
  width: '72px',
  height: '72px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '12px',
  cursor: 'pointer',
  transition: 'background 0.2s',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
};
const btnWide = {
  ...btnBase,
  width: '140px',
  height: '64px',
  margin: '12px 16px',
  borderRadius: '16px',
};
const iconStyle = { width: 36, height: 36, stroke: '#fff', strokeWidth: 3, fill: 'none' };
const rotateIconStyle = { width: 40, height: 40, stroke: '#fff', strokeWidth: 3, fill: 'none' };

const MOVE_STEP = 20; // pixels per click
const ROTATE_STEP = 15; // degrees per click

const RobotGallery = ({ robots = {}, selectedRobotId, onSelectRobot }) => {
  const [mode, setMode] = useState(() => localStorage.getItem('robotControlMode') || 'manual');
  
  const robotIds = Object.keys(robots);
  const [activeRobotId, setActiveRobotId] = useState(selectedRobotId || robotIds[0] || null);
  
  useEffect(() => {
    if (!activeRobotId && robotIds.length > 0) {
      setActiveRobotId(robotIds[0]);
    }
  }, [robotIds, activeRobotId]);
  
  const activeRobot = activeRobotId ? robots[activeRobotId] : null;
  const speed = activeRobot?.speed ?? 0.5;
  
  const handleMove = async (dx, dy) => {
    if (!activeRobotId) return;
    try {
      await sendCommand({ type: 'move', parameters: { x: dx, y: dy, robot_id: activeRobotId } });
    } catch (e) {
      console.error('Move command failed:', e);
    }
  };
  
  const handleRotate = async (angle) => {
    if (!activeRobotId) return;
    try {
      await sendCommand({ type: 'rotate', parameters: { angle, robot_id: activeRobotId } });
    } catch (e) {
      console.error('Rotate command failed:', e);
    }
  };
  const handleModeChange = (newMode) => {
    setMode(newMode);
    localStorage.setItem('robotControlMode', newMode);
  };
  
  const handleRobotSelect = (robotId) => {
    setActiveRobotId(robotId);
    if (onSelectRobot) onSelectRobot(robotId);
  };
  
  const handleSpeedChange = async (amount) => {
    if (!activeRobotId) return;
    let newSpeed = speed + amount;
    newSpeed = Math.max(0, Math.min(newSpeed, 1));
    try {
      await sendCommand({ type: 'set_speed', parameters: { speed: newSpeed, robot_id: activeRobotId } });
    } catch (e) {
      console.error('Set speed failed:', e);
    }
  };
  
  const noRobots = robotIds.length === 0;
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      minHeight: '60vh',
      justifyContent: 'flex-start',
      paddingTop: '1.2rem',
      width: '100%',
      paddingLeft: 70,
      fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#000', marginBottom: '20px', display: 'flex', alignItems: 'center', textAlign: 'left',
        fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
      }}>Robot Control</h2>
      
      {/* Robot selector dropdown */}
      {robotIds.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 500, color: '#222c34' }}>Control:</label>
          <select 
            value={activeRobotId || ''} 
            onChange={(e) => handleRobotSelect(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '1rem',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {robotIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      )}
      
      {noRobots && (
        <div style={{ 
          padding: '1rem', 
          background: '#fff3cd', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          color: '#856404',
          textAlign: 'center'
        }}>
          No robots available. Add robots in Robot Setup first.
        </div>
      )}
      {/* Toggle Switches */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '1rem', color: mode === 'automatic' ? '#3498db' : '#222c34',
          fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
        }}>
          <input type="radio" name="mode" checked={mode === 'automatic'} onChange={() => handleModeChange('automatic')} style={{ accentColor: '#3498db', width: 20, height: 20 }} />
          Automatic
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '1rem', color: mode === 'manual' ? '#3498db' : '#222c34',
          fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
        }}>
          <input type="radio" name="mode" checked={mode === 'manual'} onChange={() => handleModeChange('manual')} style={{ accentColor: '#3498db', width: 20, height: 20 }} />
          Manual
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Up Arrow */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button style={btnBase} aria-label="Forward" onClick={() => handleMove(0, -MOVE_STEP)} disabled={noRobots || mode !== 'manual'}>
            <svg style={iconStyle} viewBox="0 0 32 32"><polyline points="8,20 16,12 24,20"/></svg>
          </button>
        </div>
        {/* Left, Down, Right */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button style={btnBase} aria-label="Left" onClick={() => handleMove(-MOVE_STEP, 0)} disabled={noRobots || mode !== 'manual'}>
            <svg style={iconStyle} viewBox="0 0 32 32"><polyline points="20,8 12,16 20,24"/></svg>
          </button>
          <button style={btnBase} aria-label="Backward" onClick={() => handleMove(0, MOVE_STEP)} disabled={noRobots || mode !== 'manual'}>
            <svg style={iconStyle} viewBox="0 0 32 32"><polyline points="8,12 16,20 24,12"/></svg>
          </button>
          <button style={btnBase} aria-label="Right" onClick={() => handleMove(MOVE_STEP, 0)} disabled={noRobots || mode !== 'manual'}>
            <svg style={iconStyle} viewBox="0 0 32 32"><polyline points="12,8 20,16 12,24"/></svg>
          </button>
        </div>
        {/* Rotate Row */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <button style={btnWide} aria-label="Rotate Left" onClick={() => handleRotate(-ROTATE_STEP)} disabled={noRobots || mode !== 'manual'}>
            <svg style={rotateIconStyle} viewBox="0 0 40 40"><path d="M28 32a10 10 0 1 1 0-20"/><polyline points="28,22 28,32 18,32"/></svg>
          </button>
          <button style={btnWide} aria-label="Rotate Right" onClick={() => handleRotate(ROTATE_STEP)} disabled={noRobots || mode !== 'manual'}>
            <svg style={rotateIconStyle} viewBox="0 0 40 40"><path d="M12 32a10 10 0 1 0 0-20"/><polyline points="12,22 12,32 22,32"/></svg>
          </button>
        </div>
        {/* Speed Control */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2.2rem', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.95rem', color: '#222c34', marginBottom: '0.2rem', fontWeight: 500, letterSpacing: 0.2,
            fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
          }}>Speed</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <button style={{ ...btnBase, width: 48, height: 48, margin: 0, fontSize: '1.5rem', fontWeight: 700 }} onClick={() => handleSpeedChange(-0.1)} disabled={noRobots || speed <= 0 || mode !== 'manual'}>-</button>
            <span style={{ fontSize: '1.1rem', fontWeight: 500, color: '#222c34', minWidth: 80, textAlign: 'center',
              fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
            }}>{speed.toFixed(2)} m/s</span>
            <button style={{ ...btnBase, width: 48, height: 48, margin: 0, fontSize: '1.5rem', fontWeight: 700 }} onClick={() => handleSpeedChange(0.1)} disabled={noRobots || speed >= 1 || mode !== 'manual'}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotGallery; 