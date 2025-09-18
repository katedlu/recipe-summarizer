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
            # Log the input data for debugging
            logging.info(f"Input recipe data keys: {list(raw_json.keys())}")
            logging.info(f"Recipe title: {raw_json.get('title', 'No title')}")
            logging.info(f"Number of ingredients: {len(raw_json.get('ingredients', []))}")
            logging.info(f"Number of instructions: {len(raw_json.get('instructions', []))}")
            
            # Validate input data
            if not raw_json.get('ingredients'):
                return {
                    'success': False,
                    'table_data': None,
                    'error': "Recipe has no ingredients"
                }
            
            if not raw_json.get('instructions'):
                return {
                    'success': False,
                    'table_data': None,
                    'error': "Recipe has no instructions"
                }
            
            # Sanitize Unicode characters first
            sanitized_json = self._sanitize_unicode_data(raw_json)
            
            # Create a prompt for the LLM
            prompt = self._create_table_parsing_prompt(sanitized_json)
            logging.info(f"Prompt length: {len(prompt)} characters")
            
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
                max_completion_tokens=8000,
                temperature=1.0,  # Use default temperature (only supported value for this model)
            )

            # Parse the response
            content = response.choices[0].message.content
            logging.info(f"Raw LLM response: {response}")
            logging.info(f"LLM response content: '{content}'")
            logging.info(f"Response finish reason: {response.choices[0].finish_reason}")
            
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
        
        prompt = f"""
Create Excel cooking workflow table from recipe JSON.

Rules:
1. The first two rows are preparation steps (e.g., "Grease a loaf pan", "Preheat oven to 350°F"), merged horizontally across all columns.
2. Column 1: List every ingredient individually.
3. Columns 2+: Represent sequential cooking actions.
4. Shared actions (like combining dry ingredients) should be merged vertically across all relevant ingredient rows, with the text centered vertically.
5. Dependent steps (Fold → Bake → Cool → Serve) should be merged vertically across all ingredient rows, centered.
6. Do not include header rows for ingredients or steps.
7. Output format: Markdown table suitable for Excel.
8. Ensure proper cooking order — e.g., baking happens only after all ingredients are combined.

Sample Input:
{{
  "title": "Banana Banana Bread",
  "prep_time": 15,
  "cook_time": 60,
  "ingredients": [
    "2 cups all-purpose flour",
    "1 teaspoon baking soda",
    "0.25 teaspoon salt",
    "0.75 cup brown sugar",
    "0.5 cup butter",
    "2 eggs, beaten",
    "2.33 cups mashed overripe bananas"
  ],
  "instructions": [
    "Gather all ingredients. Preheat the oven to 350 degrees F (175 degrees C). Lightly grease a 9x5-inch loaf pan.",
    "Combine flour, baking soda, and salt in a large bowl. Beat brown sugar and butter with an electric mixer in a separate large bowl until smooth. Stir in eggs and mashed bananas until well blended. Stir banana mixture into flour mixture until just combined.",
    "Pour batter into the prepared loaf pan.",
    "Bake in the preheated oven until a toothpick inserted into the center comes out clean, about 60 minutes.",
    "Let bread cool in pan for 10 minutes, then turn out onto a wire rack to cool completely.",
    "Enjoy!"
  ]
}}

Expected Output Example (conceptual, first two rows are prep):
| Grease a loaf pan | | | | | | |
| Preheat oven to 350°F | | | | | | |
| 2 cups all-purpose flour | | Combine | | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 1 teaspoon baking soda | | Combine | | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 0.25 teaspoon salt | | Combine | | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 0.75 cup brown sugar | Beat | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 0.5 cup butter | Beat | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 2 eggs | | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |
| 2.33 cups mashed overripe banana | | | Stir in | Stir in | Bake 350°F for 60 min | Cool 10 min in pan |

Now parse this recipe JSON:
{json_str}

Return ONLY the markdown table, no other text or explanation.
"""
        return prompt

# Create a global instance
llm_service = LLMService()