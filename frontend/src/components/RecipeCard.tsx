import React from 'react';
import RecipeInfo from './RecipeInfo';
import Equipment from './Equipment';
import Instructions from './Instructions';
import RecipeImage from './RecipeImage';
import RecipeTable from './RecipeTable';
import type { Recipe } from '../types/recipe.types';
import '../styles/RecipeCard.css';

type RecipeCardProps = {
  recipe: Recipe;
};

const RecipeCard: React.FC<RecipeCardProps> = (props) => (
  <article className="recipe-card" aria-labelledby="recipe-title">
    {props.recipe.image && (
      <RecipeImage 
        imageSrc={props.recipe.image}
        title={props.recipe.title}
      />
    )}
    <h2 id="recipe-title" className="recipe-card__title">{props.recipe.title}</h2>
    {props.recipe.host && (
      <p className="recipe-card__source">
        <span className="sr-only">Recipe source: </span>
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
      <RecipeTable recipe={props.recipe} />
      
      <Instructions instructions={props.recipe.instructions} />
    </div>
  </article>
);

export default RecipeCard;
