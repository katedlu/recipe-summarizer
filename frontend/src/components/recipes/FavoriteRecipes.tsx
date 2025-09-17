import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  Pagination,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';

interface SavedRecipe {
  id: number;
  title: string;
  source_url: string;
  saved_at: string;
  notes: string;
  has_diagram: boolean;
  diagram_generated_at: string | null;
  recipe_data: {
    ingredients: string[];
    instructions: string[];
    image: string;
    total_time: number | null;
    yields: string | null;
  };
}

interface PaginationInfo {
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
}

const FavoriteRecipes: React.FC = () => {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    pages: 0,
    current_page: 1,
    per_page: 6
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fetchFavorites = async (page = 1) => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/recipes/favorites`, {
        params: { page, per_page: pagination.per_page }
      });
      
      setRecipes(response.data.recipes);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load favorite recipes');
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    fetchFavorites(page);
  };

  const handleRemoveFavorite = async (recipeId: number) => {
    try {
      await axios.delete(`${API_URL}/recipes/favorites/${recipeId}`);
      // Refresh the current page
      fetchFavorites(pagination.current_page);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove recipe');
      console.error('Error removing favorite:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box my={4} textAlign="center">
          <Typography variant="h5">
            You need to be logged in to view your favorite recipes.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box my={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            My Favorite Recipes
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {recipes.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                You haven't saved any recipes yet.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/')}
                sx={{ mt: 2 }}
              >
                Go Find Recipes
              </Button>
            </Box>
          ) : (
            <>
              <Grid container spacing={3}>
                {recipes.map((recipe) => (
                  <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {recipe.recipe_data.image && (
                        <CardMedia
                          component="img"
                          height="140"
                          image={recipe.recipe_data.image}
                          alt={recipe.title}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography gutterBottom variant="h6" component="div" noWrap>
                          {recipe.title}
                        </Typography>
                        
                        <Box mb={1}>
                          {recipe.recipe_data.yields && (
                            <Chip 
                              label={recipe.recipe_data.yields} 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                          )}
                          {recipe.recipe_data.total_time && (
                            <Chip 
                              label={`${recipe.recipe_data.total_time} mins`} 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                          )}
                          {recipe.has_diagram && (
                            <Chip 
                              label="Has Diagram" 
                              color="primary"
                              size="small" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                          )}
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary">
                          {recipe.recipe_data.ingredients.length} ingredients • {recipe.recipe_data.instructions.length} steps
                        </Typography>
                        
                        {recipe.notes && (
                          <Box mt={1}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Notes:</strong> {recipe.notes}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/recipe/${recipe.id}`)}
                        >
                          View Details
                        </Button>
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveFavorite(recipe.id)}
                        >
                          Remove
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {pagination.pages > 1 && (
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination
                    count={pagination.pages}
                    page={pagination.current_page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default FavoriteRecipes;