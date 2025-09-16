import React from 'react';
import '../styles/RecipeInfo.css';

type RecipeInfoProps = {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  yields?: string;
};

const RecipeInfo: React.FC<RecipeInfoProps> = (props) => {
  if (!props.prepTime && !props.cookTime && !props.totalTime && !props.yields) {
    return null;
  }

  return (
    <div className="recipe-info">
      {props.prepTime && (
        <div className="recipe-info__badge recipe-info__badge--prep-time">
          <strong>Prep Time:</strong> {props.prepTime} minutes
        </div>
      )}
      {props.cookTime && (
        <div className="recipe-info__badge recipe-info__badge--cook-time">
          <strong>Cook Time:</strong> {props.cookTime} minutes
        </div>
      )}
      {props.totalTime && (
        <div className="recipe-info__badge recipe-info__badge--total-time">
          <strong>Total Time:</strong> {props.totalTime} minutes
        </div>
      )}
      {props.yields && (
        <div className="recipe-info__badge recipe-info__badge--serves">
          <strong>Serves:</strong> {props.yields}
        </div>
      )}
    </div>
  );
};

export default RecipeInfo;
