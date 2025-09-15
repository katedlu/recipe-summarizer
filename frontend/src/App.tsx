import React from 'react';
import './App.css';

interface IngredientGroup {
  purpose: string;
  ingredients: string[];
}

interface Recipe {
  title: string;
  ingredients: string[];
  ingredient_groups?: IngredientGroup[];
  instructions: string[];
  equipment?: string[];
  total_time?: number;
  prep_time?: number;
  cook_time?: number;
  yields?: string;
  image?: string;
  host?: string;
}

const App: React.FC = () => {
  const [url, setUrl] = React.useState('');
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const response = await fetch('http://localhost:5000/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
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

  const renderIngredients = () => {
    if (!recipe) return null;

    // If we have ingredient groups, use those; otherwise fall back to regular ingredients
    if (recipe.ingredient_groups && recipe.ingredient_groups.length > 0) {
      return (
        <div className="ingredients-section">
          <h3 className="ingredients-title">Ingredients:</h3>
          {recipe.ingredient_groups.map((group, groupIndex) => (
            <div key={groupIndex} className="ingredient-group">
              {group.purpose && (
                <h4 className="ingredient-group-purpose">
                  {group.purpose}
                </h4>
              )}
              <ul className="ingredients-list">
                {group.ingredients.map((ingredient, index) => (
                  <li key={index} className="ingredient-item">{ingredient}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    } else {
      // Fallback to regular ingredients list
      return (
        <div className="ingredients-section">
          <h3 className="ingredients-title">Ingredients:</h3>
          <ul className="ingredients-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="ingredient-item">{ingredient}</li>
            ))}
          </ul>
        </div>
      );
    }
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Recipe Summarizer</h1>
      
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label htmlFor="url" className="form-label">Recipe URL:</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe"
            required
            className="url-input"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Parsing...' : 'Parse Recipe'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {recipe && (
        <div className="recipe-container">
          {recipe.image && (
            <div className="recipe-image-container">
              <img 
                src={recipe.image} 
                alt={recipe.title}
                className="recipe-image"
              />
            </div>
          )}
          
          <h2 className="recipe-title">{recipe.title}</h2>
          
          {recipe.host && (
            <p className="recipe-source">
              Source: {recipe.host}
            </p>
          )}
          
          <div className="recipe-info">
            {recipe.prep_time && (
              <div className="info-badge prep-time">
                <strong>Prep Time:</strong> {recipe.prep_time} minutes
              </div>
            )}
            {recipe.cook_time && (
              <div className="info-badge cook-time">
                <strong>Cook Time:</strong> {recipe.cook_time} minutes
              </div>
            )}
            {recipe.total_time && (
              <div className="info-badge total-time">
                <strong>Total Time:</strong> {recipe.total_time} minutes
              </div>
            )}
            {recipe.yields && (
              <div className="info-badge serves">
                <strong>Serves:</strong> {recipe.yields}
              </div>
            )}
          </div>

          {recipe.equipment && recipe.equipment.length > 0 && (
            <div className="equipment-section">
              <h3 className="equipment-title">Equipment Needed:</h3>
              <div className="equipment-list">
                {recipe.equipment.map((item, index) => (
                  <span key={index} className="equipment-item">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="recipe-content">
            {renderIngredients()}
            
            <div className="instructions-section">
              <h3 className="instructions-title">Instructions:</h3>
              <ol className="instructions-list">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="instruction-item">{instruction}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
