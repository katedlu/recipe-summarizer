import React, { useEffect } from 'react';
import './styles/App.css';
import RecipeForm from './components/RecipeForm';
import RecipeCard from './components/RecipeCard';
import JsonButton from './components/JsonButton';
import TableView from './components/TableView';
import recipeasyLogo from './media/recipeasy.png';
import config from './config';
import type { Recipe } from './types/recipe.types';

const App: React.FC = () => {
  const [url, setUrl] = React.useState('');
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Update page title based on state
  useEffect(() => {
    if (recipe) {
      document.title = `${recipe.title} - Recipeasy`;
    } else if (loading) {
      document.title = 'Parsing Recipe... - Recipeasy';
    } else {
      document.title = 'Recipeasy - Recipe Parser and Organizer';
    }
  }, [recipe, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const response = await fetch(`${config.apiUrl}/api/parse-recipe`, {
      //const response = await fetch('http://localhost:5001/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Use the error message from the server response
        const errorMessage = data.error || 'Failed to parse recipe';
        throw new Error(errorMessage);
      }

      setRecipe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <a 
        href="#main-content" 
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            // Focus the main content first
            mainContent.focus();
            // Then focus the first interactive element (URL input)
            const firstInput = mainContent.querySelector('input, button, select, textarea, [tabindex]') as HTMLElement;
            if (firstInput) {
              setTimeout(() => firstInput.focus(), 100);
            }
          }
        }}
      >
        Skip to main content
      </a>
      
      <header className="app-header">
        <img src={recipeasyLogo} alt="Recipeasy application logo" className="app-logo" />
        <h1 className="app-title">Recipeasy</h1>
      </header>

      <main role="main" id="main-content" tabIndex={-1}>
        <RecipeForm
          url={url}
          setUrl={setUrl}
          onSubmit={handleSubmit}
          loading={loading}
        />

        {error && (
          <div className="error-message" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {recipe && (
          <section aria-label="Recipe Results">
            <RecipeCard recipe={recipe}>
              {recipe.raw_json && <JsonButton jsonData={recipe.raw_json} />}
            </RecipeCard>
            {recipe.raw_json && <TableView rawJson={recipe.raw_json} />}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
