import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="user-profile">
      <div className="profile-info">
        <span className="welcome-text">Welcome, {user.username}!</span>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
