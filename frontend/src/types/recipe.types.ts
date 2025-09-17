export type IngredientGroup = {
  purpose: string;
  ingredients: string[];
};

export type TableRow = {
  ingredient: string;
  cells: string[];
};

export type WorkflowTable = {
  headers: string[];
  rows: TableRow[];
};

export type TableData = {
  title: string;
  table: WorkflowTable;
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
  table_data?: TableData;
};
