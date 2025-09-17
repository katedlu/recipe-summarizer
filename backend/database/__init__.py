from .models import db, User, SavedRecipe
import os

def init_db(app):
    """Initialize the database and create tables"""
    # Configure SQLAlchemy
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                         'database', 'recipe_app.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy with app
    db.init_app(app)
    
    # Create all tables if they don't exist
    with app.app_context():
        db.create_all()
        
    return db