import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './styles/App.css';
import RecipeForm from './components/RecipeForm';
import RecipeCard from './components/RecipeCard';
import JsonInfo from './components/JsonInfo';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Profile from './components/auth/Profile';
import AuthDebug from './components/auth/AuthDebug';
import FavoriteRecipes from './components/recipes/FavoriteRecipes';
import RecipeDetail from './components/recipes/RecipeDetail';
import { AuthProvider } from './contexts/AuthContext';
import recipeasyLogo from './media/recipeasy.png';
import config from './config';
import type { Recipe } from './types/recipe.types';

import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';

const App: React.FC = () => {
  const [url, setUrl] = React.useState('');
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);
    setSavedSuccess(false);

    try {
      const response = await fetch(`${config.apiUrl}/api/parse-recipe`, {
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

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    
    setSavedSuccess(false);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to save recipes');
      }
      
      const response = await fetch(`${config.apiUrl}/api/recipes/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: recipe.title,
          source_url: url,
          recipe_data: recipe
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save recipe');
      }
      
      setSavedSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    }
  };

  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <AppBar position="static" color="primary">
            <Toolbar>
              <img src={recipeasyLogo} alt="Recipeasy Logo" className="navbar-logo" />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Recipeasy
              </Typography>
              <Box>
                <Button color="inherit" component={Link} to="/">
                  Home
                </Button>
                <Button color="inherit" component={Link} to="/recipes/favorites">
                  My Recipes
                </Button>
                <Button color="inherit" component={Link} to="/profile">
                  Profile
                </Button>
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
                <Button color="inherit" component={Link} to="/debug">
                  Debug
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          <Container className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/recipes/favorites" element={<FavoriteRecipes />} />
              <Route path="/recipe/:recipeId" element={<RecipeDetail />} />
              <Route path="/debug" element={<AuthDebug />} />
              <Route path="/" element={
                <>
                  <header className="app-header">
                    <img src={recipeasyLogo} alt="Recipeasy Logo" className="app-logo" />
                    <h1 className="app-title">Recipeasy</h1>
                  </header>
                  
                  <main className="main-content">
                    <section className="form-section">
                      <RecipeForm 
                        url={url} 
                        setUrl={setUrl} 
                        onSubmit={handleSubmit} 
                        loading={loading} 
                      />
                    </section>

                    {error && (
                      <section className="error-section">
                        <p className="error-message">{error}</p>
                      </section>
                    )}

                    {savedSuccess && (
                      <section className="success-section">
                        <p className="success-message">Recipe saved to favorites!</p>
                      </section>
                    )}

                    {recipe && (
                      <>
                        <section className="recipe-section">
                          <RecipeCard recipe={recipe} />
                          <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleSaveRecipe}
                            sx={{ mt: 2 }}
                          >
                            Save to Favorites
                          </Button>
                        </section>
                        <section className="json-section">
                          <JsonInfo recipe={recipe} />
                        </section>
                      </>
                    )}
                  </main>
                </>
              } />
            </Routes>
          </Container>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
