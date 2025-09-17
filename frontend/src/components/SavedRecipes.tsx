import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import '../styles/SavedRecipes.css';

interface SavedRecipe {
  id: number;
  title: string;
  url: string;
  image_url: string | null;
  ingredients: string[];
  instructions: string[];
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  servings: string | null;
  saved_at: string;
  user_id: number;
}

interface SavedRecipesProps {
  onClose?: () => void;
}

const SavedRecipes: React.FC<SavedRecipesProps> = ({ onClose }) => {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    console.log('SavedRecipes useEffect triggered. Token:', token ? 'Present' : 'Missing');
    if (token) {
      fetchSavedRecipes();
    } else {
      console.log('No token available, not fetching recipes');
    }
  }, [token]);

  const fetchSavedRecipes = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Fetching saved recipes with token:', token ? 'Token present' : 'No token');
      console.log('API URL:', `${config.apiUrl}/api/saved-recipes`);
      
      const response = await fetch(`${config.apiUrl}/api/saved-recipes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        setRecipes(data.recipes);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError('Failed to fetch saved recipes');
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (recipeId: number) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/api/saved-recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
      } else {
        setError('Failed to delete recipe');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="saved-recipes-container">
        <div className="loading">Loading saved recipes...</div>
      </div>
    );
  }

  return (
    <div className="saved-recipes-container">
      <div className="saved-recipes-header">
        <h2>My Saved Recipes ({recipes.length})</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>No saved recipes yet!</p>
          <p>Parse and save some recipes to see them here.</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              {recipe.image_url && (
                <div className="recipe-image">
                  <img src={recipe.image_url} alt={recipe.title} />
                </div>
              )}
              
              <div className="recipe-content">
                <h3 className="recipe-title">
                  <a href={recipe.url} target="_blank" rel="noopener noreferrer">
                    {recipe.title}
                  </a>
                </h3>
                
                <div className="recipe-meta">
                  <div className="recipe-times">
                    {recipe.prep_time && (
                      <span>Prep: {formatTime(recipe.prep_time)}</span>
                    )}
                    {recipe.cook_time && (
                      <span>Cook: {formatTime(recipe.cook_time)}</span>
                    )}
                    {recipe.total_time && (
                      <span>Total: {formatTime(recipe.total_time)}</span>
                    )}
                  </div>
                  
                  {recipe.servings && (
                    <div className="recipe-servings">Serves: {recipe.servings}</div>
                  )}
                </div>

                <div className="recipe-summary">
                  <div className="ingredients-summary">
                    <strong>Ingredients ({recipe.ingredients.length}):</strong>
                    <div className="ingredients-preview">
                      {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                        <span key={index} className="ingredient-item">
                          {ingredient}
                        </span>
                      ))}
                      {recipe.ingredients.length > 3 && (
                        <span className="more-items">
                          +{recipe.ingredients.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="instructions-summary">
                    <strong>Instructions ({recipe.instructions.length} steps)</strong>
                  </div>
                </div>

                <div className="recipe-footer">
                  <div className="saved-date">
                    Saved: {formatDate(recipe.saved_at)}
                  </div>
                  
                  <div className="recipe-actions">
                    <a 
                      href={recipe.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="view-original-btn"
                    >
                      View Original
                    </a>
                    <button 
                      onClick={() => deleteRecipe(recipe.id)} 
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedRecipes;
