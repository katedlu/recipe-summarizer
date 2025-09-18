import os
import json
from typing import Dict, Any, List
from openai import OpenAI
import logging
import re

class LLMService:
    def __init__(self):
        # Initialize Azure Key Vault client and OpenAI client
        self.client = None
        self._initialize_openai_client()
    
    def _sanitize_unicode_data(self, data: Any) -> Any:
        """
        Recursively sanitize Unicode characters in data structures
        """
        if isinstance(data, dict):
            return {key: self._sanitize_unicode_data(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._sanitize_unicode_data(item) for item in data]
        elif isinstance(data, str):
            # Fast Unicode replacement using str.translate() - much faster than multiple replace() calls
            translation_table = str.maketrans({
                '\u2153': '1/3', '\u2154': '2/3', '\u2155': '1/5', '\u2156': '2/5', '\u2157': '3/5',
                '\u2158': '4/5', '\u2159': '1/6', '\u215a': '5/6', '\u215b': '1/8', '\u215c': '3/8',
                '\u215d': '5/8', '\u215e': '7/8', '\u00bd': '1/2', '\u00bc': '1/4', '\u00be': '3/4',
                '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
                '\u00b0': ' degrees'
            })
            
            result = data.translate(translation_table)
            
            # Quick ASCII check - only encode/decode if needed
            try:
                result.encode('ascii')
                return result
            except UnicodeEncodeError:
                return result.encode('ascii', 'ignore').decode('ascii')
        else:
            return data
    
    def _initialize_openai_client(self):
        """
        Initialize Azure OpenAI client with API key and endpoint from environment variables
        """
        try:
            # Get API key and endpoint from environment variables
            api_key = os.getenv('AZURE_OPENAI_API_KEY')
            endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
            
            if not api_key:
                raise Exception("AZURE_OPENAI_API_KEY environment variable is required")
            
            if not endpoint:
                raise Exception("AZURE_OPENAI_ENDPOINT environment variable is required")
            
            # Convert Azure endpoint to OpenAI client format
            base_url = f"{endpoint.rstrip('/')}/openai/v1/"
            
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            logging.info("Azure OpenAI client initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize Azure OpenAI client: {str(e)}")
            raise e
    
    def parse_recipe_to_table(self, raw_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use LLM to parse recipe JSON into a structured table format
        """
        try:
            # Quick validation
            if not raw_json.get('ingredients') or not raw_json.get('instructions'):
                return {
                    'success': False,
                    'table_data': None,
                    'error': "Recipe missing ingredients or instructions"
                }
            
            # Sanitize Unicode characters first
            sanitized_json = self._sanitize_unicode_data(raw_json)
            
            # Create a prompt for the LLM
            prompt = self._create_table_parsing_prompt(sanitized_json)
            
            # Call Azure OpenAI API
            response = self.client.chat.completions.create(
                model=os.getenv('AZURE_OPENAI_DEPLOYMENT'),  # Azure deployment name (gpt-5-mini)
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that converts recipe data into Excel-ready cooking tables. Always respond with only a markdown table, no other text or explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
               
            )

            # Parse the response
            content = response.choices[0].message.content
            
            if not content:
                # Check if there was a finish reason that explains the empty response
                finish_reason = response.choices[0].finish_reason
                error_msg = f"LLM returned empty response. Finish reason: {finish_reason}"
                
                if finish_reason == 'length':
                    error_msg += ". The response may have been cut off due to token limits."
                elif finish_reason == 'content_filter':
                    error_msg += ". The response was filtered due to content policy."
                elif finish_reason == 'stop':
                    error_msg += ". The model stopped generating but returned no content."
                
                return {
                    'success': False,
                    'table_data': None,
                    'error': error_msg
                }
            
            content = content.strip()
            
            # Remove any markdown code blocks if present
            if content.startswith('```'):
                # Find the end of the code block
                end_marker = content.rfind('```')
                if end_marker > 3:
                    content = content[3:end_marker].strip()
                else:
                    content = content[3:].strip()
            
            # The response is now a markdown table, not JSON
            # Return it as-is for the frontend to display
            table_data = {
                'markdown_table': content,
                'format': 'markdown'
            }
            
            return {
                'success': True,
                'table_data': table_data,
                'error': None
            }
        except Exception as e:
            error_message = str(e)
            
            # Handle Unicode encoding errors specifically
            if 'charmap' in error_message and 'encode' in error_message:
                logging.error(f"Unicode encoding error in LLM service: {error_message}")
                error_message = "Unicode character encoding error. The recipe contains special characters that need to be processed differently."
            else:
                logging.error(f"LLM service error: {error_message}")
            
            # Provide more specific error information
            if "Connection error" in error_message or "connection" in error_message.lower():
                error_message = f"Connection error to Azure OpenAI. Check your endpoint URL and network connectivity. Original error: {error_message}"
            elif "403" in error_message or "forbidden" in error_message.lower():
                error_message = f"Access forbidden. Check your API key and endpoint permissions. Original error: {error_message}"
            elif "401" in error_message or "unauthorized" in error_message.lower():
                error_message = f"Unauthorized access. Check your API key. Original error: {error_message}"
            elif "404" in error_message:
                error_message = f"Resource not found. Check your endpoint URL and deployment name. Original error: {error_message}"
            
            return {
                'success': False,
                'table_data': None,
                'error': f"Failed to parse recipe with LLM: {error_message}"
            }
    
    def _create_table_parsing_prompt(self, raw_json: Dict[str, Any]) -> str:
        """
        Create a prompt for the LLM to parse recipe data into table format
        """
        # Ensure Unicode characters are properly handled - data should already be sanitized
        json_str = json.dumps(raw_json, indent=2, ensure_ascii=True)
        
        # Extract recipe title and host for the table title
        recipe_title = raw_json.get('title', 'Recipe')
        recipe_host = raw_json.get('host', '')
        
        # Format the table title as "Recipe Title, Source"
        if recipe_host:
            table_title = f"{recipe_title}, {recipe_host}"
        else:
            table_title = recipe_title
        
        prompt = f"""
Create Excel cooking workflow table from recipe JSON.

Rules:
1. The first two rows are preparation steps (e.g., "Grease a loaf pan", "Preheat oven to 350°F"), merged horizontally across all columns.
2. Column 1: List every ingredient individually.
3. Columns 2+: Represent sequential cooking actions.
4. IMPORTANT: When multiple ingredients have the EXACT SAME action (e.g., "Add to sauce", "Combine", "Beat together"), merge these vertically by using identical text in the same column for all affected ingredients. This creates Excel-style vertical cell merging.
5. Examples of actions that should merge vertically:
   - Multiple ingredients "Add to sauce"
   - Multiple dry ingredients "Combine"  
   - Multiple wet ingredients "Beat together"
   - All ingredients "Bake 350°F for 60 min"
   - All ingredients "Cool 10 min in pan"
6. Sequential dependent steps should also be merged vertically across all ingredients when they apply to the whole dish.
7. Do not include header rows for ingredients or steps.
8. Output format: Markdown table suitable for Excel.
9. Ensure proper cooking order — e.g., baking happens only after all ingredients are combined.

Sample Input:
{{
  "title": "{table_title}",
  "table": {{
    "headers": [array of column headers],
    "rows": [
      {{
        "ingredient": "ingredient name with quantity or PREP TASKS",
        "cells": [
          {{"text": "action", "rowspan": 3}} or
          {{"text": "", "spanned": true}} or  
          {{"text": "action"}}
        ]
      }}
    ]
  }}
}}

Cell format rules:
- For merged cells (first in group): {{"text": "instruction", "rowspan": number_of_rows}}
- For spanned continuation cells: {{"text": "", "spanned": true}}
- For regular cells (including PREP TASKS): just "instruction" as string
- Only use rowspan when 2+ consecutive ingredients have identical actions

Instructions for creating this table:

1. **Analyze the Recipe Structure**:
   - Extract all ingredients with their quantities
   - Parse the instruction steps to understand the cooking workflow
   - Identify logical groupings of actions that happen together

2. **Create Dynamic Headers**:
   - First column: "Ingredient/Prep"
   - Subsequent columns: Create meaningful step names based on the actual recipe instructions
   - **Optimize for parallel workflow**: Combine steps that can be done simultaneously by multiple people
   - Use descriptive names that reflect the cooking process (e.g., "Prep", "Mix Ingredients", "Combine", "Bake", "Cool", "Serve")  
   - **Minimize columns**: Prefer fewer, more comprehensive columns over many narrow ones
   - Number of columns should be efficient for the recipe complexity

3. **PREP TASKS Row** (always first):
   - Include ALL preparation tasks that should be done before cooking starts
   - Examples: oven preheating, pan preparation, workspace setup, mashing bananas, beating eggs, melting butter
   - Identify ingredient prep work that can be done in advance (mash, beat, melt, chop, etc.)
   - Group these prep actions in the PREP TASKS row rather than scattering them throughout ingredient rows
   - Use empty strings for steps where no prep is needed

4. **Ingredient Rows**:
   - One row per ingredient with quantity
   - Map each ingredient to the steps where it's actively used
   - Use concise, actionable descriptions
   - **CRITICAL**: Only show ingredients that have actions in at least one step
   - **Remove ingredients that have no actions** - don't create rows full of empty strings
   - Use empty string "" only when ingredient is not involved in that specific step but has actions in other steps

5. **Smart Instruction Merging with Row Spanning**:
   - **CRITICAL**: Identify ingredients that can be processed in parallel by multiple people and merge them in the SAME column
   - **Parallel Optimization**: When dry and wet ingredients can be prepared simultaneously, put them in the same step column
   - Examples of parallel actions to merge in same column:
     * Dry ingredients (flour, baking soda, salt, sugar) AND wet ingredients (eggs, oil, milk) → both in "Mix Ingredients" column
     * Multiple preparation tasks that can happen simultaneously → group in same column
   - **Multi-person workflow**: Design columns assuming multiple people can work in parallel
   - **Rowspan grouping**: Within the same column, group similar ingredient types:
     * Dry ingredients: {{"text": "Mix dry ingredients", "rowspan": X}}
     * Wet ingredients: {{"text": "Mix wet ingredients", "rowspan": Y}}
   - **ONLY use rowspan when 2+ ingredients have identical/parallel actions**  
   - **DO NOT use rowspan for single ingredients or PREP TASKS**
   - Regular cells (non-merged): use {{"text": "action"}} or just "action"

6. **Action Description Guidelines**:
   - Keep descriptions brief (2-5 words)
   - Focus on the action being performed
   - Use consistent terminology
   - Avoid redundant phrasing between related ingredients

7. **Workflow Analysis Algorithm**:
   - **Step 1**: Analyze the recipe instructions to identify preparation tasks (mash, beat, melt, preheat, etc.)
   - **Step 2**: Move all preparation actions to the PREP TASKS row
   - **Step 3**: Create one row per ingredient with their remaining actions for each step  
   - **Step 4**: For each column (step), identify ingredients that are processed together in parallel:
     * Dry ingredients mixed together
     * Wet ingredients combined together  
     * Multiple ingredients added/folded at same time
   - **Step 5**: For parallel action groups:
     * First ingredient: {{"text": "descriptive action", "rowspan": count}}
     * Subsequent ingredients: {{"text": "", "spanned": true}}
   - **Step 6**: For all other cells: use simple format "instruction" or {{"text": "instruction"}}
   - **Step 7**: This creates a logical workflow showing parallel operations and proper preparation sequencing

8. **Example Output Structure**:
```json
{{
  "rows": [
    {{
      "ingredient": "PREP TASKS",
      "cells": ["Preheat oven to 350°F, Beat eggs, Mash bananas", "", ""]
    }},
    {{
      "ingredient": "2 cups flour", 
      "cells": ["", {{"text": "Mix dry ingredients", "rowspan": 3}}, ""]
    }},
    {{
      "ingredient": "1 cup sugar",
      "cells": ["", {{"text": "", "spanned": true}}, ""]
    }},
    {{
      "ingredient": "1 tsp salt",
      "cells": ["", {{"text": "", "spanned": true}}, ""]
    }},
    {{
      "ingredient": "2 eggs (beaten)",
      "cells": ["", {{"text": "Mix wet ingredients", "rowspan": 2}}, ""]
    }},
    {{
      "ingredient": "Mashed bananas",
      "cells": ["", {{"text": "", "spanned": true}}, ""]
    }},
    {{
      "ingredient": "Batter",
      "cells": ["", "", "Pour into pan"]
    }}
  ]
}}

Expected Output Example (notice identical actions use EXACT SAME TEXT for vertical merging):
| Grease a loaf pan | | | | | | |
| Preheat oven to 350°F | | | | | | |
| 2 cups all-purpose flour | | Combine | | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 1 teaspoon baking soda | | Combine | | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 0.25 teaspoon salt | | Combine | | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 0.75 cup brown sugar | Beat together | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 0.5 cup butter | Beat together | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 2 eggs | | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 2.33 cups mashed overripe banana | | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |

Sauce Example (your case - notice identical "Add to sauce" text):
| Heat olive oil | | | |
| Sauté onions until soft | | | |
| 1 cup tomato passata | | Add to sauce | Simmer 20 min |
| 1 cup heavy cream | | Add to sauce | Simmer 20 min |
| 1 tbsp sugar | | Add to sauce | Simmer 20 min |
| 1 1/4 tsp salt | | Add to sauce | Simmer 20 min |

Now parse this recipe JSON:
{json_str}

Return ONLY the markdown table, no other text or explanation.
"""
        return prompt

# Create a global instance
llm_service = LLMService()