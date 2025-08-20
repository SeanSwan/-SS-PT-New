#!/usr/bin/env python3
"""
SwanStudios MongoDB to PostgreSQL Migration Script
================================================
Automatically updates MCP servers to use PostgreSQL instead of MongoDB

Run with: python migrate-to-postgresql.py
"""

import os
import re
import shutil
from pathlib import Path

class SwanStudiosMigration:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.mcp_dir = self.root_dir / "backend" / "mcp_server"
        self.changes_made = []
        
    def log_change(self, file_path, change_description):
        """Log a change made during migration"""
        self.changes_made.append(f"✅ {file_path}: {change_description}")
        print(f"✅ {change_description} in {file_path}")
    
    def backup_file(self, file_path):
        """Create a backup of the original file"""
        backup_path = f"{file_path}.mongodb-backup"
        shutil.copy2(file_path, backup_path)
        print(f"💾 Backed up {file_path} to {backup_path}")
    
    def update_workout_requirements(self):
        """Update workout_requirements.txt to use PostgreSQL"""
        req_file = self.mcp_dir / "workout_requirements.txt"
        
        if not req_file.exists():
            print(f"⚠️ {req_file} not found")
            return
            
        self.backup_file(req_file)
        
        with open(req_file, 'r') as f:
            content = f.read()
        
        # Remove MongoDB dependencies
        content = re.sub(r'pymongo==.*\n', '', content)
        content = re.sub(r'dnspython>=.*\n', '', content)
        
        # Add PostgreSQL dependencies if not present
        if 'psycopg2-binary' not in content:
            content += '\npsycopg2-binary>=2.9.1\n'
        if 'sqlalchemy' not in content:
            content += 'sqlalchemy>=2.0.0\n'
        
        with open(req_file, 'w') as f:
            f.write(content)
        
        self.log_change(req_file, "Replaced MongoDB deps with PostgreSQL deps")
    
    def create_postgresql_config(self):
        """Create PostgreSQL configuration for MCP servers"""
        config_content = '''"""
PostgreSQL Database Configuration for SwanStudios MCP Servers
==========================================================
Replaces MongoDB connections with PostgreSQL for Render deployment
"""

import os
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://localhost/swanstudios'

# SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_session():
    """Get database session"""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def get_db_connection():
    """Get raw psycopg2 connection"""
    return psycopg2.connect(DATABASE_URL)

# Example usage:
# from database_config import get_db_session, get_db_connection
'''
        
        config_file = self.mcp_dir / "database_config.py"
        with open(config_file, 'w') as f:
            f.write(config_content)
        
        self.log_change(config_file, "Created PostgreSQL configuration")
    
    def update_workout_server_database(self):
        """Update workout MCP server to use PostgreSQL"""
        workout_dir = self.mcp_dir / "workout_mcp_server"
        
        if not workout_dir.exists():
            print(f"⚠️ {workout_dir} not found")
            return
        
        # Find Python files that might use MongoDB
        for py_file in workout_dir.glob("*.py"):
            self.update_python_file_for_postgresql(py_file)
    
    def update_python_file_for_postgresql(self, file_path):
        """Update a Python file to use PostgreSQL instead of MongoDB"""
        if not file_path.exists():
            return
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Replace MongoDB imports
        content = re.sub(r'import pymongo.*\n', '', content)
        content = re.sub(r'from pymongo.*\n', '', content)
        content = re.sub(r'import bson.*\n', '', content)
        
        # Add PostgreSQL imports if MongoDB was used
        if 'pymongo' in original_content or 'MongoClient' in original_content:
            imports_to_add = [
                'import psycopg2',
                'from sqlalchemy import create_engine, text',
                'from database_config import get_db_session, get_db_connection'
            ]
            
            # Add imports after existing imports
            import_section = []
            lines = content.split('\n')
            insert_index = 0
            
            for i, line in enumerate(lines):
                if line.strip().startswith('import ') or line.strip().startswith('from '):
                    insert_index = i + 1
            
            for imp in imports_to_add:
                if imp not in content:
                    lines.insert(insert_index, imp)
                    insert_index += 1
            
            content = '\n'.join(lines)
        
        # Replace common MongoDB patterns
        replacements = [
            (r'MongoClient\([^)]*\)', 'get_db_connection()'),
            (r'client\[\'([^\']+)\'\]', r'# Use PostgreSQL database: \1'),
            (r'db\[\'([^\']+)\'\]', r'# Use PostgreSQL table: \1'),
            (r'collection\.find\(\)', 'session.execute(text("SELECT * FROM table"))'),
            (r'collection\.insert_one\(', 'session.execute(text("INSERT INTO table VALUES "),'),
            (r'collection\.update_one\(', 'session.execute(text("UPDATE table SET "),'),
            (r'collection\.delete_one\(', 'session.execute(text("DELETE FROM table WHERE "),'),
        ]
        
        for pattern, replacement in replacements:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                self.log_change(file_path, f"Replaced MongoDB pattern: {pattern}")
        
        # Only write if changes were made
        if content != original_content:
            self.backup_file(file_path)
            with open(file_path, 'w') as f:
                f.write(content)
    
    def create_migration_guide(self):
        """Create a detailed migration guide"""
        guide_content = f'''# SwanStudios PostgreSQL Migration Guide

## ✅ Automated Changes Made

{chr(10).join(self.changes_made)}

## 🔧 Manual Steps Required

### 1. Update Database Connection Code
Replace any remaining MongoDB connection code with PostgreSQL:

```python
# OLD MongoDB:
client = MongoClient(connection_string)
db = client['swanstudios']
collection = db['workouts']

# NEW PostgreSQL:
from database_config import get_db_session
session = get_db_session()
result = session.execute(text("SELECT * FROM workouts"))
```

### 2. Update Query Patterns
Replace MongoDB queries with SQL:

```python
# OLD MongoDB:
workouts = collection.find({{"user_id": user_id}})

# NEW PostgreSQL:
workouts = session.execute(
    text("SELECT * FROM workouts WHERE user_id = :user_id"),
    {{"user_id": user_id}}
)
```

### 3. Use Existing PostgreSQL Models
Reference existing Sequelize models in `backend/models/`:
- WorkoutPlan.mjs
- WorkoutSession.mjs  
- Exercise.mjs
- Set.mjs
- User.mjs

### 4. Test Local PostgreSQL Connection
```bash
# Install new dependencies
pip install -r workout_requirements.txt

# Test MCP server with PostgreSQL
python workout_mcp_server/start_server.py
```

### 5. Environment Variables
Ensure your .env has:
```
DATABASE_URL=postgresql://localhost/swanstudios
```

## 🚀 Render Deployment

After migration:
1. Push changes to GitHub
2. Connect Render to repository
3. Add PostgreSQL database service
4. Configure DATABASE_URL environment variable
5. Deploy!

## ✅ Verification

Run the dependency checker:
```bash
node check-mongodb-dependencies.mjs
```

Should show zero MongoDB dependencies.
'''
        
        guide_file = self.root_dir / "POSTGRESQL-MIGRATION-GUIDE.md"
        with open(guide_file, 'w') as f:
            f.write(guide_content)
        
        self.log_change(guide_file, "Created comprehensive migration guide")
    
    def run_migration(self):
        """Execute the complete migration"""
        print("🚀 Starting SwanStudios MongoDB → PostgreSQL Migration")
        print("=" * 60)
        
        try:
            # Update requirements files
            self.update_workout_requirements()
            
            # Create PostgreSQL configuration
            self.create_postgresql_config()
            
            # Update workout server files
            self.update_workout_server_database()
            
            # Create migration guide
            self.create_migration_guide()
            
            print("\n🎉 Migration Complete!")
            print("=" * 60)
            print(f"📊 Total changes made: {len(self.changes_made)}")
            print("\n📋 Next Steps:")
            print("1. Review the POSTGRESQL-MIGRATION-GUIDE.md")
            print("2. Test MCP servers with PostgreSQL")
            print("3. Run: node check-mongodb-dependencies.mjs")
            print("4. Deploy to Render with PostgreSQL database")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            print("Please review the error and try again.")

if __name__ == "__main__":
    migration = SwanStudiosMigration()
    migration.run_migration()
