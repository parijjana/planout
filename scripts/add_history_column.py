
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../backend/planout_v2.db')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(chunk)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'history' not in columns:
            print("Adding 'history' column to 'chunk' table...")
            # SQLite stores JSON as TEXT
            cursor.execute("ALTER TABLE chunk ADD COLUMN history TEXT")
            conn.commit()
            print("Migration successful.")
        else:
            print("'history' column already exists.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
