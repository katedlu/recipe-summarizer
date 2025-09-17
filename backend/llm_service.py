import os
import json
from typing import Dict, Any, List
from openai import AzureOpenAI
import logging

class LLMService:
    def __init__(self):
        # Initialize Azure Key Vault client and OpenAI client
        self.client = None
        self._initialize_openai_client()
    
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
                api_version="2024-02-15-preview"
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
            # Create a prompt for the LLM
            prompt = self._create_table_parsing_prompt(raw_json)
            
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
                max_completion_tokens=2000  # Updated parameter name for newer models
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
            logging.error(f"LLM service error: {str(e)}")
            return {
                'success': False,
                'table_data': None,
                'error': f"Failed to parse recipe with LLM: {str(e)}"
            }
    
    def _create_table_parsing_prompt(self, raw_json: Dict[str, Any]) -> str:
        """
        Create a prompt for the LLM to parse recipe data into table format
        """
        json_str = json.dumps(raw_json, indent=2)
        
        prompt = f"""
Please analyze the following recipe JSON data and convert it into a cooking workflow table format.

Recipe JSON:
{json_str}

Please return a JSON response with the following structure:
{{
  "title": "Recipe Cooking Workflow",
  "table": {{
    "headers": ["Ingredient/Prep", "Step 1", "Step 2", "Step 3", "..."],
    "rows": [
      {{
        "ingredient": "PREP TASKS",
        "cells": ["Preheat oven to 350°F", "Grease baking pan", "", "..."]
      }},
      {{
        "ingredient": "2 cups flour",
        "cells": ["", "Sift into bowl", "Mix with dry ingredients", "..."]
      }},
      {{
        "ingredient": "1 cup sugar",
        "cells": ["", "Measure out", "Cream with butter", "..."]
      }}
    ]
  }}
}}

Instructions for creating this table:
1. **First Row (PREP TASKS)**: Include any preparation steps that should be done before cooking starts:
   - Preheating oven/grill
   - Greasing pans
   - Preparing workspace
   - Marinating (if overnight)
   - Any "before you start" activities

2. **Headers**: Create column headers for each major cooking step:
   - Start with "Ingredient/Prep" for the first column
   - Then "Step 1", "Step 2", etc. based on the instruction sequence
   - Use descriptive names like "Prep", "Mix", "Bake", "Serve" when possible

3. **Ingredient Rows**: Create one row for each ingredient:
   - First cell: The ingredient with quantity (e.g., "2 cups flour")
   - Subsequent cells: What happens to this ingredient in each step
   - Use empty string "" if ingredient is not used in that step

4. **Workflow Logic**:
   - Analyze the instructions to understand the cooking sequence
   - Map each ingredient to the steps where it's used
   - Show the progression of how ingredients are combined and transformed
   - Keep descriptions concise (2-4 words when possible)

5. **Examples of good cell content**:
   - "Add to bowl"
   - "Mix in"
   - "Bake with"
   - "Garnish"
   - "Set aside"
   - ""  (when not used in that step)

Guidelines:
- Extract ingredients and instructions from the JSON
- Create 4-8 cooking steps based on the recipe complexity
- Make the table easy to follow as a cooking guide
- If no prep tasks exist, still include the PREP TASKS row but fill with ""
- Focus on actionable steps that help someone cook the recipe

Return only valid JSON, no other text.
"""
        return prompt

# Create a global instance
llm_service = LLMService()