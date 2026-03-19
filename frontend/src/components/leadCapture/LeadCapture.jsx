"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { HiUser, HiMail, HiLockClosed, HiArrowRight, HiX } from 'react-icons/hi';

const LeadCapture = ({ 
  title = "Save Your Progress", 
  subtitle = "Register to save your results and access premium features",
  buttonText = "Register to Continue",
  source = "general",
  redirectTo = null,
  onClose = null,
  embedded = false
}) => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'jobseeker'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }
    if (!isLogin && !formData.name) {
      setError('Name is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      
      if (isLogin) {
        // Login
        const response = await axios.post(`${API_URL}/api/jobseeker/login`, {
          email: formData.email,
          password: formData.password
        });

        if (response.data.token) {
          localStorage.setItem('jobseekerToken', response.data.token);
          localStorage.setItem('jobseeker', JSON.stringify(response.data.jobseeker));
          
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            window.location.reload();
          }
        }
      } else {
        // Register
        const response = await axios.post(`${API_URL}/api/jobseeker/register`, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          source: source
        });

        if (response.data.token) {
          localStorage.setItem('jobseekerToken', response.data.token);
          localStorage.setItem('jobseeker', JSON.stringify(response.data.jobseeker));
          setSuccess(true);
          
          if (redirectTo) {
            setTimeout(() => router.push(redirectTo), 1500);
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onClose) {
      onClose();
    }
  };

  if (success) {
    return (
      <div className={`lead-capture-modal ${embedded ? 'embedded' : ''}`}>
        <div className="lead-capture-success">
          <div className="success-icon">✓</div>
          <h3>Registration Successful!</h3>
          <p>Redirecting you to continue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`lead-capture-modal ${embedded ? 'embedded' : ''}`}>
      <div className="lead-capture-container">
        {!embedded && onClose && (
          <button className="lead-capture-close" onClick={onClose}>
            <HiX size={20} />
          </button>
        )}
        
        <div className="lead-capture-header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="lead-capture-form">
          {!isLogin && (
            <div className="form-group">
              <HiUser className="input-icon" />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <HiMail className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <HiLockClosed className="input-icon" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <HiLockClosed className="input-icon" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
          )}

          {!isLogin && (
            <div className="form-group role-select">
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="jobseeker">Job Seeker</option>
                <option value="employer">Employer</option>
              </select>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner">Processing...</span>
            ) : (
              <>
                {isLogin ? 'Login' : 'Register'} <HiArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="lead-capture-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              className="switch-mode-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
          {embedded && (
            <button type="button" className="skip-btn" onClick={handleSkip}>
              Continue as Guest
            </button>
          )}
        </div>

        <div className="lead-capture-benefits">
          <h4>Benefits of Registration:</h4>
          <ul>
            <li>✓ Save your results and access them later</li>
            <li>✓ Unlock premium features</li>
            <li>✓ Get personalized job recommendations</li>
            <li>✓ Track your applications</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .lead-capture-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .lead-capture-modal.embedded {
          position: relative;
          background: transparent;
          padding: 0;
        }

        .lead-capture-container {
          background: white;
          border-radius: 16px;
          padding: 32px;
          width: 100%;
          max-width: 420px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .lead-capture-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          padding: 4px;
          border-radius: 4px;
        }

        .lead-capture-close:hover {
          background: #f5f5f5;
        }

        .lead-capture-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .lead-capture-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .lead-capture-header p {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .lead-capture-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-group .input-icon {
          position: absolute;
          left: 14px;
          color: #999;
          font-size: 18px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 14px 14px 14px 44px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group select {
          padding-left: 14px;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .error-message {
          color: #dc2626;
          font-size: 13px;
          text-align: center;
          padding: 8px;
          background: #fef2f2;
          border-radius: 6px;
        }

        .submit-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #4338ca;
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-spinner {
          color: white;
        }

        .lead-capture-footer {
          text-align: center;
          margin-top: 20px;
        }

        .lead-capture-footer p {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .switch-mode-btn {
          background: none;
          border: none;
          color: #4f46e5;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
        }

        .switch-mode-btn:hover {
          text-decoration: underline;
        }

        .skip-btn {
          margin-top: 12px;
          background: none;
          border: 1px solid #e5e5e5;
          color: #666;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .skip-btn:hover {
          background: #f9f9f9;
        }

        .lead-capture-benefits {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
        }

        .lead-capture-benefits h4 {
          font-size: 13px;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          font-weight: 600;
        }

        .lead-capture-benefits ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .lead-capture-benefits li {
          font-size: 12px;
          color: #666;
        }

        .lead-capture-success {
          text-align: center;
          padding: 40px;
        }

        .success-icon {
          width: 64px;
          height: 64px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 20px;
        }

        .lead-capture-success h3 {
          font-size: 20px;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .lead-capture-success p {
          color: #666;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default LeadCapture;
