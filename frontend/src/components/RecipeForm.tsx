import React from 'react';
import '../styles/RecipeForm.css';

type RecipeFormProps = {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
};

const RecipeForm: React.FC<RecipeFormProps> = (props) => {
  return (
    <form onSubmit={props.onSubmit} className="recipe-form">
      <div className="recipe-form__group">
        <label htmlFor="url" className="recipe-form__label">Recipe URL:</label>
        <input
          type="url"
          id="url"
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          placeholder="https://example.com/recipe"
          required
          className="recipe-form__input"
        />
      </div>
      <button 
        type="submit" 
        disabled={props.loading}
        className="recipe-form__submit-button"
      >
        {props.loading ? 'Parsing...' : 'Parse Recipe'}
      </button>
    </form>
  );
};

export default RecipeForm;
