import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import config from '../config';

interface User {
  username: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('token');
    console.log('AuthProvider initialization - Token from localStorage:', savedToken ? 'Present' : 'Missing');
    return savedToken;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is logged in on app load
  useEffect(() => {
    console.log('AuthContext useEffect - Token from localStorage:', token ? 'Present' : 'Missing');
    if (token) {
      console.log('AuthContext - Fetching profile with token');
      fetchProfile();
    } else {
      console.log('AuthContext - No token found in localStorage');
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      console.log('fetchProfile - Making request to:', `${config.apiUrl}/api/profile`);
      console.log('fetchProfile - Using token:', token ? 'Token present' : 'No token');
      
      const response = await fetch(`${config.apiUrl}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('fetchProfile - Response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('fetchProfile - User data received:', userData);
        setUser(userData);
      } else {
        console.log('fetchProfile - Invalid token, logging out');
        // Token is invalid, remove it
        logout();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      logout();
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError('');

    try {
      console.log('login - Attempting login for user:', username);
      const response = await fetch(`${config.apiUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('login - Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const newToken = data.access_token;
        
        console.log('login - Received token:', newToken ? 'Token received' : 'No token in response');
        console.log('login - Setting token in state and localStorage');
        
        setToken(newToken);
        localStorage.setItem('token', newToken);
        
        console.log('login - Token set in localStorage:', localStorage.getItem('token') ? 'Success' : 'Failed');
        
        // Fetch user profile
        await fetchProfile();
        
        return true;
      } else {
        const errorData = await response.json();
        console.log('login - Login failed:', errorData);
        setError(errorData.error || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('login - Network error:', err);
      setError('Network error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setError('');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
