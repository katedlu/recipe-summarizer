import React from 'react';
import './styles/App.css';
import RecipeForm from './components/RecipeForm';
import RecipeCard from './components/RecipeCard';
import JsonInfo from './components/JsonInfo';
import UserProfile from './components/UserProfile';
import AuthModal from './components/AuthModal';
import SavedRecipes from './components/SavedRecipes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import recipeasyLogo from './media/recipeasy.png';
import config from './config';
import type { Recipe } from './types/recipe.types';

const AppContent: React.FC = () => {
  const [url, setUrl] = React.useState('');
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = React.useState(false);
  
  const { user, token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const response = await fetch(`${config.apiUrl}/api/parse-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setShowAuthModal(true);
          throw new Error('Please log in to parse recipes');
        }
        throw new Error('Failed to parse recipe');
      }

      const data = await response.json();
      setRecipe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <img src={recipeasyLogo} alt="Recipeasy Logo" className="app-logo" />
            <h1 className="app-title">Recipeasy</h1>
          </div>
          <div className="header-right">
            {user ? (
              <div className="user-section">
                <button 
                  className="saved-recipes-button" 
                  onClick={() => setShowSavedRecipes(true)}
                >
                  My Recipes
                </button>
                <UserProfile />
              </div>
            ) : (
              <button 
                className="login-button" 
                onClick={() => setShowAuthModal(true)}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <RecipeForm
        url={url}
        setUrl={setUrl}
        onSubmit={handleSubmit}
        loading={loading}
      />

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {recipe && <RecipeCard recipe={recipe} url={url} />}
      {recipe && recipe.raw_json && <JsonInfo jsonData={recipe.raw_json} />}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {showSavedRecipes && (
        <div className="modal-overlay">
          <div className="modal-content">
            <SavedRecipes onClose={() => setShowSavedRecipes(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
