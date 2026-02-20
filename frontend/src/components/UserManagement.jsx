import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import './UserManagement.css';

const roles = ['Admin', 'Operator', 'Supervisor', 'Technician'];

const API_BASE_URL = 'http://localhost:8000'; // Adjust if needed

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
function ConfirmPopup({ message, onConfirm, onCancel }) {
    if (!message) return null;
    return (
        <div className="notification-popup-overlay">
            <div className="notification-popup">
                <span>{message}</span>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                    <button className="notification-close-btn" style={{ background: '#e53935' }} onClick={onCancel}>No</button>
                    <button className="notification-close-btn" onClick={onConfirm}>Yes</button>
                </div>
            </div>
        </div>
    );
}

const UserManagement = () => {
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'Admin') {
    return <Navigate to="/" replace />;
  }
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: '', emp_id: '', role: '', passcode: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', emp_id: '', role: '', passcode: '' });
  const [addError, setAddError] = useState('');
  const [notification, setNotification] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ show: false, userId: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditId(user.id);
    setEditData({ ...user });
  };

  const handleDelete = (userId) => {
    setConfirmDelete({ show: true, userId });
  };
  const confirmDeleteUser = async () => {
    const userId = confirmDelete.userId;
    setConfirmDelete({ show: false, userId: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsers();
      setNotification('User deleted successfully!');
      if (editId === userId) setEditId(null);
    } catch (err) {
      setNotification('Failed to delete user.');
    }
  };

  const handleSave = async (user) => {
    if (!/^\d{4}$/.test(editData.emp_id) || !/^\d{4}$/.test(editData.passcode)) {
      setNotification('Employee ID and Passcode must be exactly 4 digits.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (!response.ok) throw new Error('Failed to update user');
      setEditId(null);
      fetchUsers();
      setNotification('User updated successfully!');
    } catch (err) {
      setNotification('Failed to update user.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if ((name === 'emp_id' || name === 'passcode')) {
      if (!/^\d{0,4}$/.test(value)) return;
    }
    setEditData({ ...editData, [name]: value });
  };

  // Add New User Modal Handlers
  const openModal = () => {
    setNewUser({ name: '', emp_id: '', role: '', passcode: '' });
    setAddError('');
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setAddError('');
  };
  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    if ((name === 'emp_id' || name === 'passcode')) {
      if (!/^\d{0,4}$/.test(value)) return;
    }
    setNewUser({ ...newUser, [name]: value });
  };
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !/^\d{4}$/.test(newUser.emp_id) || !newUser.role || !/^\d{4}$/.test(newUser.passcode)) {
      setAddError('All fields are required and Employee ID/Passcode must be 4 digits.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!response.ok) throw new Error('Failed to add user');
      closeModal();
      fetchUsers();
      setNotification('User added successfully!');
    } catch (err) {
      setAddError('Failed to add user.');
    }
  };

  if (loading) {
    return <div className="user-management"><div className="loading-container">Loading users...</div></div>;
  }

  if (error) {
    return <div className="user-management"><div className="error-message">{error}</div></div>;
  }

  return (
    <div className="user-management" style={{paddingLeft:70}}>
      <div className="user-management-content">
        <div className="um-header-row">
          <h2>
            Employee Details
          </h2>
          <button className="um-add-btn" onClick={openModal}>
            <span className="um-add-icon">＋</span> Add New
          </button>
        </div>
        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Role</th>
                <th>Passcode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  {editId === user.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          name="name"
                          value={editData.name}
                          onChange={handleInputChange}
                          className="um-edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="emp_id"
                          value={editData.emp_id}
                          onChange={handleInputChange}
                          maxLength={4}
                          className="um-edit-input"
                        />
                      </td>
                      <td>
                        <select
                          name="role"
                          value={editData.role}
                          onChange={handleInputChange}
                          className="um-edit-input"
                        >
                          {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="password"
                          name="passcode"
                          value={editData.passcode}
                          onChange={handleInputChange}
                          maxLength={4}
                          className="um-edit-input"
                        />
                      </td>
                      <td>
                        <button className="um-action-btn" title="Save" onClick={() => handleSave(user)}>
                          <span role="img" aria-label="save">💾</span>
                        </button>
                        <button className="um-action-btn" title="Delete" onClick={() => handleDelete(user.id)}>
                          <span role="img" aria-label="delete">🗑️</span>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.name}</td>
                      <td>{user.emp_id}</td>
                      <td>{user.role}</td>
                      <td>{'•'.repeat(user.passcode.length)}</td>
                      <td>
                        <button className="um-action-btn" title="Edit" onClick={() => handleEdit(user)}>
                          <span role="img" aria-label="edit">✏️</span>
                        </button>
                        <button className="um-action-btn" title="Save" disabled style={{opacity:0.5, cursor:'not-allowed'}}>
                          <span role="img" aria-label="save">💾</span>
                        </button>
                        <button className="um-action-btn" title="Delete" onClick={() => handleDelete(user.id)}>
                          <span role="img" aria-label="delete">🗑️</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Modal for Add New User */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Add New Employee</h2>
                <button className="modal-close" onClick={closeModal}>&times;</button>
              </div>
              <form className="modal-content" onSubmit={handleAddUser}>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" name="name" value={newUser.name} onChange={handleNewUserChange} required />
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input type="text" name="emp_id" value={newUser.emp_id} onChange={handleNewUserChange} maxLength={4} pattern="\d{4}" required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" value={newUser.role} onChange={handleNewUserChange} required>
                    <option value="">Select a role</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Passcode</label>
                  <input type="password" name="passcode" value={newUser.passcode} onChange={handleNewUserChange} maxLength={4} pattern="\d{4}" required />
                </div>
                {addError && <div className="error-message">{addError}</div>}
                <div className="modal-actions">
                  <button className="btn-secondary" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn-primary" type="submit">Add User</button>
                </div>
              </form>
            </div>
          </div>
        )}
        <NotificationPopup message={notification} onClose={() => setNotification('')} />
        <ConfirmPopup
          message={confirmDelete.show ? 'Are you sure you want to delete this user?' : ''}
          onConfirm={confirmDeleteUser}
          onCancel={() => setConfirmDelete({ show: false, userId: null })}
        />
      </div>
    </div>
  );
};

export default UserManagement; 