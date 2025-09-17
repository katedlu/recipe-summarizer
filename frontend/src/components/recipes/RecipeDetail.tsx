import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
  Chip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';

interface Recipe {
  id: number;
  title: string;
  source_url: string;
  saved_at: string;
  notes: string;
  has_diagram: boolean;
  diagram_image: string | null;
  diagram_generated_at: string | null;
  recipe_data: {
    ingredients: string[];
    ingredient_groups: { name: string; ingredients: string[] }[];
    instructions: string[];
    equipment: string[];
    image: string;
    total_time: number | null;
    prep_time: number | null;
    cook_time: number | null;
    yields: string | null;
    host: string | null;
  };
}

const RecipeDetail: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!isAuthenticated || !recipeId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API_URL}/recipes/favorites/${recipeId}`);
        setRecipe(response.data.recipe);
        setNotes(response.data.recipe.notes || '');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load recipe');
        console.error('Error fetching recipe:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId, isAuthenticated]);

  const handleSaveNotes = async () => {
    if (!isAuthenticated || !recipeId) return;
    
    setSaveSuccess(false);
    setError(null);
    
    try {
      await axios.put(`${API_URL}/recipes/favorites/${recipeId}/notes`, { notes });
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save notes');
      console.error('Error saving notes:', err);
    }
  };
  
  const handleGenerateDiagram = async () => {
    if (!isAuthenticated || !recipeId) return;
    
    setDiagramLoading(true);
    setDiagramError(null);
    
    try {
      const response = await axios.post(`${API_URL}/recipes/favorites/${recipeId}/diagram`);
      
      // Update the recipe with the new diagram information
      setRecipe(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          has_diagram: true,
          diagram_generated_at: response.data.recipe.diagram_generated_at,
          diagram_image: "Diagram generation placeholder"
        };
      });
      
    } catch (err: any) {
      setDiagramError(err.response?.data?.error || 'Failed to generate diagram');
      console.error('Error generating diagram:', err);
    } finally {
      setDiagramLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box my={4} textAlign="center">
          <Typography variant="h5">
            You need to be logged in to view this recipe.
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

  if (error || !recipe) {
    return (
      <Container maxWidth="md">
        <Box my={4}>
          <Alert severity="error">
            {error || 'Recipe not found'}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate('/recipes/favorites')}
            sx={{ mt: 2 }}
          >
            Back to Favorites
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1">
              {recipe.title}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/recipes/favorites')}
            >
              Back to Favorites
            </Button>
          </Box>

          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Notes saved successfully!
            </Alert>
          )}

          <Grid container spacing={4}>
            {/* Left column - Recipe info */}
            <Grid item xs={12} md={7}>
              {recipe.recipe_data.image && (
                <Box mb={3}>
                  <img 
                    src={recipe.recipe_data.image} 
                    alt={recipe.title} 
                    style={{ width: '100%', borderRadius: '8px' }} 
                  />
                </Box>
              )}

              <Box mb={3} display="flex" flexWrap="wrap" gap={1}>
                {recipe.recipe_data.yields && (
                  <Chip label={`Yield: ${recipe.recipe_data.yields}`} />
                )}
                {recipe.recipe_data.total_time && (
                  <Chip label={`Total Time: ${recipe.recipe_data.total_time} mins`} />
                )}
                {recipe.recipe_data.prep_time && (
                  <Chip label={`Prep: ${recipe.recipe_data.prep_time} mins`} />
                )}
                {recipe.recipe_data.cook_time && (
                  <Chip label={`Cook: ${recipe.recipe_data.cook_time} mins`} />
                )}
              </Box>

              <Box mb={4}>
                <Typography variant="h5" gutterBottom>
                  Ingredients
                </Typography>
                
                {recipe.recipe_data.ingredient_groups && 
                 recipe.recipe_data.ingredient_groups.length > 0 ? (
                  // Display grouped ingredients
                  recipe.recipe_data.ingredient_groups.map((group, idx) => (
                    <Box key={idx} mb={2}>
                      {group.name && (
                        <Typography variant="subtitle1" fontWeight="bold">
                          {group.name}
                        </Typography>
                      )}
                      <List dense>
                        {group.ingredients.map((ingredient, i) => (
                          <ListItem key={i}>
                            <ListItemText primary={ingredient} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ))
                ) : (
                  // Display flat list of ingredients
                  <List dense>
                    {recipe.recipe_data.ingredients.map((ingredient, idx) => (
                      <ListItem key={idx}>
                        <ListItemText primary={ingredient} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {recipe.recipe_data.equipment && 
               recipe.recipe_data.equipment.length > 0 && (
                <Box mb={4}>
                  <Typography variant="h5" gutterBottom>
                    Equipment
                  </Typography>
                  <List dense>
                    {recipe.recipe_data.equipment.map((item, idx) => (
                      <ListItem key={idx}>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <Box mb={4}>
                <Typography variant="h5" gutterBottom>
                  Instructions
                </Typography>
                <List>
                  {recipe.recipe_data.instructions.map((step, idx) => (
                    <ListItem key={idx} alignItems="flex-start">
                      <ListItemText
                        primary={`Step ${idx + 1}`}
                        secondary={step}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {recipe.recipe_data.host && recipe.source_url && (
                <Box mb={2}>
                  <Typography variant="body2">
                    Source: <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                      {recipe.recipe_data.host}
                    </a>
                  </Typography>
                </Box>
              )}
              
              {/* Recipe Diagram Section */}
              <Box mb={4} mt={4}>
                <Typography variant="h5" gutterBottom>
                  Recipe Diagram
                </Typography>
                <Paper elevation={1} sx={{ p: 3, bgcolor: 'background.default' }}>
                  {recipe.has_diagram ? (
                    <Box>
                      <Typography variant="body1" gutterBottom>
                        Diagram generated on {recipe.diagram_generated_at ? new Date(recipe.diagram_generated_at).toLocaleString() : 'unknown date'}
                      </Typography>
                      <Box 
                        sx={{ 
                          height: '300px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          border: '1px dashed #ccc',
                          borderRadius: '4px',
                          my: 2
                        }}
                      >
                        {/* Display the diagram image when implemented */}
                        <Typography variant="h6" color="text.secondary">
                          Diagram Display Placeholder
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box textAlign="center" py={3}>
                      <Typography variant="body1" gutterBottom>
                        No diagram has been generated for this recipe yet.
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="primary"
                        sx={{ mt: 2 }}
                        onClick={handleGenerateDiagram}
                        disabled={diagramLoading}
                      >
                        {diagramLoading ? 'Generating...' : 'Generate Recipe Diagram'}
                      </Button>
                      {diagramError && (
                        <Typography color="error" sx={{ mt: 2 }}>
                          {diagramError}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Grid>

            {/* Right column - Notes */}
            <Grid item xs={12} md={5}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" gutterBottom>
                  My Notes
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Add your own notes, modifications, or tips about this recipe
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  placeholder="Write your notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSaveNotes}
                  fullWidth
                >
                  Save Notes
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default RecipeDetail;