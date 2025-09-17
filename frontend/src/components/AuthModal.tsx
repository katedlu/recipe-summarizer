import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import '../styles/AuthModal.css';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);

  const switchToRegister = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        {isLogin ? (
          <LoginForm 
            onSuccess={onClose} 
            switchToRegister={switchToRegister}
          />
        ) : (
          <RegisterForm 
            onSuccess={() => {
              setIsLogin(true); // Switch to login after successful registration
            }} 
            switchToLogin={switchToLogin}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal;
