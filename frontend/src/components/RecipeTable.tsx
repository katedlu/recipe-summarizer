import React from 'react';
import type { Recipe, IngredientGroup } from '../types/recipe.types';
import '../styles/RecipeTable.css';

type RecipeTableProps = {
  recipe: Recipe;
};

const RecipeTable: React.FC<RecipeTableProps> = ({ recipe }) => {
  // Ensure we always have a valid array of ingredient groups
  const groups: IngredientGroup[] = 
    recipe.ingredient_groups && recipe.ingredient_groups.length > 0
      ? recipe.ingredient_groups
      : [{ purpose: 'Ingredients', ingredients: recipe.ingredients }];

  return (
    <div className="recipe-table-container">
      <table className="recipe-table">
        <thead>
          <tr>
            <th className="group-column">Group</th>
            <th className="ingredient-column">Ingredient</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) => (
            // Map each ingredient in the group
            group.ingredients.map((ingredient, ingredientIndex) => (
              <tr key={`${groupIndex}-${ingredientIndex}`}>
                {/* Show group name only for first ingredient in group */}
                {ingredientIndex === 0 && (
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
