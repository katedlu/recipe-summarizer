import React from 'react';
import type { Recipe, IngredientGroup } from '../types/recipe.types';
import '../styles/RecipeTable.css';

type RecipeTableProps = {
  recipe: Recipe;
};

// Function to extract base ingredient name (remove amounts and preparations)
const getBaseIngredient = (ingredient: string): string => {
  return ingredient.replace(/^[\d./]+ (?:cups?|teaspoons?|tablespoons?|ounces?|grams?|kg|ml|g|oz|tbsp|tsp|lb|pound|pieces?|of\s)?/, '')
    .replace(/,?\s*(?:softened|chopped|diced|minced|beaten|melted|sifted|divided)/, '');
};

const RecipeTable: React.FC<RecipeTableProps> = ({ recipe }) => {
  // Check if we have meaningful ingredient groups
  const hasGroups = recipe.ingredient_groups && recipe.ingredient_groups.length > 0;
  
  // Ensure we always have a valid array of ingredient groups
  const groupedIngredients: IngredientGroup[] = hasGroups
    ? recipe.ingredient_groups!
    : [{ purpose: 'Ingredients', ingredients: recipe.ingredients }];

  // Find which ingredients are used together in each instruction step
  const findStepGroups = () => {
    const groups: { [key: string]: number[] } = {};
    
    recipe.instructions.forEach((instruction, stepIndex) => {
      // Skip prep steps
      if (instruction.toLowerCase().includes('preheat') || 
          instruction.toLowerCase().includes('gather')) {
        return;
      }

      // Find ingredients used in this step
      const usedIngredients = recipe.ingredients.filter(ingredient => {
        const baseIngredient = getBaseIngredient(ingredient).toLowerCase();
        return instruction.toLowerCase().includes(baseIngredient);
      });

      // If multiple ingredients are used together, they share the same step
      if (usedIngredients.length > 1) {
        usedIngredients.forEach(ingredient => {
          if (!groups[ingredient]) {
            groups[ingredient] = [];
          }
          groups[ingredient].push(stepIndex);
        });
      }
    });

    return groups;
  };

  const stepGroups = findStepGroups();

  return (
    <div className="recipe-table-container">
      <table className="recipe-table">
        <thead>
          <tr>
            {hasGroups && <th className="group-column">Group</th>}
            <th className="ingredient-column">Ingredients</th>
            {recipe.instructions.map((_, index) => (
              <th key={index} className="step-column">
                Step {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedIngredients.map((group, groupIndex) => (
            group.ingredients.map((ingredient, ingredientIndex) => (
              <tr key={`${groupIndex}-${ingredientIndex}`}>
                {/* Only show group name for first ingredient in group, and only if we have groups */}
                {hasGroups && ingredientIndex === 0 && (
                  <td 
                    className="group-cell" 
                    rowSpan={group.ingredients.length}
                  >
                    {group.purpose}
                  </td>
                )}
                <td className="ingredient-cell">{ingredient}</td>
                {recipe.instructions.map((instruction, stepIndex) => {
                  const isUsedInStep = instruction.toLowerCase().includes(
                    getBaseIngredient(ingredient).toLowerCase()
                  );
                  const isPartOfGroup = stepGroups[ingredient]?.includes(stepIndex);
                  
                  return (
                    <td 
                      key={stepIndex} 
                      className={`step-cell ${isUsedInStep ? 'used' : ''} ${isPartOfGroup ? 'grouped' : ''}`}
                    >
                      {isUsedInStep ? '•' : ''}
                    </td>
                  );
                })}
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecipeTable;
