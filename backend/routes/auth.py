from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from database.models import db, User
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Check if username or email already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    # Save to database
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'User registered successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user and return access token"""
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['username', 'password']):
        return jsonify({'error': 'Missing username or password'}), 400
    
    # Check if user exists
    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Create access token
    access_token = create_access_token(
        identity=user.id,
        expires_delta=datetime.timedelta(days=1)
    )
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get the current authenticated user"""
    try:
        user_id = get_jwt_identity()
        print(f"JWT identity: {user_id}")
        
        user = User.query.get(user_id)
        
        if not user:
            print(f"User with ID {user_id} not found in database")
            return jsonify({'error': 'User not found'}), 404
        
        print(f"User found: {user.username}")
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }), 200
    except Exception as e:
        print(f"Error in /me endpoint: {str(e)}")
        return jsonify({'error': f'Authentication error: {str(e)}'}), 422