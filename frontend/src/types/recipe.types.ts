export type IngredientGroup = {
  purpose: string;
  ingredients: string[];
};

export type Recipe = {
  title: string;
  ingredients: string[];
  ingredient_groups?: IngredientGroup[];
  instructions: string[];
  equipment?: string[];
  total_time?: number;
  prep_time?: number;
  cook_time?: number;
  yields?: string;
  image?: string;
  host?: string;
  raw_json?: any;
};
