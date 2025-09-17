import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/RegisterForm.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  switchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, switchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { register, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }
    
    const success = await register(username, email, password);
    if (success) {
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onSuccess?.();
    }
  };

  const displayError = localError || error;

  return (
    <div className="register-form-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Register</h2>
        
        {displayError && <div className="error-message">{displayError}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating Account...' : 'Register'}
        </button>
        
        {switchToLogin && (
          <p className="switch-form">
            Already have an account?{' '}
            <button type="button" onClick={switchToLogin} className="link-button">
              Login here
            </button>
          </p>
        )}
      </form>
    </div>
  );
};

export default RegisterForm;
