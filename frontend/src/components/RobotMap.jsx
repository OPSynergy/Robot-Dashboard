import React, { useEffect, useState, useRef } from 'react';
import storageMap from '../img/storage.png';
import deliveryMap from '../img/delivery.jpg';
import robotMarkerImg from '../assets/robots/1.png';
import { WS_BASE_URL, DEFAULT_CONFIG, FEATURES, API_BASE_URL } from '../config';
import './RobotMap.css';

const getMapImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (imagePath.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  return imagePath;
};

const RobotMap = ({ robots = [], robotPositions = {}, showMultipleRobots = false, onAddGoal, wsData, isWsConnected, mapType = 'storage', customMapImage, homePosition, waypointMarkers = [], onMapClick, waypointMarkersColor = 'grey' }) => {
  const [orientation, setOrientation] = useState(0);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [currentTask, setCurrentTask] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [goalLocation, setGoalLocation] = useState(null);
  const [showRobotSelector, setShowRobotSelector] = useState(false);
  const [hopRobot, setHopRobot] = useState(null);
  const [assignError, setAssignError] = useState('');
  const assignmentTimeoutRef = useRef(null);

  let mapImage;
  if (customMapImage) {
    mapImage = getMapImageUrl(customMapImage);
  } else if (mapType === 'delivery') {
    mapImage = deliveryMap;
  } else {
    mapImage = storageMap;
  }

  // Update component state when WebSocket data changes
  useEffect(() => {
    if (wsData) {
      if (wsData.orientation !== undefined) {
        setOrientation(wsData.orientation);
      }
      if (wsData.currentTask) {
        setCurrentTask(wsData.currentTask);
      }
      if (wsData.lastUpdated) {
        setLastUpdated(wsData.lastUpdated);
      }
    }
  }, [wsData]);

  useEffect(() => {
    if (clickedPoint && robotPositions && Object.keys(robotPositions).length > 0) {
      // Check distance for each robot
      Object.values(robotPositions).forEach(robotState => {
        if (robotState && robotState.position) {
          const distance = Math.sqrt(
            Math.pow(robotState.position[0] - clickedPoint.x, 2) +
            Math.pow(robotState.position[1] - clickedPoint.y, 2)
          );
          const tolerance = 5;
          if (distance < tolerance) {
            setClickedPoint(null);
          }
        }
      });
    }
  }, [robotPositions, clickedPoint]);

  // Clean up hop animation
  useEffect(() => {
    if (hopRobot !== null) {
      assignmentTimeoutRef.current = setTimeout(() => setHopRobot(null), 600);
    }
    return () => clearTimeout(assignmentTimeoutRef.current);
  }, [hopRobot]);

  // Handle robot selection for goal assignment
  const handleRobotSelection = async (selectedRobot) => {
    if (!goalLocation) return;
    setAssignError('');
    setHopRobot(selectedRobot.id);
    try {
      await onAddGoal(goalLocation.x, goalLocation.y, selectedRobot.id);
      setShowRobotSelector(false);
      setGoalLocation(null);
      setClickedPoint(null);
    } catch (err) {
      setAssignError('Failed to assign goal.');
    }
  };

  const handleClick = async (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    if (onMapClick) {
      onMapClick({ x, y });
      return;
    }
    // Set goal location and show robot selector
    setGoalLocation({ x, y });
    setClickedPoint({ x, y });
    setShowRobotSelector(true);
  };

  return (
    <div className="robot-map">

      {/* Robot Selection Popup */}
      {showRobotSelector && goalLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(44, 62, 80, 0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            textAlign: 'center',
            minWidth: '400px',
            maxWidth: '500px',
            zIndex: 1001
          }}>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 16, color: '#333' }}>
              Select robot to assign goal at <span style={{ color: '#00c853' }}>({goalLocation.x}, {goalLocation.y})</span>:
            </div>
            {assignError && <div style={{ color: '#e53935', marginBottom: 12, fontSize: '14px' }}>{assignError}</div>}
            <div style={{ marginBottom: 20 }}>
              {robots && robots.length > 0 ? (
                robots.map((robot) => (
                  <button
                    key={robot.id}
                    onClick={() => handleRobotSelection(robot)}
                    style={{
                      display: 'block',
                      width: '100%',
                      margin: '8px 0',
                      padding: '15px',
                      background: '#f8f9fa',
                      border: '2px solid #dee2e6',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#e9ecef';
                      e.target.style.borderColor = '#00c853';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#f8f9fa';
                      e.target.style.borderColor = '#dee2e6';
                      e.target.style.transform = 'translateY(0px)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={robot.icon} alt={robot.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                      <span style={{ fontWeight: 600, color: '#333' }}>{robot.name || robot.id}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ color: '#6c757d', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
                  No robots available for assignment
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setShowRobotSelector(false);
                setGoalLocation(null);
                setClickedPoint(null);
              }}
              style={{
                background: '#e53935',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#d32f2f'}
              onMouseLeave={(e) => e.target.style.background = '#e53935'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Current Task Display */}
      {currentTask && (
        <div className="current-task-bar" style={{ 
          padding: '8px', 
          background: '#f0f8ff', 
          border: '1px solid #0066cc', 
          borderRadius: '4px', 
          marginBottom: '10px',
          fontSize: '14px',
          color: '#000000'
        }}>
          <strong>Current Task:</strong> {currentTask}
          {lastUpdated && <span style={{ marginLeft: '10px', color: '#222c34' }}>({lastUpdated})</span>}
        </div>
      )}
      <div className="map-container">
        <div className="map-grid">
          <img
            src={mapImage}
            alt={mapType === 'delivery' ? 'Delivery Area Map' : 'Storage Area Map'}
            className="warehouse-map-img"
            onClick={handleClick}
          />
          {/* Grey waypoint markers */}
          {waypointMarkers && waypointMarkers.map((pt, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: pt.x,
                top: pt.y,
                width: 12,
                height: 12,
                background: waypointMarkersColor === 'green' ? '#27ae60' : '#bbb',
                borderRadius: '50%',
                border: waypointMarkersColor === 'green' ? '2px solid #219150' : '2px solid #888',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
          ))}
          {/* Robot position markers (avatars) */}
          {robots && robots.length > 0 && robots.map((robot) => {
            const robotData = robotPositions ? robotPositions[robot.id] : null;
            console.log(`Rendering robot ${robot.id}:`, robotData);
            if (!robotData || !robotData.position) {
              console.log(`Skipping robot ${robot.id} - no position data`);
              return null;
            }
            return (
              <div
                key={robot.id}
                style={{
                  position: 'absolute',
                  left: robotData.position[0],
                  top: robotData.position[1],
                  width: 48,
                  height: 48,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={`${robot.name || robot.id} - ${robotData.currentTask || 'Idle'}`}
              >
                {robot.icon ? (
                  <img src={robot.icon} alt={robot.name} style={{ width: 48, height: 48, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                ) : (
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#3498db',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {(robot.name || robot.id || 'R').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
          {/* Clicked Point */}
          {clickedPoint && (
            <div
              className="clicked-point"
              style={{
                left: clickedPoint.x,
                top: clickedPoint.y
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RobotMap;