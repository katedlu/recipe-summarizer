
import datetime
import uuid
import os
from dotenv import load_dotenv

# Load environment variables from .env file FIRST
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from recipe_scrapers import scrape_me
from llm_service import llm_service

# Create a deployment ID and timestamp when the app starts
DEPLOYMENT_ID = str(uuid.uuid4())[:8]  # Short UUID for readability
DEPLOYMENT_TIME = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
VERSION = "1.0.0"  # You can update this manually when making major changes

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

        return {
            'title': scraper.title() or 'Unknown Recipe',
            'ingredients': scraper.ingredients() or [],
            'ingredient_groups': ingredient_groups,
            'instructions': scraper.instructions_list() or [],
            'equipment': equipment,
            'total_time': scraper.total_time() or None,
            'prep_time': scraper.prep_time() or None,
            'cook_time': scraper.cook_time() or None,
            'yields': scraper.yields() or None,
            'image': scraper.image() or None,
            'host': scraper.host() or None,
            'raw_json': raw_json
        }
        
    except Exception as e:
        raise Exception(f"Failed to parse recipe: {str(e)}")

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
        print(f"LLM service result: {result}")
        
        if result['success']:
            return jsonify(result['table_data'])
        else:
            print(f"LLM service failed with error: {result['error']}")
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        print(f"Exception in parse_to_table_endpoint: {str(e)}")
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='localhost', port=port, debug=True)
