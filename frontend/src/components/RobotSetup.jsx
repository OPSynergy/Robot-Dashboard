import React, { useState, useEffect } from 'react';
import './RobotSetup.css';
import robot2 from '../assets/robots/2.png';
import robot1 from '../assets/robots/1.png';

const API_URL = 'http://localhost:8000/robot-setup';
const COUNT_URL = 'http://localhost:8000/robot-setup/count';

function NotificationPopup({ message, onClose }) {
    if (!message) return null;
    return (
        <div className="notification-popup-overlay">
            <div className="notification-popup">
                <span>{message}</span>
                <button className="notification-close-btn" onClick={onClose}>OK</button>
            </div>
        </div>
    );
}

const RobotSetup = ({ onRobotSetupChange }) => {
    const [robots, setRobots] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRobotId, setCurrentRobotId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        id: '',
        type: '',
        enabled: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [robotCount, setRobotCount] = useState(0);
    const [notification, setNotification] = useState('');
    const [confirmDelete, setConfirmDelete] = useState({ show: false, robotId: null });
    const [robotIcon, setRobotIcon] = useState('');

    const robotTypes = ['Picker', 'Sorter', 'Transport', 'Loader'];

    // Fetch robot count from backend
    const fetchRobotCount = async () => {
        try {
            const res = await fetch(COUNT_URL);
            if (!res.ok) throw new Error('Failed to fetch count');
            const data = await res.json();
            setRobotCount(data.count || 0);
        } catch {
            setRobotCount(0);
        }
    };

    // Fetch robots from backend
    const fetchRobots = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch robots');
            const data = await res.json();
            
            // Remove duplicates based on robot_id
            const uniqueRobots = data.reduce((acc, current) => {
                const existingRobot = acc.find(robot => robot.robot_id === current.robot_id);
                if (!existingRobot) {
                    acc.push(current);
                }
                return acc;
            }, []);
            
            setRobots(uniqueRobots.map(r => ({
                id: r.robot_id,
                name: r.robot_name,
                type: r.type,
                status: 'Active',
                lastUpdated: r.last_updated,
                enabled: r.enabled,
                icon: r.icon || ''
            })));
        } catch (err) {
            setError('Could not load robots');
            setRobots([]);
        } finally {
            setLoading(false);
        }
        await fetchRobotCount();
    };

    useEffect(() => {
        fetchRobots();
    }, []);

    const openModal = (robotId = null) => {
        if (robotId) {
            setIsEditing(true);
            setCurrentRobotId(robotId);
            const robot = robots.find(r => r.id === robotId);
            if (robot) {
                setFormData({
                    name: robot.name,
                    id: robot.id,
                    type: robot.type,
                    enabled: robot.enabled
                });
                setRobotIcon(robot.icon || '');
            }
        } else {
            setIsEditing(false);
            setCurrentRobotId(null);
            setFormData({
                name: '',
                id: '',
                type: '',
                enabled: true
            });
            setRobotIcon('');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({
            name: '',
            id: '',
            type: '',
            enabled: true
        });
        setRobotIcon('');
        if (onRobotSetupChange) onRobotSetupChange();
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleIconChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setRobotIcon(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        if (!isEditing && robots.some(robot => robot.id === formData.id)) {
            setError('Robot ID already exists. Please choose a different ID.');
            setLoading(false);
            return;
        }
        
        const robotPayload = {
            robot_id: formData.id,
            robot_name: formData.name,
            type: formData.type,
            status: 'Active',
            battery: Math.floor(Math.random() * 100),
            last_updated: 'Just now',
            icon: robotIcon,
            enabled: formData.enabled
        };
        
        try {
            let res;
            if (isEditing) {
                res = await fetch(`${API_URL}/${formData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(robotPayload)
                });
            } else {
                res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(robotPayload)
                });
            }
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to save robot');
            }
            
            await fetchRobots();
            setNotification(isEditing ? 'Robot updated successfully!' : 'Robot added successfully!');
            closeModal();
            if (onRobotSetupChange) onRobotSetupChange();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (robotId) => {
        openModal(robotId);
    };

    const handleDelete = (robotId) => {
        setConfirmDelete({ show: true, robotId });
    };

    const handleConfirmDelete = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/${confirmDelete.robotId}`, { method: 'DELETE' });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to delete robot');
            }
            await fetchRobots();
            setNotification('Robot deleted successfully!');
            setConfirmDelete({ show: false, robotId: null });
            if (onRobotSetupChange) onRobotSetupChange();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelDelete = () => {
        setConfirmDelete({ show: false, robotId: null });
    };

    const handleToggleEnabled = async (robotId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/${robotId}/toggle`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to toggle robot');
            }
            await fetchRobots();
            setNotification('Robot status updated successfully!');
            if (onRobotSetupChange) onRobotSetupChange();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Inline styles for table to ensure proper row height
    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const rowStyle = {
        height: '60px',
        maxHeight: '60px',
        overflow: 'hidden'
    };

    const cellStyle = {
        padding: '12px 16px',
        borderBottom: '1px solid #e9ecef',
        verticalAlign: 'middle',
        height: '60px',
        maxHeight: '60px',
        overflow: 'hidden'
    };

    const headerStyle = {
        ...cellStyle,
        backgroundColor: '#f8f9fa',
        fontWeight: '600',
        color: '#2c3e50',
        borderBottom: '2px solid #e9ecef',
        height: '48px'
    };

    const avatarCellStyle = {
        ...cellStyle,
        width: '64px',
        padding: '8px',
        textAlign: 'center'
    };

    return (
        <div className="robot-setup-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' , paddingLeft: 70}}>
            <div className="robot-setup-header">
                <h1 style={{
                  fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
                  fontWeight: 600,
                  fontOpticalSizing: 'auto',
                  fontStyle: 'normal',
                }}>Robot Setup</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {robots.map((robot) => (
                            <span key={`avatar-${robot.id}`} style={{ display: 'inline-block', width: 32, height: 32, textAlign: 'center' }}>
                                {robot.icon ? (
                                    <img src={robot.icon} alt="icon" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', display: 'block', margin: '0 auto' }} />
                                ) : robot.name === 'OP' ? (
                                    <img src={robot2} alt="icon" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', display: 'block', margin: '0 auto' }} />
                                ) : (
                                    <span role="img" aria-label="robot" style={{ fontSize: 26, display: 'block', margin: '0 auto' }}>🤖</span>
                                )}
                            </span>
                        ))}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#222' }}>
                        Total: {robotCount}
                    </span>
                    <button className="add-robot-btn" onClick={() => openModal()}>
                        <span>+</span>
                        Add New Robot
                    </button>
                </div>
            </div>

            <div className="robot-table-container">
                <table style={tableStyle}>
                    <thead>
                        <tr style={rowStyle}>
                            <th style={{ ...headerStyle, ...avatarCellStyle }}>Avatar</th>
                            <th style={headerStyle}>Robot Name</th>
                            <th style={headerStyle}>Robot ID</th>
                            <th style={headerStyle}>Type</th>
                            <th style={headerStyle}>Status</th>
                            <th style={headerStyle}>Last Updated</th>
                            <th style={headerStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr style={rowStyle}>
                                <td colSpan="7" style={{ ...cellStyle, textAlign: 'center', height: '80px' }}>Loading robots...</td>
                            </tr>
                        ) : error ? (
                            <tr style={rowStyle}>
                                <td colSpan="7" style={{ ...cellStyle, textAlign: 'center', color: 'red', height: '80px' }}>{error}</td>
                            </tr>
                        ) : robots.length === 0 ? (
                            <tr style={rowStyle}>
                                <td colSpan="7" style={{ ...cellStyle, textAlign: 'center', color: '#666', height: '80px' }}>No robots found</td>
                            </tr>
                        ) : (
                            robots.map((robot) => (
                                <tr key={`robot-${robot.id}`} style={rowStyle}>
                                    <td style={avatarCellStyle}>
                                        {robot.icon ? (
                                            <img src={robot.icon} alt="icon" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', display: 'block', margin: '0 auto' }} />
                                        ) : robot.name === 'OP' ? (
                                            <img src={robot2} alt="icon" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', display: 'block', margin: '0 auto' }} />
                                        ) : (
                                            <span role="img" aria-label="robot" style={{ fontSize: 40, display: 'block', margin: '0 auto' }}>🤖</span>
                                        )}
                                    </td>
                                    <td style={cellStyle}>{robot.name}</td>
                                    <td style={{ ...cellStyle, color: '#007bff', fontWeight: '500', fontFamily: 'Courier New, monospace' }}>{robot.id}</td>
                                    <td style={cellStyle}>{robot.type}</td>
                                    <td style={cellStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={robot.enabled}
                                                    onChange={() => handleToggleEnabled(robot.id)}
                                                    disabled={loading}
                                                />
                                                <span className={`slider ${robot.enabled ? 'enabled' : 'disabled'}`}></span>
                                            </label>
                                        </div>
                                    </td>
                                    <td style={cellStyle}>{robot.lastUpdated}</td>
                                    <td style={cellStyle}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                            <button 
                                                className="action-btn edit-btn" 
                                                onClick={() => handleEdit(robot.id)}
                                                title="Edit"
                                                style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '16px' }}
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                className="action-btn delete-btn" 
                                                onClick={() => handleDelete(robot.id)}
                                                title="Delete"
                                                style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '16px' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for Add/Edit Robot */}
            <div className={`robot-modal ${isModalOpen ? 'show' : ''}`}>
                <div className="modal-content">
                    <span className="modal-close" onClick={closeModal}>&times;</span>
                    <h2 className="modal-title">
                        {isEditing ? 'Edit Robot' : 'Add New Robot'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Robot Name:</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="id">Robot ID:</label>
                            <input
                                type="text"
                                id="id"
                                name="id"
                                value={formData.id}
                                onChange={handleInputChange}
                                required
                                disabled={isEditing}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="type">Robot Type:</label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Type</option>
                                {robotTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="enabled">Enabled:</label>
                            <input
                                type="checkbox"
                                id="enabled"
                                name="enabled"
                                checked={formData.enabled}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="icon">Robot Icon:</label>
                            <input
                                type="file"
                                id="icon"
                                name="icon"
                                accept="image/*"
                                onChange={handleIconChange}
                            />
                            {robotIcon && (
                                <img src={robotIcon} alt="icon preview" style={{ width: 48, height: 48, borderRadius: '50%', marginTop: 8, objectFit: 'cover', border: '1px solid #eee' }} />
                            )}
                        </div>
                        <div className="form-buttons">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {isEditing ? 'Update Robot' : 'Save Robot'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <NotificationPopup message={notification} onClose={() => setNotification('')} />

            {/* Confirmation Popup for Delete */}
            {confirmDelete.show && (
                <div className="confirm-popup-overlay">
                    <div className="confirm-popup">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete robot {confirmDelete.robotId}?</p>
                        <div className="confirm-buttons">
                            <button className="btn btn-secondary" onClick={handleCancelDelete}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={loading}>
                                {loading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RobotSetup;