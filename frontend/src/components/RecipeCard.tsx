import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecipeInfo from './RecipeInfo';
import Equipment from './Equipment';
import Instructions from './Instructions';
import RecipeImage from './RecipeImage';
import RecipeTable from './RecipeTable';
import config from '../config';
import type { Recipe } from '../types/recipe.types';
import '../styles/RecipeCard.css';

type RecipeCardProps = {
  recipe: Recipe;
  url?: string; // Original URL used to parse the recipe
};

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, url }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { token, user } = useAuth();

  const handleSaveRecipe = async () => {
    if (!token || !user) {
      setSaveError('Please log in to save recipes');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const recipeData = {
        title: recipe.title,
        url: url || '',
        image: recipe.image,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        total_time: recipe.total_time,
        yields: recipe.yields
      };

      const response = await fetch(`${config.apiUrl}/api/save-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(recipeData),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000); // Hide success message after 3 seconds
      } else {
        const errorData = await response.json();
        setSaveError(errorData.error || 'Failed to save recipe');
      }
    } catch (err) {
      setSaveError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="recipe-card">
      {recipe.image && (
        <RecipeImage 
          imageSrc={recipe.image}
          title={recipe.title}
        />
      )}
      
      <div className="recipe-header">
        <h2 className="recipe-card__title">{recipe.title}</h2>
        {user && (
          <div className="save-recipe-section">
            {saved && (
              <div className="success-message">✅ Recipe saved!</div>
            )}
            {saveError && (
              <div className="error-message">{saveError}</div>
            )}
            <button 
              onClick={handleSaveRecipe} 
              disabled={saving || saved}
              className={`save-recipe-btn ${saved ? 'saved' : ''}`}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Recipe'}
            </button>
          </div>
        )}
      </div>
      
      {recipe.host && (
        <p className="recipe-card__source">
          Source: {recipe.host}
        </p>
      )}
      <RecipeInfo 
        prepTime={recipe.prep_time}
        cookTime={recipe.cook_time}
        totalTime={recipe.total_time}
        yields={recipe.yields}
      />
      <Equipment equipment={recipe.equipment || []} />
      <div className="recipe-card__content">
        <RecipeTable recipe={recipe} />
        
        <Instructions instructions={recipe.instructions} />
      </div>
    </div>
  );
};

export default RecipeCard;
