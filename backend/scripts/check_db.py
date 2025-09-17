"""
A simple utility script to inspect the SQLite database.
Run this script to see database information.
"""
import os
import sqlite3
import sys
from pathlib import Path

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.path.join(BASE_DIR, 'database', 'recipe_app.db')

def check_database():
    """Check if the database exists and display information about it."""
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at: {DB_PATH}")
        print("The database will be created when you first run the application.")
        return
    
    print(f"Database file found at: {DB_PATH}")
    print(f"File size: {os.path.getsize(DB_PATH) / 1024:.2f} KB")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get table list
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        if not tables:
            print("No tables found in the database.")
        else:
            print("\nTables in the database:")
            for table in tables:
                print(f"- {table[0]}")
                
                # Get table schema
                cursor.execute(f"PRAGMA table_info({table[0]})")
                columns = cursor.fetchall()
                print("  Columns:")
                for col in columns:
                    print(f"    - {col[1]} ({col[2]})")
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
                count = cursor.fetchone()[0]
                print(f"  Row count: {count}")
                print()
        
        conn.close()
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")

if __name__ == "__main__":
    check_database()