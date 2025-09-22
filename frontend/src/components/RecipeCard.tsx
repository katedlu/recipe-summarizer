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
  children?: React.ReactNode;
};

const RecipeCard: React.FC<RecipeCardProps> = (props) => (
  <article className="recipe-card" aria-labelledby="recipe-title">
    {props.recipe.image && (
      <RecipeImage 
        imageSrc={props.recipe.image}
        title={props.recipe.title}
      />
    )}
    <div className="recipe-card__header">
      <h2 id="recipe-title" className="recipe-card__title">{props.recipe.title}</h2>
      {props.children}
    </div>
    {props.recipe.host && (
      <p className="recipe-card__source">
        <span className="sr-only">Recipe source: </span>
        Source: {props.recipe.url ? (
          <a 
            href={props.recipe.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="recipe-card__source-link"
            aria-label={`View original recipe on ${props.recipe.host}`}
          >
            {props.recipe.host}
          </a>
        ) : (
          props.recipe.host
        )}
      </p>
    )}
    <RecipeInfo 
      prepTime={props.recipe.prep_time}
      cookTime={props.recipe.cook_time}
      totalTime={props.recipe.total_time}
      yields={props.recipe.yields}
    />
    {props.recipe.warning && (
      <div className="recipe-card__warning" role="alert" aria-live="polite">
        <span className="recipe-card__warning-icon" aria-hidden="true">⚠️</span>
        <span className="recipe-card__warning-text">{props.recipe.warning}</span>
      </div>
    )}
    <Equipment equipment={props.recipe.equipment || []} />
    <div className="recipe-card__content">
      <RecipeTable recipe={props.recipe} />
      
      <Instructions instructions={props.recipe.instructions} />
    </div>
  </article>
);

export default RecipeCard;
