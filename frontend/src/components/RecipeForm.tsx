import React from 'react';
import '../styles/RecipeForm.css';

type RecipeFormProps = {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
};

const RecipeForm: React.FC<RecipeFormProps> = (props) => (
  <form onSubmit={props.onSubmit} className="recipe-form" role="search" aria-label="Recipe URL parser">
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
        aria-describedby="url-help"
        aria-invalid={props.url && !/^https?:\/\/.+/.test(props.url) ? 'true' : 'false'}
      />
      <div id="url-help" className="recipe-form__help">
        Enter a complete URL from a recipe website to parse and organize the recipe instructions.
      </div>
    </div>
    <button 
      type="submit" 
      disabled={props.loading}
      className="button button--primary"
      aria-describedby={props.loading ? "loading-status" : undefined}
    >
      {props.loading ? 'Parsing...' : 'Parse Recipe'}
    </button>
    {props.loading && (
      <div id="loading-status" className="sr-only" aria-live="polite">
        Parsing recipe, please wait...
      </div>
    )}
  </form>
);

export default RecipeForm;
