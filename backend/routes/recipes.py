from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.models import db, User, SavedRecipe

recipes_bp = Blueprint('recipes', __name__)

@recipes_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    """Get all favorite recipes for the current user"""
    user_id = get_jwt_identity()
    
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Query saved recipes with pagination
    saved_recipes = SavedRecipe.query.filter_by(user_id=user_id)\
        .order_by(SavedRecipe.saved_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    # Format response
    recipes = []
    for recipe in saved_recipes.items:
        recipes.append({
            'id': recipe.id,
            'title': recipe.title,
            'source_url': recipe.source_url,
            'saved_at': recipe.saved_at.isoformat(),
            'notes': recipe.notes,
            'recipe_data': recipe.get_recipe_data(),
            'has_diagram': recipe.diagram_image is not None,
            'diagram_generated_at': recipe.diagram_generated_at.isoformat() if recipe.diagram_generated_at else None
        })
    
    return jsonify({
        'recipes': recipes,
        'pagination': {
            'total': saved_recipes.total,
            'pages': saved_recipes.pages,
            'current_page': page,
            'per_page': per_page
        }
    }), 200

@recipes_bp.route('/favorites', methods=['POST'])
@jwt_required()
def save_recipe():
    """Save a recipe to favorites"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['title', 'source_url', 'recipe_data']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if recipe already saved
    existing = SavedRecipe.query.filter_by(
        user_id=user_id, 
        source_url=data['source_url']
    ).first()
    
    if existing:
        return jsonify({'error': 'Recipe already saved', 'recipe_id': existing.id}), 409
    
    # Create new saved recipe
    recipe = SavedRecipe(
        user_id=user_id,
        title=data['title'],
        source_url=data['source_url'],
        notes=data.get('notes', '')
    )
    recipe.set_recipe_data(data['recipe_data'])
    
    # Save to database
    db.session.add(recipe)
    db.session.commit()
    
    return jsonify({
        'message': 'Recipe saved successfully',
        'recipe': {
            'id': recipe.id,
            'title': recipe.title,
            'source_url': recipe.source_url,
            'saved_at': recipe.saved_at.isoformat(),
            'notes': recipe.notes
        }
    }), 201

@recipes_bp.route('/favorites/<int:recipe_id>', methods=['GET'])
@jwt_required()
def get_favorite(recipe_id):
    """Get a specific saved recipe"""
    user_id = get_jwt_identity()
    
    recipe = SavedRecipe.query.filter_by(id=recipe_id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    return jsonify({
        'recipe': {
            'id': recipe.id,
            'title': recipe.title,
            'source_url': recipe.source_url,
            'saved_at': recipe.saved_at.isoformat(),
            'notes': recipe.notes,
            'recipe_data': recipe.get_recipe_data(),
            'has_diagram': recipe.diagram_image is not None,
            'diagram_image': recipe.diagram_image,
            'diagram_generated_at': recipe.diagram_generated_at.isoformat() if recipe.diagram_generated_at else None
        }
    }), 200

@recipes_bp.route('/favorites/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(recipe_id):
    """Remove a recipe from favorites"""
    user_id = get_jwt_identity()
    
    recipe = SavedRecipe.query.filter_by(id=recipe_id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    db.session.delete(recipe)
    db.session.commit()
    
    return jsonify({'message': 'Recipe removed from favorites'}), 200

@recipes_bp.route('/favorites/<int:recipe_id>/notes', methods=['PUT'])
@jwt_required()
def update_notes(recipe_id):
    """Update notes for a saved recipe"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if 'notes' not in data:
        return jsonify({'error': 'Notes field is required'}), 400
    
    recipe = SavedRecipe.query.filter_by(id=recipe_id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    recipe.notes = data['notes']
    db.session.commit()
    
    return jsonify({
        'message': 'Notes updated successfully',
        'recipe': {
            'id': recipe.id,
            'title': recipe.title,
            'notes': recipe.notes
        }
    }), 200

@recipes_bp.route('/favorites/<int:recipe_id>/diagram', methods=['POST'])
@jwt_required()
def generate_diagram(recipe_id):
    """Generate or update a diagram for a recipe"""
    user_id = get_jwt_identity()
    
    recipe = SavedRecipe.query.filter_by(id=recipe_id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    # This is a placeholder for the actual diagram generation logic
    # In a real implementation, you would:
    # 1. Extract recipe data
    # 2. Call a diagram generation service/library
    # 3. Save the resulting image
    
    # For now, we'll just store a placeholder message
    recipe.diagram_image = "Diagram generation not yet implemented"
    recipe.diagram_generated_at = datetime.datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Diagram generation placeholder created',
        'recipe': {
            'id': recipe.id,
            'title': recipe.title,
            'has_diagram': True,
            'diagram_generated_at': recipe.diagram_generated_at.isoformat()
        }
    }), 200