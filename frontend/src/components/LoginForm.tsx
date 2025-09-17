import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginForm.css';

interface LoginFormProps {
  onSuccess?: () => void;
  switchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, switchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(username, password);
    if (success) {
      setUsername('');
      setPassword('');
      onSuccess?.();
    }
  };

  return (
    <div className="login-form-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        {switchToRegister && (
          <p className="switch-form">
            Don't have an account?{' '}
            <button type="button" onClick={switchToRegister} className="link-button">
              Register here
            </button>
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginForm;
