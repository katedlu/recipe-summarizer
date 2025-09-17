import os
import json
from typing import Dict, Any, List
from openai import AzureOpenAI
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
            # Replace common problematic Unicode characters with ASCII equivalents
            replacements = {
                '\u2153': '1/3',      # ⅓
                '\u2154': '2/3',      # ⅔
                '\u2155': '1/5',      # ⅕
                '\u2156': '2/5',      # ⅖
                '\u2157': '3/5',      # ⅗
                '\u2158': '4/5',      # ⅘
                '\u2159': '1/6',      # ⅙
                '\u215a': '5/6',      # ⅚
                '\u215b': '1/8',      # ⅛
                '\u215c': '3/8',      # ⅜
                '\u215d': '5/8',      # ⅝
                '\u215e': '7/8',      # ⅞
                '\u00bd': '1/2',      # ½
                '\u00bc': '1/4',      # ¼
                '\u00be': '3/4',      # ¾
                '\u2013': '-',        # en dash
                '\u2014': '-',        # em dash
                '\u2018': "'",        # left single quotation mark
                '\u2019': "'",        # right single quotation mark
                '\u201c': '"',        # left double quotation mark
                '\u201d': '"',        # right double quotation mark
                '\u00b0': ' degrees', # degree symbol
            }
            
            result = data
            for unicode_char, replacement in replacements.items():
                result = result.replace(unicode_char, replacement)
            
            # Remove any remaining non-ASCII characters that might cause issues
            result = result.encode('ascii', 'ignore').decode('ascii')
            return result
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
            
            self.client = AzureOpenAI(
                api_key=api_key,
                azure_endpoint=endpoint,
                api_version="2024-06-01"
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
            # Sanitize Unicode characters first
            sanitized_json = self._sanitize_unicode_data(raw_json)
            
            # Create a prompt for the LLM
            prompt = self._create_table_parsing_prompt(sanitized_json)
            
            # Call Azure OpenAI API
            response = self.client.chat.completions.create(
                model=os.getenv('AZURE_OPENAI_DEPLOYMENT'),  # Azure deployment name
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that converts recipe data into structured table format. Always respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2000,
                temperature=1.0,
            )
            
            # Parse the response
            content = response.choices[0].message.content
            logging.info(f"Raw LLM response: {response}")
            logging.info(f"LLM response content: '{content}'")
            
            if not content:
                return {
                    'success': False,
                    'table_data': None,
                    'error': "LLM returned empty response"
                }
            
            content = content.strip()
            
            # Remove any markdown code blocks if present
            if content.startswith('```json'):
                content = content[7:-3]
            elif content.startswith('```'):
                content = content[3:-3]
            
            # Parse JSON response
            table_data = json.loads(content)
            
            return {
                'success': True,
                'table_data': table_data,
                'error': None
            }
            
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'table_data': None,
                'error': f"Failed to parse LLM response as JSON: {str(e)}. Response was: {content[:200]}..."
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
        
        prompt = f"""
Please analyze the following recipe JSON data and convert it into a cooking workflow table format.

Recipe JSON:
{json_str}

Create a JSON response with this structure:
{{
  "title": "Recipe Cooking Workflow",
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
```
Note: Dry and wet ingredients are in SAME column since they can be mixed simultaneously.

9. **Quality Checks**:
   - Ensure the workflow is logical and follows the recipe sequence
   - Verify that ALL preparation work is moved to PREP TASKS row
   - Check that parallel actions are optimized (dry + wet ingredients in same column when possible)
   - **Eliminate white space**: Remove ingredient rows that have no actions in any column
   - Confirm that the table shows efficient multi-person cooking workflow 
   - Make sure ingredients that can be processed simultaneously are grouped in same columns
   - Verify that single-ingredient actions use simple string format
   - Ensure the table minimizes columns while maximizing parallel efficiency
   - Confirm the table would be practical for multiple people cooking together

Return only valid JSON, no other text.
"""
        return prompt

# Create a global instance
llm_service = LLMService()