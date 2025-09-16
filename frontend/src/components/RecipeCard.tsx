import React from 'react';
import RecipeInfo from './RecipeInfo';
import Equipment from './Equipment';
import Ingredients from './Ingredients';
import Instructions from './Instructions';
import type { Recipe } from '../types/recipe.types';
import '../styles/RecipeCard.css';

type RecipeCardProps = {
  recipe: Recipe;
};

const RecipeCard: React.FC<RecipeCardProps> = (props) => {
  return (
    <div className="recipe-card">
      {props.recipe.image && (
        <div className="recipe-card__image-container">
          <img 
            src={props.recipe.image} 
            alt={props.recipe.title}
            className="recipe-card__image"
          />
        </div>
      )}
      
      <h2 className="recipe-card__title">{props.recipe.title}</h2>
      
      {props.recipe.host && (
        <p className="recipe-card__source">
          Source: {props.recipe.host}
        </p>
      )}
      
      <RecipeInfo 
        prepTime={props.recipe.prep_time}
        cookTime={props.recipe.cook_time}
        totalTime={props.recipe.total_time}
        yields={props.recipe.yields}
      />

      <Equipment equipment={props.recipe.equipment || []} />
      
      <div className="recipe-card__content">
        <Ingredients 
          ingredients={props.recipe.ingredients}
          ingredientGroups={props.recipe.ingredient_groups}
        />
        
        <Instructions instructions={props.recipe.instructions} />
      </div>
    </div>
  );
};

export default RecipeCard;
