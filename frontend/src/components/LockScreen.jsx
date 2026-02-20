import React, { useState, useRef } from 'react';
import './RobotLogin.css';
import logo from '../img/logo.png';
import { API_BASE_URL, API_ENDPOINTS } from '../config';

const LockScreen = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const passcodeRefs = useRef([]);
  const userId = localStorage.getItem('userId');

  const handleInputChange = (value, index) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newPasscode = [...passcode];
    newPasscode[index] = value;
    setPasscode(newPasscode);
    if (value && index < 3) {
      passcodeRefs.current[index + 1]?.focus();
    }
    setError('');
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      passcodeRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newPasscode = pasteData.split('').concat(['', '', '', '']).slice(0, 4);
    setPasscode(newPasscode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const pass = passcode.join('');
    if (pass.length !== 4) {
      setError('Please enter your 4-digit passcode');
      setIsLoading(false);
      return;
    }
    try {
      // Compare with stored passcode in localStorage
      const storedPasscode = localStorage.getItem('userPasscode');
      if (pass === storedPasscode) {
        onUnlock();
      } else {
        setError('Incorrect passcode.');
      }
    } catch (err) {
      setError('Failed to unlock.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = passcode.every(digit => digit !== '');

  return (
    <div className="robot-login-container">
      <div className="robot-login-wrapper">
        <div className="robot-login-header">
          <div className="robot-login-logo-section">
            <img width={270} src={logo} alt="logo" className="robot-login-logo" />
          </div>
          <h2 className="robot-login-title">Session Locked</h2>
          <p className="robot-login-subtitle">Enter your passcode to unlock</p>
        </div>
        <div className="robot-login-form-container">
          <div className="robot-login-form">
            <div className="robot-login-field">
              <label className="robot-login-label">Passcode</label>
              <div className="robot-login-otp-container">
                {passcode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => passcodeRefs.current[index] = el}
                    type="password"
                    maxLength="1"
                    value={digit}
                    onChange={e => handleInputChange(e.target.value, index)}
                    onKeyDown={e => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    className="robot-login-otp-input"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
            {error && <div className="robot-login-error">{error}</div>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              className={`robot-login-button ${!isFormValid || isLoading ? 'robot-login-button-disabled' : ''}`}
            >
              {isLoading ? (
                <div className="robot-login-loading">
                  <div className="robot-login-spinner"></div>
                  Unlocking...
                </div>
              ) : (
                'Unlock'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockScreen; 