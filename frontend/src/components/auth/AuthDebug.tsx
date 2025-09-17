import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Container, Divider, TextField } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '../../config';

// Test component to debug authentication issues
const AuthDebug: React.FC = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [localStorageToken, setLocalStorageToken] = useState<string | null>(null);
  
  // Check localStorage on mount and whenever we test auth
  useEffect(() => {
    checkLocalStorage();
  }, []);
  
  const checkLocalStorage = () => {
    const storedToken = localStorage.getItem('token');
    setLocalStorageToken(storedToken);
    console.log('localStorage token:', storedToken ? `${storedToken.substring(0, 10)}...` : 'none');
  };

  const testAuth = async () => {
    setTestResult(null);
    setTestError(null);
    checkLocalStorage();

    try {
      // First check if we have a token in localStorage
      const storedToken = localStorage.getItem('token');
      
      if (!storedToken) {
        setTestError('No token found in localStorage. Please login first.');
        return;
      }
      
      // Display current auth state
      console.log('Current auth state:', {
        isAuthenticated,
        contextToken: token ? `${token.substring(0, 10)}...` : null,
        localStorageToken: storedToken ? `${storedToken.substring(0, 10)}...` : null,
        user
      });
      
      console.log('Using localStorage token for request:', storedToken.substring(0, 10) + '...');
      
      // Try to access a protected endpoint
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });
      
      setTestResult(JSON.stringify(response.data, null, 2));
    } catch (err: any) {
      console.error('Auth test failed:', err);
      const errorDetails = {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers
      };
      console.error('Error details:', errorDetails);
      
      setTestError(
        `Error: ${err.message}\n` +
        `Status: ${err.response?.status} ${err.response?.statusText}\n` +
        `Details: ${JSON.stringify(err.response?.data || {}, null, 2)}`
      );
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>Authentication Debug</Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Current State:</Typography>
          <Typography>isAuthenticated: {isAuthenticated ? 'Yes' : 'No'}</Typography>
          <Typography>isLoading: {isLoading ? 'Yes' : 'No'}</Typography>
          <Typography>Context Token: {token ? `${token.substring(0, 10)}...` : 'None'}</Typography>
          <Typography>localStorage Token: {localStorageToken ? `${localStorageToken.substring(0, 10)}...` : 'None'}</Typography>
          <Typography>User: {user ? JSON.stringify(user) : 'None'}</Typography>
        </Box>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={testAuth}
          sx={{ mb: 2 }}
        >
          Test Authentication
        </Button>
        
        <Button 
          variant="outlined" 
          color="info" 
          onClick={checkLocalStorage}
          sx={{ mb: 2, ml: 2 }}
        >
          Refresh localStorage Status
        </Button>
        
        {testResult && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" color="success.main">Test Successful:</Typography>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'success.light' }}>
              <pre>{testResult}</pre>
            </Paper>
          </Box>
        )}
        
        {testError && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" color="error.main">Test Failed:</Typography>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'error.light' }}>
              <pre>{testError}</pre>
            </Paper>
          </Box>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>Raw localStorage Token:</Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={localStorage.getItem('token') || 'No token found'}
          InputProps={{
            readOnly: true,
          }}
        />
      </Paper>
    </Container>
  );
};

export default AuthDebug;