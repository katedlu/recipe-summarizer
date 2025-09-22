
import datetime
import uuid
import os
from dotenv import load_dotenv

# Load environment variables from .env file FIRST
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from recipe_scrapers import scrape_me, WebsiteNotImplementedError, RecipeSchemaNotFound, NoSchemaFoundInWildMode, FieldNotProvidedByWebsiteException
from recipe_scrapers._exceptions import SchemaOrgException, ElementNotFoundInHtml, OpenGraphException
from urllib.parse import urlparse
from llm_service import llm_service

# Create a deployment ID and timestamp when the app starts
DEPLOYMENT_ID = str(uuid.uuid4())[:8]  # Short UUID for readability
DEPLOYMENT_TIME = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
VERSION = "1.0.0"  # You can update this manually when making major changes

def has_meaningful_ingredient_groups(ingredient_groups):
    """
    Check if ingredient groups are meaningful enough to warrant a group column
    """
    # No groups at all
    if not ingredient_groups:
        return False
        
    # Less than 2 groups (single group not meaningful for column)
    if len(ingredient_groups) < 2:
        return False
        
    # Check if groups have meaningful purposes and ingredients
    meaningful_groups = 0
    for group in ingredient_groups:
        # Get purpose - handle both dict and object attributes
        purpose = ''
        if hasattr(group, 'purpose'):
            purpose = group.purpose or ''
        elif isinstance(group, dict):
            purpose = group.get('purpose', '') or ''
        
        # Get ingredients - handle both dict and object attributes
        ingredients = []
        if hasattr(group, 'ingredients'):
            ingredients = group.ingredients or []
        elif isinstance(group, dict):
            ingredients = group.get('ingredients', []) or []
        
        # Skip groups without purpose or with empty/generic purposes
        purpose = purpose.strip()
        if not purpose or purpose.lower() in ['', 'ingredients', 'main', 'recipe']:
            continue
            
        # Skip if no ingredients in the group
        if not ingredients or len(ingredients) == 0:
            continue
            
        meaningful_groups += 1
    
    # Need at least 2 meaningful groups to justify a group column
    return meaningful_groups >= 2

def detect_paywall(url):
    """
    Detect if a URL is behind a paywall by checking the HTML content
    """
    try:
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        if response.status_code != 200:
            return False, f"HTTP {response.status_code}"
            
        content = response.text.lower()
        
        # Common paywall indicators
        paywall_indicators = [
            'paywall', 'subscribe to continue', 'subscription required', 
            'premium content', 'member exclusive', 'sign up to read',
            'login to continue', 'create a free account', 'become a member',
            'subscribe now', 'limited free articles', 'subscriber exclusive'
        ]
        
        # NYTimes specific indicators
        nytimes_indicators = [
            'cooking.nytimes.com/recipes' in url.lower() and any(indicator in content for indicator in [
                'subscribe', 'subscription', 'create your free account', 'sign up'
            ])
        ]
        
        # Check for indicators
        found_indicators = []
        for indicator in paywall_indicators:
            if indicator in content:
                found_indicators.append(indicator)
                
        if found_indicators or any(nytimes_indicators):
            return True, found_indicators[:3]  # Return first 3 indicators
            
        return False, None
        
    except requests.RequestException as e:
        return False, f"Request error: {str(e)}"

app = Flask(__name__)
CORS(app)

def parse_recipe(url):
    """Parse recipe from a given URL using recipe-scrapers"""
    try:
        # Use recipe-scrapers to scrape the recipe
        scraper = scrape_me(url)
        
        # Try to get equipment - this method may not be available for all scrapers
        equipment = []
        try:
            equipment = scraper.equipment() or []
        except (AttributeError, NotImplementedError):
            # Equipment method might not be implemented for all sites
            equipment = []
        
        # Try to get ingredient groups
        ingredient_groups = []
        try:
            ingredient_groups = scraper.ingredient_groups() or []
        except (AttributeError, NotImplementedError):
            # Ingredient groups method might not be implemented for all sites
            ingredient_groups = []
        
        # Get raw JSON data from recipe-scrapers
        raw_json = None
        try:
            raw_json = scraper.to_json()
        except (AttributeError, NotImplementedError):
            raw_json = None

        # Build the response object
        recipe_data = {
            'title': scraper.title() or 'Unknown Recipe',
            'ingredients': scraper.ingredients() or [],
            'instructions': scraper.instructions_list() or [],
            'equipment': equipment,
            'total_time': scraper.total_time() or None,
            'prep_time': scraper.prep_time() or None,
            'cook_time': scraper.cook_time() or None,
            'yields': scraper.yields() or None,
            'image': scraper.image() or None,
            'host': scraper.host() or None,
            'url': url,
            'raw_json': raw_json
        }
        
        # Only include ingredient_groups if they are meaningful
        if has_meaningful_ingredient_groups(ingredient_groups):
            recipe_data['ingredient_groups'] = ingredient_groups

        return recipe_data
        
    except WebsiteNotImplementedError as e:
        # This is a legitimate "domain not supported" error
        raise Exception(f"Domain not supported: The website '{urlparse(url).netloc}' is not supported by the recipe parser.")
    
    except (RecipeSchemaNotFound, NoSchemaFoundInWildMode) as e:
        # No recipe schema found - check if it's a paywall issue
        is_paywall, paywall_info = detect_paywall(url)
        domain = urlparse(url).netloc
        
        if is_paywall:
            raise Exception(f"Paywall detected: The recipe at {domain} appears to be behind a paywall or requires subscription access. Please ensure you have access to view the full recipe content.")
        else:
            raise Exception(f"No recipe found: Unable to find recipe data on this page. The page may not contain a recipe or the recipe format is not recognized.")
    
    except SchemaOrgException as e:
        # Missing specific schema.org fields - could be paywall or parsing issue
        error_details = str(e).lower()
        is_paywall, paywall_info = detect_paywall(url)
        domain = urlparse(url).netloc
        
        if is_paywall:
            raise Exception(f"Paywall detected: The recipe at {domain} appears to be behind a paywall.")
        else:
            # This is likely just missing optional fields like timing - try to get partial recipe data
            try:
                print(f"DEBUG: SchemaOrgException for optional fields, attempting partial parsing...")
                scraper = scrape_me(url)
                
                # Get what we can, ignoring missing timing fields
                recipe_data = {
                    'title': scraper.title() or 'Unknown Recipe',
                    'ingredients': scraper.ingredients() or [],
                    'instructions': scraper.instructions_list() or [],
                    'yields': scraper.yields() or None,
                    'image': scraper.image() or None,
                    'host': scraper.host() or None,
                    'url': url,
                    'warning': f"Some timing details like cook time or prep time may be missing from this recipe. This recipe is shown as originally found on {domain}."
                }
                
                # Try to get optional fields safely
                try:
                    recipe_data['total_time'] = scraper.total_time()
                except:
                    recipe_data['total_time'] = None
                    
                try:
                    recipe_data['prep_time'] = scraper.prep_time()
                except:
                    recipe_data['prep_time'] = None
                    
                try:
                    recipe_data['cook_time'] = scraper.cook_time()
                except:
                    recipe_data['cook_time'] = None
                
                # Try to get equipment safely
                try:
                    equipment = scraper.equipment() or []
                    recipe_data['equipment'] = equipment
                except:
                    recipe_data['equipment'] = []
                
                # Try to get ingredient groups safely
                try:
                    ingredient_groups = scraper.ingredient_groups() or []
                    if has_meaningful_ingredient_groups(ingredient_groups):
                        recipe_data['ingredient_groups'] = ingredient_groups
                except:
                    pass
                
                # Try to get raw JSON safely
                try:
                    recipe_data['raw_json'] = scraper.to_json()
                except:
                    recipe_data['raw_json'] = None
                
                print(f"DEBUG: Successfully parsed partial recipe data")
                return recipe_data
                
            except Exception as parse_error:
                print(f"DEBUG: Failed to parse partial recipe: {parse_error}")
                raise Exception(f"Recipe parsing incomplete: Found recipe data but some timing information (cook time, prep time) is missing from {domain}. The recipe should still be usable.")
    
    except (ElementNotFoundInHtml, OpenGraphException) as e:
        # HTML structure issues - check for paywall
        is_paywall, paywall_info = detect_paywall(url)
        domain = urlparse(url).netloc
        
        if is_paywall:
            raise Exception(f"Paywall detected: The recipe at {domain} appears to be behind a subscription paywall. Please log in to your account or check if you have access to this content.")
        else:
            raise Exception(f"Page structure issue: The recipe page structure at {domain} is not recognized. The website may have changed its format or this page may not contain a recipe.")
    
    except FieldNotProvidedByWebsiteException as e:
        # Missing specific fields but recipe was found
        raise Exception(f"Recipe parsing incomplete: Found recipe data but some information is missing. The recipe may still be usable with limited details.")
    
    except Exception as e:
        # Catch-all for other unexpected errors (network, parsing, etc.)
        error_msg = str(e).lower()
        domain = urlparse(url).netloc
        
        # Log the actual error for debugging
        print(f"DEBUG: Unexpected error parsing {url}: {str(e)}")
        print(f"DEBUG: Error type: {type(e).__name__}")
        
        # Network and connection issues
        if "timeout" in error_msg or "connection" in error_msg or "network" in error_msg:
            raise Exception(f"Network error: Unable to access {domain}. Please check your internet connection and try again.")
        elif "ssl" in error_msg or "certificate" in error_msg:
            raise Exception(f"SSL/Certificate error: Unable to establish a secure connection to {domain}. The website may have certificate issues.")
        elif "forbidden" in error_msg or "403" in error_msg:
            raise Exception(f"Access denied: {domain} is blocking automated requests. Try copying the recipe content manually.")
        elif "unauthorized" in error_msg or "401" in error_msg:
            raise Exception(f"Authentication required: {domain} requires login to access this recipe.")
        elif "not found" in error_msg or "404" in error_msg:
            raise Exception(f"Recipe page not found: The specific recipe page at {domain} could not be found. The URL may be incorrect or the recipe may have been moved.")
        elif "500" in error_msg or "server error" in error_msg:
            raise Exception(f"Website error: {domain} is experiencing technical difficulties. Please try again later.")
        elif "rate limit" in error_msg or "too many requests" in error_msg:
            raise Exception(f"Rate limited: Too many requests to {domain}. Please wait a moment and try again.")
        # Parsing-specific issues
        elif "html" in error_msg and ("empty" in error_msg or "no content" in error_msg):
            raise Exception(f"Empty page: The webpage at {domain} appears to be empty or has no content to parse.")
        elif "redirect" in error_msg or "moved" in error_msg:
            raise Exception(f"Page redirect: The recipe page has moved. Please check for the updated URL on {domain}.")
        else:
            # For any other unexpected errors, provide detailed information for debugging
            raise Exception(f"Recipe parsing failed: Unable to extract recipe data from {domain}. This could be due to the page structure not being recognized or missing recipe data. Technical details: {str(e)}")

@app.route('/')
def index():
    return jsonify({
        'status': 'Online',
        'message': 'Recipe Summarizer Backend',
        'version': VERSION,
        'deployment_id': DEPLOYMENT_ID,
        'deployed_at': DEPLOYMENT_TIME,
        'environment': os.environ.get('FLASK_ENV', 'production')
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'recipe-summarizer-backend'})

@app.route('/api/hello')
def hello():
    return jsonify({'message': 'Hello from Python backend!'})

@app.route('/api/test-llm')
def test_llm():
    """Test Azure OpenAI connectivity"""
    try:
        # Simple test data
        test_data = {"test": "data"}
        result = llm_service.parse_recipe_to_table(test_data)
        return jsonify({
            'success': result['success'],
            'error': result.get('error', None),
            'message': 'LLM test completed'
        })
    except Exception as e:
        return jsonify({'error': f'LLM test failed: {str(e)}'}), 500

@app.route('/api/parse-recipe', methods=['POST'])
def parse_recipe_endpoint():
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'error': 'URL is required'}), 400
    
    url = data['url']
    
    try:
        recipe = parse_recipe(url)
        return jsonify(recipe)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/parse-to-table', methods=['POST'])
def parse_to_table_endpoint():
    """
    Parse recipe JSON data into a structured table using LLM
    """
    data = request.get_json()
    
    if not data or 'raw_json' not in data:
        return jsonify({'error': 'raw_json is required'}), 400
    
    raw_json = data['raw_json']
    
    try:
        print(f"Attempting to parse recipe to table...")
        result = llm_service.parse_recipe_to_table(raw_json)
        print(f"LLM service result success: {result.get('success', False)}")
        
        if result['success']:
            return jsonify(result['table_data'])
        else:
            print(f"LLM service failed with error: {result['error']}")
            return jsonify({'error': result['error']}), 500
            
    except UnicodeEncodeError as ue:
        error_msg = f"Unicode encoding error: {str(ue)}"
        print(error_msg)
        return jsonify({'error': 'Recipe contains special characters that cannot be processed. Please try a different recipe.'}), 500
    except Exception as e:
        error_msg = f"Exception in parse_to_table_endpoint: {str(e)}"
        print(error_msg)
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='localhost', port=port, debug=True)
