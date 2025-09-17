
import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from recipe_scrapers import scrape_me
import os
import uuid
import json
from functools import wraps

# Create a deployment ID and timestamp when the app starts
DEPLOYMENT_ID = str(uuid.uuid4())[:8]  # Short UUID for readability
DEPLOYMENT_TIME = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
VERSION = "1.0.0"  # You can update this manually when making major changes

app = Flask(__name__)
CORS(app)

# Database configuration
# Get the directory where this script is located
basedir = os.path.abspath(os.path.dirname(__file__))
database_path = os.path.join(basedir, 'instance', 'users.db')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{database_path}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationship to saved recipes
    saved_recipes = db.relationship('SavedRecipe', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

# Saved Recipe model
class SavedRecipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    url = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text, nullable=True)
    ingredients = db.Column(db.Text, nullable=True)  # JSON string of ingredients
    instructions = db.Column(db.Text, nullable=True)  # JSON string of instructions
    prep_time = db.Column(db.Integer, nullable=True)  # minutes
    cook_time = db.Column(db.Integer, nullable=True)  # minutes
    total_time = db.Column(db.Integer, nullable=True)  # minutes
    servings = db.Column(db.String(50), nullable=True)
    saved_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Foreign key to User
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<SavedRecipe {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'url': self.url,
            'image_url': self.image_url,
            'ingredients': json.loads(self.ingredients) if self.ingredients else [],
            'instructions': json.loads(self.instructions) if self.instructions else [],
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'total_time': self.total_time,
            'servings': self.servings,
            'saved_at': self.saved_at.isoformat(),
            'user_id': self.user_id
        }

# User management functions
def create_user(username, email, password):
    """Create a new user"""
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return False, "Username already exists"
    
    # Check if email already registered
    if User.query.filter_by(email=email).first():
        return False, "Email already registered"
    
    # Create new user
    user = User(username=username, email=email)
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        return True, "User created successfully"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}"

def authenticate_user(username, password):
    """Authenticate user credentials"""
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return True
    return False

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

@app.route('/api/hello')
def hello():
    return jsonify({'message': 'Hello from Python backend!'})

# Authentication routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not all(key in data for key in ['username', 'email', 'password']):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    username = data['username']
    email = data['email']
    password = data['password']
    
    # Basic validation
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters long'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    success, message = create_user(username, email, password)
    
    if success:
        return jsonify({'message': message}), 201
    else:
        return jsonify({'error': message}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not all(key in data for key in ['username', 'password']):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data['username']
    password = data['password']
    
    if authenticate_user(username, password):
        access_token = create_access_token(identity=username)
        return jsonify({
            'access_token': access_token,
            'username': username,
            'message': 'Login successful'
        }), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    
    if user:
        return jsonify(user.to_dict()), 200
    else:
        return jsonify({'error': 'User not found'}), 404

@app.route('/api/db-status', methods=['GET'])
def db_status():
    """Check database status"""
    try:
        user_count = User.query.count()
        return jsonify({
            'status': 'connected',
            'user_count': user_count,
            'database': app.config['SQLALCHEMY_DATABASE_URI']
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/api/parse-recipe', methods=['POST'])
@jwt_required()
def parse_recipe_endpoint():
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'error': 'URL is required'}), 400
    
    url = data['url']
    current_user = get_jwt_identity()
    
    try:
        recipe = parse_recipe(url)
        recipe['parsed_by'] = current_user  # Add user info to recipe
        return jsonify(recipe)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-recipe', methods=['POST'])
@jwt_required()
def save_recipe():
    """Save a recipe to user's collection"""
    data = request.get_json()
    current_user = get_jwt_identity()
    
    if not data:
        return jsonify({'error': 'Recipe data is required'}), 400
    
    # Get user
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        # Create saved recipe
        saved_recipe = SavedRecipe(
            title=data.get('title', 'Untitled Recipe'),
            url=data.get('url', ''),
            image_url=data.get('image'),
            ingredients=json.dumps(data.get('ingredients', [])),
            instructions=json.dumps(data.get('instructions', [])),
            prep_time=data.get('prep_time'),
            cook_time=data.get('cook_time'),
            total_time=data.get('total_time'),
            servings=data.get('yields'),
            user_id=user.id
        )
        
        db.session.add(saved_recipe)
        db.session.commit()
        
        return jsonify({
            'message': 'Recipe saved successfully',
            'recipe': saved_recipe.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to save recipe: {str(e)}'}), 500

@app.route('/api/saved-recipes', methods=['GET'])
@jwt_required()
def get_saved_recipes():
    """Get all saved recipes for the current user"""
    current_user = get_jwt_identity()
    
    # Get user
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user's saved recipes
    saved_recipes = SavedRecipe.query.filter_by(user_id=user.id).order_by(SavedRecipe.saved_at.desc()).all()
    
    return jsonify({
        'recipes': [recipe.to_dict() for recipe in saved_recipes],
        'count': len(saved_recipes)
    }), 200

@app.route('/api/saved-recipes/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def delete_saved_recipe(recipe_id):
    """Delete a saved recipe"""
    current_user = get_jwt_identity()
    
    # Get user
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Find the recipe
    recipe = SavedRecipe.query.filter_by(id=recipe_id, user_id=user.id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    try:
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Recipe deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete recipe: {str(e)}'}), 500

# Initialize database
def init_db():
    """Initialize the database"""
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

if __name__ == '__main__':
    # Create database tables
    init_db()
    app.run(port=5001)
