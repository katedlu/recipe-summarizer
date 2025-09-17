# Import routes
from .auth import auth_bp
from .recipes import recipes_bp

def register_routes(app):
    """Register all blueprint routes with the app"""
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(recipes_bp, url_prefix='/api/recipes')