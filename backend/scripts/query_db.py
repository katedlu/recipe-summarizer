"""
SQLite Database Query Tool
Run with: python query_db.py "YOUR SQL QUERY HERE"
"""
import sqlite3
import sys
import os
from pathlib import Path

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.path.join(BASE_DIR, 'database', 'recipe_app.db')

def run_query(query):
    """Run an SQL query on the database and print results."""
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at: {DB_PATH}")
        return
    
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Execute the query
        cursor.execute(query)
        
        # If it's a SELECT query, fetch and print results
        if query.strip().upper().startswith('SELECT'):
            # Get column names
            column_names = [description[0] for description in cursor.description]
            print("\n" + " | ".join(column_names))
            print("-" * (len(" | ".join(column_names)) + 10))
            
            # Get and print rows
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    print(" | ".join(str(item) for item in row))
                print(f"\n{len(rows)} rows returned")
            else:
                print("No results found")
        else:
            # For non-SELECT queries, commit the changes
            conn.commit()
            print(f"Query executed successfully. {cursor.rowcount} rows affected.")
        
        conn.close()
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python query_db.py \"YOUR SQL QUERY\"")
        sys.exit(1)
    
    query = sys.argv[1]
    run_query(query)