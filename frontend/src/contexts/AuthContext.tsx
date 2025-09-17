import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

// Types
interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    console.log('Initial localStorage token:', storedToken ? `${storedToken.substring(0, 10)}...` : 'none');
    
    if (storedToken) {
      setToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Configure axios with token whenever token changes
  useEffect(() => {
    if (token) {
      console.log('Setting auth token in axios:', token.substring(0, 10) + '...');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      
      // Load user data when token is set
      loadUserData(token);
    } else {
      console.log('Removing auth token from axios');
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  // Separate function to load user data
  const loadUserData = async (currentToken: string) => {
    try {
      console.log('Loading user data with token');
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      console.log('User data loaded:', response.data);
      setUser(response.data.user);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading user:', err);
      // Don't clear token on error - it might be a temporary server issue
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (username: string, password: string) => {
    setError(null);
    try {
      console.log('Attempting login for user:', username);
      
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });
      
      if (!response.data.access_token) {
        throw new Error('No token received from server');
      }
      
      const newToken = response.data.access_token;
      console.log('Login successful, token received:', newToken.substring(0, 10) + '...');
      
      // Important: First store in localStorage, then update state
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(response.data.user);
      
      // Navigate after a short delay to ensure state updates
      setTimeout(() => navigate('/profile'), 100);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      throw err;
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    setError(null);
    try {
      console.log('Attempting to register user:', username);
      
      await axios.post(`${API_URL}/api/auth/register`, {
        username,
        email,
        password
      });
      
      console.log('Registration successful, proceeding to login');
      
      // Instead of auto-login within this function, do a separate login call
      await login(username, password);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      throw err;
    }
  };

  // Logout function
  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};