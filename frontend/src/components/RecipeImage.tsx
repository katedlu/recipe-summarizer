import React from 'react';
import '../styles/RecipeImage.css';

type RecipeImageProps = {
  imageSrc: string;
  title: string;
};

const RecipeImage: React.FC<RecipeImageProps> = (props) => (
  <div className="recipe-image">
    <img 
      src={props.imageSrc} 
      alt={props.title}
      className="recipe-image__img"
    />
  </div>
);

export default RecipeImage;
