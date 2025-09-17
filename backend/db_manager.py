#!/usr/bin/env python3
"""
Database management script for Recipe Summarizer
"""
import os
import sys
from app import app, db, User, SavedRecipe

def init_database():
    """Initialize the database with tables"""
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")

def create_admin_user():
    """Create an admin user for testing"""
    with app.app_context():
        # Check if admin already exists
        if User.query.filter_by(username='admin').first():
            print("❌ Admin user already exists!")
            return
        
        # Create admin user
        admin = User(
            username='admin',
            email='admin@example.com'
        )
        admin.set_password('admin123')
        
        try:
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created successfully!")
            print("   Username: admin")
            print("   Password: admin123")
            print("   Email: admin@example.com")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating admin user: {e}")

def show_users():
    """Show all users in the database"""
    with app.app_context():
        users = User.query.all()
        if not users:
            print("📝 No users found in database")
            return
        
        print(f"📝 Found {len(users)} users:")
        for user in users:
            recipe_count = SavedRecipe.query.filter_by(user_id=user.id).count()
            print(f"   - {user.username} ({user.email}) - Created: {user.created_at} - Recipes: {recipe_count}")

def show_recipes():
    """Show all saved recipes in the database"""
    with app.app_context():
        recipes = SavedRecipe.query.all()
        if not recipes:
            print("📝 No saved recipes found in database")
            return
        
        print(f"📝 Found {len(recipes)} saved recipes:")
        for recipe in recipes:
            user = User.query.get(recipe.user_id)
            print(f"   - {recipe.title} ({user.username}) - Saved: {recipe.saved_at}")
            print(f"     URL: {recipe.url[:50]}...")
            if recipe.image_url:
                print(f"     Image: {recipe.image_url[:50]}...")

def reset_database():
    """Reset the database (WARNING: This deletes all data!)"""
    with app.app_context():
        response = input("⚠️  Are you sure you want to reset the database? This will delete ALL data! (yes/no): ")
        if response.lower() == 'yes':
            db.drop_all()
            db.create_all()
            print("✅ Database reset successfully!")
        else:
            print("❌ Database reset cancelled")

def main():
    if len(sys.argv) < 2:
        print("Usage: python db_manager.py <command>")
        print("Commands:")
        print("  init          - Initialize database tables")
        print("  create-admin  - Create admin user for testing")
        print("  show-users    - Show all users")
        print("  show-recipes  - Show all saved recipes")
        print("  reset         - Reset database (deletes all data)")
        return
    
    command = sys.argv[1]
    
    if command == 'init':
        init_database()
    elif command == 'create-admin':
        create_admin_user()
    elif command == 'show-users':
        show_users()
    elif command == 'show-recipes':
        show_recipes()
    elif command == 'reset':
        reset_database()
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == '__main__':
    main()
