// Sidebar.jsx
import React, { useState, createContext, useContext, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import logo from '../img/logo.png';
import collapsedLogo from '../assets/upscalemedia-transformed_momentum_robotics.png';
import '../App.css';
import axios from 'axios';

// ✅ Import SVGs as plain URLs — NO `?react`
import HomeIcon from '../assets/sidebar/home.svg';
import TeleopIcon from '../assets/sidebar/teleop.svg';
import AnalyticsIcon from '../assets/sidebar/analytics.svg';
import DiagnosticsIcon from '../assets/sidebar/diagnostics.svg';
import RobotSetupIcon from '../assets/sidebar/robot_setup.svg';
import MapsIcon from '../assets/sidebar/maps.svg';
import MissionsIcon from '../assets/sidebar/missions.svg';
import UserManagementIcon from '../assets/sidebar/user_management.svg';
import SettingsIcon from '../assets/sidebar/settings.svg';

const SidebarContext = createContext();

export default function Sidebar({ isOpen, onClose, onSectionChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('userName') || 'User';
  // Function to get first two uppercase letters
  const getInitials = (name) => {
    if (!name) return 'US';
    // Take first two non-space characters, uppercase
    return name
      .replace(/\s+/g, '')
      .substring(0, 2)
      .toUpperCase();
  };
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  const handleSidebarItemClick = (title, onClick) => {
    if (onSectionChange) onSectionChange(title);
    if (onClick) onClick();
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Ping backend to check status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Change this URL to your backend health endpoint if needed
        await axios.get('http://localhost:8000/health');
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setMenuOpen(false);
    localStorage.clear();
    window.location.href = '/login';
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const isActive = (path) => location.pathname === path;

  if (!isOpen) return null;

  return (
    <div
      style={{
        height: '100vh',
        width: expanded ? '260px' : '55px', // Reduced from 340px to 260px
        backgroundColor: '#111827',
        borderRight: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
  style={{
    padding: expanded ? '16px' : '10px 0 0 0', // Always keep top padding
    paddingBottom: expanded ? '8px' : '0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: expanded ? 'auto' : '55px',
    width: '100%',
  }}
>
        {expanded ? (
          <img
            src={logo}
            alt="Momentum Robotics Solutions"
            style={{
              height: '36px', // Reduced from 50px
              width: 'auto', // Changed from fixed 350px
              maxWidth: '220px', // Added max-width constraint
              transition: 'all 0.3s',
              opacity: 1,
              transform: 'scale(1)',
            }}
          />
        ) : (
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <img
              src={collapsedLogo}
              alt="Momentum Robotics Solutions"
              style={{
                height: '100%',
                width: '100%',
                maxHeight: '55px',
                maxWidth: '55px',
                objectFit: 'contain',
                transition: 'all 0.3s',
                opacity: 1,
                transform: 'scale(1)',
              }}
            />
          </button>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '8px',
            }}
          >
            <ChevronLeft size={32} color='#111827' />
          </button>
        )}
      </div>

      {/* Navigation */}
      <SidebarContext.Provider value={{ expanded, setExpanded }}>
        <div style={{flex: 1, padding: '0 0 0 2px', overflowY: 'visible' }}>
          <SidebarItem
            icon={HomeIcon}
            text="Dashboard"
            active={isActive('/')} 
            onClick={() => handleSidebarItemClick('Robot Dashboard', () => navigate('/'))} 
          />
          <SidebarItem
            icon={TeleopIcon}
            text="Teleoperation"
            active={isActive('/robot-control')} 
            onClick={() => handleSidebarItemClick('Teleoperation', () => navigate('/robot-control'))} 
          />
          <SidebarItem
            icon={AnalyticsIcon}
            text="Analytics"
            active={isActive('/analytics')} 
            onClick={() => handleSidebarItemClick('Analytics', () => navigate('/analytics'))} 
          />
          <SidebarItem
            icon={DiagnosticsIcon}
            text="Diagnostics"
            active={isActive('/diagnostics')} 
            onClick={() => handleSidebarItemClick('Diagnostics', () => navigate('/diagnostics'))} 
          />
          <SidebarItem
            icon={RobotSetupIcon}
            text="Robot Setup"
            active={isActive('/robot-setup')} 
            onClick={() => handleSidebarItemClick('Robot Setup', () => navigate('/robot-setup'))} 
          />
          <SidebarItem
            icon={MapsIcon}
            text="Maps"
            active={isActive('/maps')} 
            onClick={() => handleSidebarItemClick('Maps', () => navigate('/maps'))} 
          />
          <SidebarItem
            icon={MissionsIcon}
            text="Missions"
            active={isActive('/missions')} 
            onClick={() => handleSidebarItemClick('Missions', () => navigate('/missions'))} 
          />
          {userRole === 'Admin' && (
            <SidebarItem
              icon={UserManagementIcon}
              text="User Management"
              active={isActive('/users')} 
              onClick={() => handleSidebarItemClick('User Management', () => navigate('/users'))} 
            />
          )}
          <SidebarItem
            icon={SettingsIcon}
            text="Settings"
            active={isActive('/settings')} 
            onClick={() => handleSidebarItemClick('Settings', () => navigate('/settings'))} 
          />
        </div>
      </SidebarContext.Provider>
      {/* System Status */}
      {expanded && (
        <div style={{ padding: '18px 16px 12px 16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <h4 style={{ fontSize: '17px', fontWeight: '600', color: '#374151', margin: 0, marginBottom: '12px' }}>
              System Status
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: backendOnline ? '#10b981' : '#e11d48', marginRight: '10px' }}></div>
              <span style={{ fontSize: '15px', color: '#6b7280' }}>System Online</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: backendOnline ? '#10b981' : '#e11d48', marginRight: '10px' }}></div>
              <span style={{ fontSize: '15px', color: '#6b7280' }}>API Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div
        onClick={() => {
          setExpanded(true);
          if (onSectionChange) onSectionChange('Profile');
        }}
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          cursor: !expanded ? 'pointer' : 'default',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#c7d2fe',
            color: '#3730a3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          {getInitials(username)}
        </div>
        {expanded && (
          <div
            style={{
              marginLeft: '12px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {username}
              </span>
              <span style={{ fontSize: '12px', color: '#fff' }}>
                {userRole || 'User'}
              </span>
            </div>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                style={{ background: 'none', border: 'none', padding: 0, marginLeft: '12px', cursor: 'pointer' }}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreVertical size={16} style={{ color: '#9ca3af' }} />
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '120%',
                    right: 0,
                    background: '#222',
                    color: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    minWidth: '100px',
                    zIndex: 10001,
                    padding: '6px 0',
                  }}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      borderRadius: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#444'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 20000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#181a20',
            color: '#fff',
            borderRadius: '12px',
            padding: '32px 28px 24px 28px',
            minWidth: '320px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '18px' }}>
              Are you sure you want to logout?
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '18px' }}>
              <button
                onClick={cancelLogout}
                style={{
                  background: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 24px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#666'}
                onMouseOut={e => e.currentTarget.style.background = '#444'}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 24px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#be123c'}
                onMouseOut={e => e.currentTarget.style.background = '#e11d48'}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick }) {
  const { expanded } = useContext(SidebarContext);
  // Tooltip state for collapsed sidebar
  const [showTooltip, setShowTooltip] = React.useState(false);
  const { setExpanded } = useContext(SidebarContext) || {};

  return (
    <div
      onClick={e => {
        if (setExpanded) setExpanded(true);
        onClick && onClick(e);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 6px',
        margin: '18px 0',
        borderRadius: '8px',
        cursor: 'pointer',
        background: active ? '#e6e1fe' : 'transparent', // Only show background when active
        color: active ? '#000' : '#fff',
        fontWeight: 700,
        fontSize: '1.15rem',
        transition: 'background 0.2s, color 0.2s',
        position: 'relative',
      }}
      onMouseEnter={() => {
        if (!expanded) setShowTooltip(true); // Only show tooltip when collapsed
      }}
      onMouseLeave={() => {
        if (!expanded) setShowTooltip(false);
      }}
    >
      <span style={{
        width: 32,
        height: 32,
        minWidth: 32,
        minHeight: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: '#fff',
        marginRight: expanded ? 0 : 'auto',
        marginLeft: expanded ? 0 : '4px',
        transition: 'background 0.2s',
      }}>
        <img src={icon} alt="" style={{ width: 20, height: 20, display: 'block' }} />
      </span>
      <span
        className="sidebar-item-text"
        style={{
          marginLeft: expanded ? '16px' : '0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          width: expanded ? 'auto' : '0',
          opacity: expanded ? 1 : 0,
          transition: 'opacity 0.3s',
          fontSize: 'inherit',
        }}
      >
        {text}
      </span>
      {/* Tooltip for collapsed sidebar */}
      {!expanded && showTooltip && (
        <span
          style={{
            position: 'absolute',
            left: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#222',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '0.95rem',
            whiteSpace: 'nowrap',
            zIndex: 99999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
          }}
        >
          {text}
          {/* Tooltip arrow */}
          <span
            style={{
              position: 'absolute',
              left: '-4px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderRight: '4px solid #222',
            }}
          />
        </span>
      )}
    </div>
  );
}