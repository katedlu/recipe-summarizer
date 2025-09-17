from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for authentication and profile information"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationship with saved recipes
    saved_recipes = db.relationship('SavedRecipe', backref='user', lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password):
        """Set hashed password"""
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        """Check if password matches"""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class SavedRecipe(db.Model):
    """Model for saved recipes"""
    __tablename__ = 'saved_recipes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    source_url = db.Column(db.String(500), nullable=False)
    recipe_data = db.Column(db.Text, nullable=False)  # JSON string of recipe data
    saved_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)  # User notes on the recipe
    diagram_image = db.Column(db.Text, nullable=True)  # Base64 encoded diagram image or URL to image
    diagram_generated_at = db.Column(db.DateTime, nullable=True)  # When the diagram was generated
    
    def set_recipe_data(self, recipe_dict):
        """Convert recipe dictionary to JSON string"""
        self.recipe_data = json.dumps(recipe_dict)
        
    def get_recipe_data(self):
        """Get recipe data as a dictionary"""
        return json.loads(self.recipe_data)
    
    def __repr__(self):
        return f'<SavedRecipe {self.title}>'