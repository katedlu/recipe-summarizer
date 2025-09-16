import React from 'react';
import './styles/App.css';
import RecipeForm from './components/RecipeForm';
import RecipeCard from './components/RecipeCard';
import JsonInfo from './components/JsonInfo';
import type { Recipe } from './types/recipe.types';

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

  return (
    <div className="app-container">
      <h1 className="app-title">Recipe Summarizer</h1>
      
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

      {recipe && <RecipeCard recipe={recipe} />}
      {recipe && recipe.raw_json && <JsonInfo jsonData={recipe.raw_json} />}
    </div>
  );
};

export default App;
