import React from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Container maxWidth="sm">
        <Box my={4} textAlign="center">
          <Typography variant="h5">
            You need to be logged in to view this page.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  // User profile info
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}>
              {getInitials(user.username)}
            </Avatar>
            <Box>
              <Typography variant="h4">
                {user.username}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {user.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h5" gutterBottom>
            Account Information
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Username" secondary={user.username} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Email" secondary={user.email} />
            </ListItem>
            <ListItem>
              <ListItemText primary="User ID" secondary={user.id} />
            </ListItem>
          </List>

          <Box mt={4} display="flex" justifyContent="space-between">
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/recipes/favorites')}
            >
              My Favorite Recipes
            </Button>
            
            <Button 
              variant="outlined" 
              color="error" 
              onClick={logout}
            >
              Logout
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Profile;