import React from 'react';
import type { Recipe, IngredientGroup } from '../types/recipe.types';
import '../styles/RecipeTable.css';

type RecipeTableProps = {
  recipe: Recipe;
};

const RecipeTable: React.FC<RecipeTableProps> = ({ recipe }) => {
  // Check if we have meaningful ingredient groups
  const hasGroups = recipe.ingredient_groups && recipe.ingredient_groups.length > 0;
  
  // Ensure we always have a valid array of ingredient groups
  const groups: IngredientGroup[] = hasGroups
    ? recipe.ingredient_groups!
    : [{ purpose: 'Ingredients', ingredients: recipe.ingredients }];

  return (
    <div className="recipe-table-container">
      <table className="recipe-table">
        <thead>
          <tr>
            {hasGroups && <th className="group-column">Group</th>}
            <th className="ingredient-column">Ingredients</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) => (
            // Map each ingredient in the group
            group.ingredients.map((ingredient, ingredientIndex) => (
              <tr key={`${groupIndex}-${ingredientIndex}`}>
                {/* Show group name only for first ingredient in group, and only if we have groups */}
                {hasGroups && ingredientIndex === 0 && (
                  <td 
                    className="group-cell" 
                    rowSpan={group.ingredients.length}
                  >
                    {group.purpose}
                  </td>
                )}
                <td className="ingredient-cell">{ingredient}</td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecipeTable;
