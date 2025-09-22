export type IngredientGroup = {
  purpose: string;
  ingredients: string[];
};

export type TableCell = string | {
  text: string;
  rowspan?: number;
  spanned?: boolean;
};

export type TableRow = {
  ingredient: string;
  cells: TableCell[];
};

export type WorkflowTable = {
  headers: string[];
  rows: TableRow[];
};

export type TableData = {
  title: string;
  table?: WorkflowTable;
  format?: string;
  markdown_table?: string;
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
  url?: string;
  raw_json?: any;
  table_data?: TableData;
  warning?: string;
};
