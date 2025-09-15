import React from 'react';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Recipe Summarizer</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="url">Recipe URL:</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe"
            required
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginTop: '5px',
              fontSize: '16px'
            }}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Parsing...' : 'Parse Recipe'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      {recipe && (
        <div>
          {recipe.image && (
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <img 
                src={recipe.image} 
                alt={recipe.title}
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  maxHeight: '300px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}
          
          <h2 style={{ color: '#333', marginBottom: '10px' }}>{recipe.title}</h2>
          
          {recipe.host && (
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              Source: {recipe.host}
            </p>
          )}
          
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {recipe.prep_time && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>Prep Time:</strong> {recipe.prep_time} minutes
              </div>
            )}
            {recipe.cook_time && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#fff5ee', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>Cook Time:</strong> {recipe.cook_time} minutes
              </div>
            )}
            {recipe.total_time && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f0fff0', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>Total Time:</strong> {recipe.total_time} minutes
              </div>
            )}
            {recipe.yields && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#fff8dc', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>Serves:</strong> {recipe.yields}
              </div>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div>
              <h3 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                Ingredients:
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{ingredient}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 style={{ color: '#333', borderBottom: '2px solid #28a745', paddingBottom: '5px' }}>
                Instructions:
              </h3>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} style={{ marginBottom: '10px' }}>{instruction}</li>
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
