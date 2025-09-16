import React from 'react';
import type { IngredientGroup } from '../types/recipe.types';
import '../styles/Ingredients.css';

type IngredientsProps = {
  ingredients: string[];
  ingredientGroups?: IngredientGroup[];
};

const Ingredients: React.FC<IngredientsProps> = (props) => {
  // If we have ingredient groups, use those; otherwise fall back to regular ingredients
  if (props.ingredientGroups && props.ingredientGroups.length > 0) {
    return (
      <div className="ingredients-section">
        <h3 className="ingredients__title">Ingredients:</h3>
        {props.ingredientGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="ingredients__group">
            {group.purpose && (
              <h4 className="ingredients__group-purpose">
                {group.purpose}
              </h4>
            )}
            <ul className="ingredients__list">
              {group.ingredients.map((ingredient, index) => (
                <li key={index} className="ingredients__item">{ingredient}</li>
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
        <h3 className="ingredients__title">Ingredients:</h3>
        <ul className="ingredients__list">
          {props.ingredients.map((ingredient, index) => (
            <li key={index} className="ingredients__item">{ingredient}</li>
          ))}
        </ul>
      </div>
    );
  }
};

export default Ingredients;
