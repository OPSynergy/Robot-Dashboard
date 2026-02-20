import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RobotLogin.css';
import logo from '../img/logo.png';
import { API_BASE_URL, API_ENDPOINTS } from '../config';

const RobotLogin = ({ onLoginSuccess }) => {
  const [employeeId, setEmployeeId] = useState(['', '', '', '']);
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const employeeIdRefs = useRef([]);
  const passcodeRefs = useRef([]);
  const buttonRef = useRef(null);

  useEffect(() => {
    employeeIdRefs.current = employeeIdRefs.current.slice(0, 4);
    passcodeRefs.current = passcodeRefs.current.slice(0, 4);
  }, []);

  const handleInputChange = (value, index, type) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    if (type === 'employeeId') {
      const newEmployeeId = [...employeeId];
      newEmployeeId[index] = value;
      setEmployeeId(newEmployeeId);

      // Auto-focus next input or move to passcode
      if (value) {
        if (index < 3) {
          employeeIdRefs.current[index + 1]?.focus();
        } else {
          // Last employeeId digit entered, move to first passcode input
          passcodeRefs.current[0]?.focus();
        }
      }
    } else {
      const newPasscode = [...passcode];
      newPasscode[index] = value;
      setPasscode(newPasscode);

      // Auto-focus next input or button
      if (value) {
        if (index < 3) {
          passcodeRefs.current[index + 1]?.focus();
        } else {
          // Last digit entered, focus button
          buttonRef.current?.focus();
        }
      }
    }
    setError('');
  };

  const handleKeyDown = (e, index, type) => {
    if (e.key === 'Backspace') {
      if (type === 'employeeId') {
        if (!employeeId[index] && index > 0) {
          employeeIdRefs.current[index - 1]?.focus();
        }
      } else {
        if (!passcode[index] && index > 0) {
          passcodeRefs.current[index - 1]?.focus();
        }
      }
    } else if (e.key === 'Enter' && type === 'passcode' && index === 3) {
      // Submit form if Enter is pressed on last passcode field
      buttonRef.current?.focus();
      setTimeout(() => buttonRef.current?.click(), 0);
    }
  };

  const handlePaste = (e, type) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    
    if (type === 'employeeId') {
      const newEmployeeId = pasteData.split('').concat(['', '', '', '']).slice(0, 4);
      setEmployeeId(newEmployeeId);
    } else {
      const newPasscode = pasteData.split('').concat(['', '', '', '']).slice(0, 4);
      setPasscode(newPasscode);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Convert arrays to strings
    const empId = employeeId.join('');
    const pass = passcode.join('');

    if (empId.length !== 4 || pass.length !== 4) {
      setError('Please enter complete 4-digit Employee ID and Passcode');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting login...');
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        employee_id: empId,  // Send as string
        passcode: pass      // Send as string
      });

      console.log('Login response:', response.data);
      
      if (response.data.success) {
        console.log('Login successful, storing auth state...');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', response.data.user_id);
        localStorage.setItem('userName', response.data.name);
        localStorage.setItem('userPasscode', pass);
        if (response.data.role === 'Admin') {
          localStorage.setItem('userRole', 'Admin');
        } else {
          localStorage.setItem('userRole', response.data.role);
        }
        console.log('Auth state stored, calling onLoginSuccess...');
        onLoginSuccess();
      } else {
        console.warn('Login response indicated failure:', response.data);
        setError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.detail) {
        setError(typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : 'Invalid credentials');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = employeeId.every(digit => digit !== '') && passcode.every(digit => digit !== '');

  return (
    <div className="robot-login-container">
      <div className="robot-login-wrapper">
        {/* Logo/Header */}
        <div className="robot-login-header">
          <div className="robot-login-logo-section">
            <img width={270} src={logo} alt="logo" className="robot-login-logo" />
          </div>
          <h2 className="robot-login-title">Robot Dashboard</h2>
          <p className="robot-login-subtitle">Enter your credentials to access the system</p>
        </div>

        {/* Login Form */}
        <div className="robot-login-form-container">
          <div className="robot-login-form">
            {/* Employee ID */}
            <div className="robot-login-field">
              <label className="robot-login-label">
                Employee ID
              </label>
              <div className="robot-login-otp-container">
                {employeeId.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => employeeIdRefs.current[index] = el}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleInputChange(e.target.value, index, 'employeeId')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'employeeId')}
                    onPaste={(e) => handlePaste(e, 'employeeId')}
                    className="robot-login-otp-input"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Passcode */}
            <div className="robot-login-field">
              <label className="robot-login-label">
                Passcode
              </label>
              <div className="robot-login-otp-container">
                {passcode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => passcodeRefs.current[index] = el}
                    type="password"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleInputChange(e.target.value, index, 'passcode')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'passcode')}
                    onPaste={(e) => handlePaste(e, 'passcode')}
                    className="robot-login-otp-input"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="robot-login-error">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              ref={buttonRef}
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              className={`robot-login-button ${!isFormValid || isLoading ? 'robot-login-button-disabled' : ''}`}
            >
              {isLoading ? (
                <div className="robot-login-loading">
                  <div className="robot-login-spinner"></div>
                  Authenticating...
                </div>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </div>
          <div className="robot-login-status">
            <div className="robot-login-status-item">
              <div className="robot-login-status-indicator robot-login-status-online"></div>
              System Online
            </div>
            <div className="robot-login-status-item">
              <div className="robot-login-status-indicator robot-login-status-online"></div>
              API Connected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotLogin;