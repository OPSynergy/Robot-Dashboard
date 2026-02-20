  import React, { useState, useEffect, useRef } from 'react';
  import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
  import './App.css';
  import Sidebar from './components/Sidebar';
  import RobotStatus from './components/RobotStatus';
  import RobotMap from './components/RobotMap';
  import GoalInterface from './components/GoalInterface';
  import RobotLogin from './components/RobotLogin';
  import UserManagement from './components/UserManagement';
  import axios from 'axios';
  import { API_BASE_URL, API_ENDPOINTS, MQTT_WS_URL } from './config';
  import LockScreen from './components/LockScreen';
  import LogsDashboard from './components/LogsDashboard';
  import { FaBan } from 'react-icons/fa';
  import RobotGallery from './components/RobotGallery';
  import MapsHome from './components/MapsHome';
  import storageMap from './img/storage.png';
  import deliveryMap from './img/delivery.jpg';
  import MapCanvas from './components/MapCanvas';
  import FleetManagement from './components/FleetManagement';
  import AnalyticsDashboard from './components/AnalyticsDashboard';
  import DiagnosticsDashboard from './components/DiagnosticsDashboard';
  import RobotSetup from './components/RobotSetup';
  import robot1 from './assets/robots/1.png';
  import openLogo from './assets/upscalemedia-transformed_momentum_robotics.png';

  // Protected Route component
  const ProtectedRoute = ({ children, isAuthenticated, isLoading, onLogout }) => {
    if (isLoading) {
      return <div className="loading">Verifying authentication...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  // Dashboard component
  const Dashboard = ({ onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [robotPosition, setRobotPosition] = useState({ x: 406, y: 453 });
    const [homePosition, setHomePosition] = useState({ x: 406, y: 453 });
    const [userName, setUserName] = useState('');
    const [isEStop, setIsEStop] = useState(() => localStorage.getItem('eStopActive') === 'true');
    const [eStopActive, setEStopActive] = useState(() => localStorage.getItem('eStopActive') === 'true');
    const eStopRef = useRef(eStopActive);
    
    // WebSocket state management
    const [wsData, setWsData] = useState({ robots: {} });
    const [isWsConnected, setIsWsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const [dashboardMapType, setDashboardMapType] = useState(() => localStorage.getItem('lastMapType') || 'storage');
    const [showMapCanvas, setShowMapCanvas] = useState(false);
    const [showWaypointEditor, setShowWaypointEditor] = useState(false);
    const [pointsCount, setPointsCount] = useState(2);
    const [waypointActive, setWaypointActive] = useState(false);
    const [selectedPoints, setSelectedPoints] = useState([0, 1]);
    const [waypointCoords, setWaypointCoords] = useState([]);
    const [waypointsCovered, setWaypointsCovered] = useState(false);
    const navigationInterruptedRef = useRef(false);
    const lastWaypointReachedRef = useRef(false);
    const [robotCount, setRobotCount] = useState(0); // Only enabled robots
    const [enabledRobots, setEnabledRobots] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [dashboardTitle, setDashboardTitle] = useState('Robot Dashboard');

    // Fetch robot count from backend
    useEffect(() => {
      const fetchRobotCount = async () => {
        try {
          const res = await fetch('http://localhost:8000/robot-setup/count');
          if (!res.ok) throw new Error('Failed to fetch count');
          const data = await res.json();
          setRobotCount(data.count || 0); // Only enabled robots
        } catch {
          setRobotCount(0); // Default to 0 if API fails
        }
      };
      fetchRobotCount();
      // Optionally, poll every 10s for live updates
      const interval = setInterval(fetchRobotCount, 10000);
      return () => clearInterval(interval);
    }, []);

    // Fetch enabled robots for map markers
    useEffect(() => {
      const fetchEnabledRobots = async () => {
        try {
          const res = await fetch('http://localhost:8000/robot-setup');
          if (!res.ok) throw new Error('Failed to fetch robots');
          const data = await res.json();
          console.log('Fetched robots from backend:', data);
          // Only enabled robots, assign a default/random position if not present
          let robotsArr = data
            .filter(r => r.enabled === true || r.enabled === 1 || r.enabled === "1")
            .map((r, idx) => ({
              id: r.robot_id, // map robot_id to id
              name: r.robot_name, // map robot_name to name
              type: r.type,
              status: r.status,
              lastUpdated: r.last_updated,
              enabled: r.enabled,
              icon: r.icon || '',
              position: r.position || { x: 100 + idx * 60, y: 200 + idx * 40 }
            }));
          setEnabledRobots(robotsArr);
        } catch {
          setEnabledRobots([]);
        }
      };
      fetchEnabledRobots();
      const interval = setInterval(fetchEnabledRobots, 10000);
      return () => clearInterval(interval);
    }, []);

    // Derive connectionStatus from isWsConnected
    const connectionStatus = isWsConnected ? 'connected' : 'disconnected';

    useEffect(() => {
      // Get user's name from localStorage
      const storedName = localStorage.getItem('userName');
      if (storedName) {
        setUserName(storedName);
      }
    }, []);

    // WebSocket Connection Management
    useEffect(() => {
      eStopRef.current = eStopActive;
      let shouldConnect = !eStopActive;
      const connectWebSocket = () => {
        if (eStopRef.current) return;
        try {
          wsRef.current = new WebSocket('ws://localhost:8000/ws');
          wsRef.current.onopen = () => {
            if (eStopRef.current) { wsRef.current.close(); return; }
            console.log('Dashboard WebSocket Connected');
            setIsWsConnected(true);
            reconnectAttemptsRef.current = 0;
            wsRef.current.send(JSON.stringify({ type: 'get_status' }));
          };
          wsRef.current.onmessage = (event) => {
            if (eStopRef.current) return;
            try {
              const data = JSON.parse(event.data);
              setWsData(data);
            } catch (error) {
              console.warn('Error parsing WebSocket data:', error);
            }
          };
          wsRef.current.onerror = (error) => {
            if (eStopRef.current) return;
            setIsWsConnected(false);
          };
          wsRef.current.onclose = () => {
            if (eStopRef.current) return;
            setIsWsConnected(false);
            if (reconnectAttemptsRef.current < 5) {
              const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
              reconnectAttemptsRef.current += 1;
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
              }
              reconnectTimeoutRef.current = setTimeout(() => {
                if (eStopRef.current) return;
                connectWebSocket();
              }, backoffTime);
            }
          };
        } catch (error) {
          console.warn('Failed to connect Dashboard WebSocket:', error);
        }
      };
      if (!eStopActive) connectWebSocket();
      return () => {
        shouldConnect = false;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          wsRef.current.close();
        }
      };
    }, [eStopActive]);

    useEffect(() => {
      const handleStorage = (e) => {
        if (e.key === 'lastMapType') {
          setDashboardMapType(e.newValue || 'storage');
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Also update if user selects a map in this tab
    useEffect(() => {
      const interval = setInterval(() => {
        const current = localStorage.getItem('lastMapType') || 'storage';
        setDashboardMapType((prev) => (prev !== current ? current : prev));
      }, 500);
      return () => clearInterval(interval);
    }, []);

    const handleAddGoal = async (x, y, robotId) => {
      try {
        console.log('Adding goal at:', x, y, 'for robot:', robotId);
        await axios.post(`${API_BASE_URL}/goal/add`, {
          x: parseFloat(x),
          y: parseFloat(y),
          robot_id: robotId
        });
      } catch (error) {
        console.error('Error adding goal:', error);
        throw new Error('Failed to add goal: ' + error.message);
      }
    };

    const handleUpdateGoalStatus = async (goalId, newStatus) => {
      try {
        await axios.post(`${API_BASE_URL}/goal/update`, {
          id: goalId,
          status: newStatus
        });
      } catch (error) {
        console.error('Error updating goal status:', error);
        throw new Error('Failed to update goal status.');
      }
    };

    const handleCancelGoal = async () => {
      try {
        await axios.post(`${API_BASE_URL}/goal/cancel`);
        console.log('Goal cancelled successfully');
      } catch (error) {
        console.error('Error cancelling goal:', error);
      }
    };

    const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
    };

    const handleLogout = () => {
      onLogout();
    };

    // Monitor robot position to detect when it reaches the last waypoint
    useEffect(() => {
      if (waypointCoords.length > 0 && !lastWaypointReachedRef.current) {
        const lastWaypoint = waypointCoords[waypointCoords.length - 1];
        const distance = Math.sqrt(
          Math.pow(robotPosition.x - lastWaypoint.x, 2) + 
          Math.pow(robotPosition.y - lastWaypoint.y, 2)
        );
        
        // If robot is within 10 units of the last waypoint
        if (distance < 10) {
          lastWaypointReachedRef.current = true;
          setWaypointsCovered(true);
          setTimeout(() => {
            alert('Waypoints covered');
          }, 100);
        }
      }
    }, [robotPosition, waypointCoords]);

    return (
      <div className="dashboard-root">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onSectionChange={setDashboardTitle} />
        <div className="dashboard-main">
          <DashboardHeader
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            openLogo={openLogo}
            connectionStatus={connectionStatus}
            robotCount={robotCount}
            title={dashboardTitle}
            onEStop={() => {
              setIsEStop(true);
              setEStopActive(true);
              localStorage.setItem('eStopActive', 'true');
              if (wsRef.current) { wsRef.current.close(); }
              setIsWsConnected(false);
            }}
          />
          <Routes>
            <Route path="/" element={
          <div className="dashboard-content">
            <RobotMap 
              mapType={dashboardMapType}
              onAddGoal={handleAddGoal} 
              robotPositions={wsData.robots}
              wsData={wsData}
              isWsConnected={isWsConnected}
              waypointMarkers={waypointCoords}
              onMapClick={showWaypointEditor ? ((pt) => {
                if (waypointCoords.length >= pointsCount) {
                  alert('All points are marked. No points are left.');
                  return;
                }
                setWaypointCoords(coords => [...coords, pt]);
              }) : undefined}
              waypointMarkersColor={waypointsCovered ? 'green' : 'grey'}
              robots={enabledRobots}  // Changed from robots={[]}
              showMultipleRobots={true}
            />
            <GoalInterface 
              goals={wsData.robots} 
              onAddGoal={handleAddGoal} 
              onUpdateGoalStatus={handleUpdateGoalStatus} 
            />
          </div>
            } />
            <Route path="/users" element={
              <UserManagement />
            } />
            <Route path="/logs" element={<LogsDashboard position={wsData.position}   goals={wsData.robots} 
  eStopActive={eStopActive} />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/robot-control" element={
              <div className="dashboard-content robot-control">
                <RobotGallery speed={wsData.speed} />
                <div className="right-column-content">
                  <RobotMap 
                    mapType={dashboardMapType}
                    onAddGoal={handleAddGoal} 
                    robotPosition={robotPosition} 
                    setRobotPosition={setRobotPosition}
                    wsData={wsData}
                    isWsConnected={isWsConnected}
                    waypointMarkers={waypointCoords}
                    onMapClick={showWaypointEditor ? ((pt) => {
                      if (waypointCoords.length >= pointsCount) {
                        alert('All points are marked. No points are left.');
                        return;
                      }
                      setWaypointCoords(coords => [...coords, pt]);
                    }) : undefined}
                    waypointMarkersColor={waypointsCovered ? 'green' : 'grey'}
                    robots={enabledRobots}  // Changed from robots={[]}
                    showMultipleRobots={false}
                  />
                  <GoalInterface 
                    goals={wsData.robots} 
                    onAddGoal={handleAddGoal} 
                    onUpdateGoalStatus={handleUpdateGoalStatus} 
                  />
                </div>
              </div>
            } />
            <Route path="/maps" element={<MapsHome />} />
            <Route path="/maps/storage" element={<RobotMap mapType="storage" onAddGoal={handleAddGoal} robotPosition={robotPosition} setRobotPosition={setRobotPosition} wsData={wsData} isWsConnected={isWsConnected} waypointMarkers={waypointCoords} onMapClick={showWaypointEditor ? ((pt) => {
              if (waypointCoords.length >= pointsCount) {
                alert('All points are marked. No points are left.');
                return;
              }
              setWaypointCoords(coords => [...coords, pt]);
            }) : undefined} robots={[]} showMultipleRobots={false} />} />
            <Route path="/maps/delivery" element={<RobotMap mapType="delivery" onAddGoal={handleAddGoal} robotPosition={robotPosition} setRobotPosition={setRobotPosition} wsData={wsData} isWsConnected={isWsConnected} waypointMarkers={waypointCoords} onMapClick={showWaypointEditor ? ((pt) => {
              if (waypointCoords.length >= pointsCount) {
                alert('All points are marked. No points are left.');
                return;
              }
              setWaypointCoords(coords => [...coords, pt]);
            }) : undefined} robots={[]} showMultipleRobots={false} />} />
            <Route path="/fleet-management" element={
              <div className="dashboard-content fleet-management">
                <FleetManagement />
                <div className="right-column-content">
                  <RobotMap 
                    mapType={dashboardMapType}
                    onAddGoal={handleAddGoal} 
                    robotPosition={robotPosition} 
                    setRobotPosition={setRobotPosition}
                    wsData={wsData}
                    isWsConnected={isWsConnected}
                    waypointMarkers={waypointCoords}
                    onMapClick={showWaypointEditor ? ((pt) => {
                      if (waypointCoords.length >= pointsCount) {
                        alert('All points are marked. No points are left.');
                        return;
                      }
                      setWaypointCoords(coords => [...coords, pt]);
                    }) : undefined}
                    waypointMarkersColor={waypointsCovered ? 'green' : 'grey'}
                    robots={enabledRobots}  // Changed from robots={[]}
                    showMultipleRobots={false}
                  />
                  <GoalInterface 
                    goals={wsData.robots} 
                    onAddGoal={handleAddGoal} 
                    onUpdateGoalStatus={handleUpdateGoalStatus} 
                  />
                </div>
              </div>
            } />
            <Route path="/missions" element={
              <div className="dashboard-content missions" style={{paddingLeft:70}}>
                <div className="robot-status">
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: '#000',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'left',
                    fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
                    fontOpticalSizing: 'auto',
                    fontStyle: 'normal',
                  }}>Mission Control</h2>
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '18px', marginBottom: '16px' }}>
                    <button
                      style={{
                        background: '#232428',
                        border: 'none',
                        borderRadius: '16px',
                        width: '140px',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }}
                      onClick={async () => {
                        await handleAddGoal(400, 300, wsData.position[0]); // Pass robotId if available
                      }}
                    >
                      Home
                    </button>
                    <button
                      style={{
                        background: '#232428',
                        border: 'none',
                        borderRadius: '16px',
                        width: '140px',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }}
                      onClick={async () => {
                        const patrolRoute = [
                          { x: 50, y: 50 },    // Bottom-left
                          { x: 50, y: 350 },   // Top-left
                          { x: 375, y: 350 },  // Top-center
                          { x: 700, y: 350 },  // Top-right
                          { x: 700, y: 200 },  // Right-center
                          { x: 700, y: 100 },  // Bottom-right
                          { x: 375, y: 50 },   // Bottom-center
                          { x: 50, y: 50 },    // Return to start
                        ];
                        for (const point of patrolRoute) {
                          await handleAddGoal(point.x, point.y, wsData.position[0]); // Pass robotId if available
                          await new Promise(res => setTimeout(res, 700));
                        }
                      }}
                    >
                      Patrol Route
                    </button>
                    <button
                      style={{
                        background: '#232428',
                        border: 'none',
                        borderRadius: '16px',
                        width: '140px',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }}
                      onClick={() => setShowWaypointEditor((v) => !v)}
                    >
                      Waypoint Editor
                    </button>
                  </div>
                  {showWaypointEditor && (
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      padding: '24px 18px 18px 18px',
                      margin: '0 auto 18px auto',
                      maxWidth: 420,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '1.2rem', color: '#222c34', marginBottom: 18 }}>Points</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: 18 }}>
                        <button
                          style={{ background: '#232428', border: 'none', borderRadius: 12, width: 48, height: 48, color: '#fff', fontSize: '1.5rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                          onClick={() => {
                            setPointsCount(c => Math.max(2, c - 1));
                            setWaypointCoords(coords => coords.slice(0, Math.max(2, coords.length - 1)));
                          }}
                          disabled={pointsCount <= 2}
                        >-</button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 500, color: '#222c34', minWidth: 40, textAlign: 'center' }}>{pointsCount}</span>
                        <button
                          style={{ background: '#232428', border: 'none', borderRadius: 12, width: 48, height: 48, color: '#fff', fontSize: '1.5rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                          onClick={() => {
                            setPointsCount(c => Math.min(10, c + 1));
                          }}
                          disabled={pointsCount >= 10}
                        >+</button>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: 18 }}>
                        <button
                          style={{ background: '#bbb', color: '#222', border: 'none', borderRadius: 8, padding: '6px 18px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                          onClick={() => setWaypointCoords([])}
                          disabled={waypointCoords.length === 0}
                        >Clear</button>
                      </div>
                      <button
                        style={{
                          background: waypointActive ? '#e53935' : '#27ae60',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 12,
                          width: 120,
                          height: 48,
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          marginTop: 10,
                          boxShadow: waypointActive ? '0 2px 8px rgba(229,57,53,0.12)' : '0 2px 8px rgba(39,174,96,0.12)',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onClick={async () => {
                          if (!waypointActive && waypointCoords.length >= 2) {
                            setWaypointActive(true);
                            setWaypointsCovered(false);
                            navigationInterruptedRef.current = false;
                            lastWaypointReachedRef.current = false;
                            // Navigate through waypoints
                            for (let i = 0; i < waypointCoords.length; i++) {
                              if (navigationInterruptedRef.current) {
                                setWaypointActive(false);
                                return;
                              }
                              await handleAddGoal(waypointCoords[i].x, waypointCoords[i].y, wsData.position[0]); // Pass robotId if available
                              // Check for interruption after each goal
                              if (navigationInterruptedRef.current) {
                                setWaypointActive(false);
                                return;
                              }
                              // Wait between goals, but check for interruption during wait
                              await new Promise(res => {
                                const checkInterruption = () => {
                                  if (navigationInterruptedRef.current) {
                                    res();
                                  } else {
                                    setTimeout(checkInterruption, 100);
                                  }
                                };
                                setTimeout(checkInterruption, 100);
                              });
                              await new Promise(res => setTimeout(res, 600));
                            }
                            setWaypointActive(false);
                          } else if (waypointActive) {
                            navigationInterruptedRef.current = true;
                            setWaypointActive(false);
                            await handleCancelGoal();
                          }
                        }}
                        disabled={waypointCoords.length < 2}
                      >
                        {waypointActive ? 'Stop' : 'Start'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="right-column-content">
                  <RobotMap 
                    mapType={dashboardMapType}
                    onAddGoal={handleAddGoal} 
                    robotPosition={robotPosition} 
                    setRobotPosition={setRobotPosition}
                    wsData={wsData}
                    isWsConnected={isWsConnected}
                    waypointMarkers={waypointCoords}
                    onMapClick={showWaypointEditor ? ((pt) => {
                      if (waypointCoords.length >= pointsCount) {
                        alert('All points are marked. No points are left.');
                        return;
                      }
                      setWaypointCoords(coords => [...coords, pt]);
                    }) : undefined}
                    waypointMarkersColor={waypointsCovered ? 'green' : 'grey'}
                    robots={[]}
                    showMultipleRobots={false}
                  />
                  <GoalInterface 
                    goals={wsData.robots} 
                    onAddGoal={handleAddGoal} 
                    onUpdateGoalStatus={handleUpdateGoalStatus} 
                  />
                </div>
              </div>
            } />
            <Route path="/diagnostics" element={<DiagnosticsDashboard />} />
          </Routes>
        </div>
        {isEStop && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#e53935',
            fontSize: '2.2rem',
            fontWeight: 700,
            letterSpacing: 1,
            textShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
            <FaBan style={{ fontSize: '3rem', marginBottom: 24 }} />
            System Emergency Stop Activated
            <button
              style={{
                marginTop: 32,
                background: '#fff',
                color: '#e53935',
                border: '2px solid #e53935',
                borderRadius: 8,
                padding: '10px 32px',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'background 0.2s, color 0.2s',
              }}
              onClick={() => {
                setIsEStop(false);
                setEStopActive(false);
                localStorage.removeItem('eStopActive');
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  // Add this new component above AppRoutes
  function RobotSetupRoute({ logout }) {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [dashboardTitle, setDashboardTitle] = useState('Robot Setup');
    return (
      <div className="dashboard-root">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onSectionChange={setDashboardTitle} />
        <div className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <DashboardHeader
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            openLogo={openLogo}
            connectionStatus={"connected"}
            robotCount={0}
            title={dashboardTitle}
            onEStop={() => {}}
          />
          <div style={{ padding: 0, background: '#f7f7fa', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <RobotSetup />
          </div>
        </div>
      </div>
    );
  }

  // Add this new component above AppRoutes
  const DashboardHeader = ({
    isSidebarOpen,
    setIsSidebarOpen,
    openLogo,
    connectionStatus,
    robotCount,
    title = 'Robot Dashboard',
    onEStop,
  }) => (
    <header className="dashboard-header" style={{
      width: '100%',
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '0.3rem 2rem 0.3rem 1.1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '52px',
      position: 'relative',
      zIndex: 10,
      borderRadius: '18px',
      margin: '10px 18px 0 5px',
      transition: 'background 0.2s',
    }}>
      {!isSidebarOpen && (
        <button
          style={{
            position: 'absolute',
            top: 30,
            left: 35,
            zIndex: 201,
            background: 'transparent',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            padding: 0,
            width: 50,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
            outline: 'none',
          }}
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <img src={openLogo} alt="Open Sidebar" style={{ width: 100, height: 50, objectFit: 'contain', opacity: 0.85 }} />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <span className="dashboard-title" style={{ fontSize: '1.7rem', fontWeight: 700, color: '#222', marginLeft: '0.5rem', letterSpacing: 0.2 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.2rem' }}>
        <span className={`status-${connectionStatus}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.1rem', color: connectionStatus === 'connected' ? '#27ae60' : '#e11d48', fontWeight: 600 }}
        >
          <span style={{ fontSize: '1.3rem', marginRight: 4 }}>●</span>
          {connectionStatus === 'connected' ? 'Online' : 'Offline'}
          <span style={{ color: '#27ae60', fontWeight: 700, marginLeft: 6, fontSize: '1.1em' }}>{robotCount}</span>
        </span>
        <button
          style={{
            background: '#e53935',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '1rem',
            marginLeft: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            outline: 'none',
            transition: 'background 0.2s',
          }}
          title="System Emergency Stop"
          onClick={onEStop}
        >
          <FaBan style={{ fontSize: '1.2em' }} />
          System E-stop
        </button>
      </div>
    </header>
  );

  // AppRoutes component to use hooks inside Router context
  const AppRoutes = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(() => localStorage.getItem('isLocked') === 'true');
    const inactivityTimeoutRef = useRef(null);
    const logoutTimeoutRef = useRef(null);

    // Helper to reset inactivity timer
    const resetInactivityTimer = () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      inactivityTimeoutRef.current = setTimeout(() => {
        setIsLocked(true);
        localStorage.setItem('isLocked', 'true');
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Helper to set logout timer (24 hours)
    const setLogoutTimer = () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      if (loginTimestamp) {
        const now = Date.now();
        const elapsed = now - parseInt(loginTimestamp, 10);
        const remaining = 24 * 60 * 60 * 1000 - elapsed;
        if (remaining <= 0) {
          logout();
        } else {
          logoutTimeoutRef.current = setTimeout(() => {
            logout();
          }, remaining);
        }
      }
    };

    // Listen for user activity
    useEffect(() => {
      if (!isAuthenticated) return;
      const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
      const handleActivity = () => {
        if (!isLocked) resetInactivityTimer();
      };
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetInactivityTimer();
      setLogoutTimer();
      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
        if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      };
    }, [isAuthenticated, isLocked]);

    useEffect(() => {
      const checkAuth = () => {
        const isAuth = localStorage.getItem('isAuthenticated') === 'true';
        const loginTimestamp = localStorage.getItem('loginTimestamp');
        if (isAuth && loginTimestamp) {
          const now = Date.now();
          const elapsed = now - parseInt(loginTimestamp, 10);
          if (elapsed < 24 * 60 * 60 * 1000) {
            setIsAuthenticated(true);
          } else {
            // Session expired
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('loginTimestamp');
          setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      };

      checkAuth();
    }, []);

    const logout = () => {
      // Clear all auth-related data
      localStorage.removeItem('userId');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      localStorage.removeItem('loginTimestamp');
      setIsAuthenticated(false);
      setIsLocked(false);
    };

    // Handle login success
    const handleLoginSuccess = () => {
      setIsAuthenticated(true);
      setIsLocked(false);
      localStorage.setItem('loginTimestamp', Date.now().toString());
      setLogoutTimer();
      window.location.reload(); // Force reload after login to fix white screen
    };

    // Handle unlock success
    const handleUnlockSuccess = () => {
      setIsLocked(false);
      localStorage.removeItem('isLocked');
      resetInactivityTimer();
    };

    if (isLocked) {
      return <LockScreen onUnlock={handleUnlockSuccess} />;
    }

    return (
      <Routes>
        <Route 
          path="/login" 
          element={
            isLoading ? (
              <div className="loading">Loading...</div>
            ) : isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <RobotLogin onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />
        <Route
          path="/robot-setup"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
              onLogout={logout}
            >
              <RobotSetupRoute logout={logout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
              onLogout={logout}
            >
              <Dashboard onLogout={logout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  };

  // Main App component
  function App() {
    return (
      <Router>
        <AppRoutes />
      </Router>
    );
  }

  export default App;