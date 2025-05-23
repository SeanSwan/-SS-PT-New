"""
Database utilities for the Workout MCP Server.

This module provides a placeholder for the future database implementation.
It currently simulates database operations in memory but is designed to be
replaced with actual database operations using SQLAlchemy or another ORM.
"""

import logging
from typing import Dict, List, Any, Optional, Type, TypeVar, Generic
from datetime import datetime

from .config import config

logger = logging.getLogger("workout_mcp_server.database")

# Type variable for generic model classes
T = TypeVar('T')

class InMemoryDatabase:
    """
    In-memory database for development and testing.
    
    This is a temporary solution until a proper database is implemented.
    It provides basic CRUD operations for different model types.
    """
    
    def __init__(self):
        """Initialize the in-memory database."""
        self._data: Dict[str, List[Dict[str, Any]]] = {}
        logger.warning(
            "Using in-memory database. This is not suitable for production use. "
            "Data will be lost when the server restarts."
        )
    
    def create_collection(self, collection_name: str) -> None:
        """
        Create a new collection.
        
        Args:
            collection_name: Collection name
        """
        if collection_name not in self._data:
            self._data[collection_name] = []
    
    def insert(self, collection_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a document into a collection.
        
        Args:
            collection_name: Collection name
            data: Document data
            
        Returns:
            Inserted document with ID
        """
        if collection_name not in self._data:
            self.create_collection(collection_name)
        
        # Generate ID if not provided
        if '_id' not in data:
            data['_id'] = f"{len(self._data[collection_name]) + 1}"
        
        # Add timestamps
        data['createdAt'] = datetime.now().isoformat()
        data['updatedAt'] = data['createdAt']
        
        self._data[collection_name].append(data)
        return data
    
    def find_one(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Find a single document matching a query.
        
        Args:
            collection_name: Collection name
            query: Query criteria
            
        Returns:
            Matching document or None
        """
        if collection_name not in self._data:
            return None
        
        for item in self._data[collection_name]:
            if self._matches(item, query):
                return item
        
        return None
    
    def find(self, collection_name: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Find all documents matching a query.
        
        Args:
            collection_name: Collection name
            query: Query criteria
            
        Returns:
            List of matching documents
        """
        if collection_name not in self._data:
            return []
        
        return [item for item in self._data[collection_name] if self._matches(item, query)]
    
    def update(self, collection_name: str, query: Dict[str, Any], update: Dict[str, Any]) -> int:
        """
        Update documents matching a query.
        
        Args:
            collection_name: Collection name
            query: Query criteria
            update: Update data
            
        Returns:
            Number of documents updated
        """
        if collection_name not in self._data:
            return 0
        
        count = 0
        for item in self._data[collection_name]:
            if self._matches(item, query):
                # Update the document
                for key, value in update.items():
                    item[key] = value
                
                # Update timestamp
                item['updatedAt'] = datetime.now().isoformat()
                count += 1
        
        return count
    
    def delete(self, collection_name: str, query: Dict[str, Any]) -> int:
        """
        Delete documents matching a query.
        
        Args:
            collection_name: Collection name
            query: Query criteria
            
        Returns:
            Number of documents deleted
        """
        if collection_name not in self._data:
            return 0
        
        original_length = len(self._data[collection_name])
        self._data[collection_name] = [item for item in self._data[collection_name] if not self._matches(item, query)]
        
        return original_length - len(self._data[collection_name])
    
    def _matches(self, item: Dict[str, Any], query: Dict[str, Any]) -> bool:
        """
        Check if an item matches a query.
        
        Args:
            item: Document
            query: Query criteria
            
        Returns:
            True if item matches query, False otherwise
        """
        for key, value in query.items():
            if key not in item or item[key] != value:
                return False
        
        return True


class Repository(Generic[T]):
    """
    Generic repository for database operations.
    
    This provides a clean interface for database operations that can be
    used with different model types. It currently uses the in-memory database
    but can be adapted to use an actual database in the future.
    """
    
    def __init__(self, model_class: Type[T], collection_name: str):
        """
        Initialize the repository.
        
        Args:
            model_class: The model class (e.g., WorkoutSession)
            collection_name: The name of the collection or table
        """
        self.model_class = model_class
        self.collection_name = collection_name
        self.db = database
    
    def create(self, data: Dict[str, Any]) -> T:
        """
        Create a new document.
        
        Args:
            data: Document data
            
        Returns:
            Created document
        """
        result = self.db.insert(self.collection_name, data)
        return self._dict_to_model(result)
    
    def find_by_id(self, id: str) -> Optional[T]:
        """
        Find a document by ID.
        
        Args:
            id: Document ID
            
        Returns:
            Document if found, None otherwise
        """
        result = self.db.find_one(self.collection_name, {'_id': id})
        if result:
            return self._dict_to_model(result)
        return None
    
    def find_one(self, query: Dict[str, Any]) -> Optional[T]:
        """
        Find a single document matching a query.
        
        Args:
            query: Query criteria
            
        Returns:
            Document if found, None otherwise
        """
        result = self.db.find_one(self.collection_name, query)
        if result:
            return self._dict_to_model(result)
        return None
    
    def find_all(self, query: Dict[str, Any] = None) -> List[T]:
        """
        Find all documents matching a query.
        
        Args:
            query: Query criteria (optional)
            
        Returns:
            List of matching documents
        """
        results = self.db.find(self.collection_name, query or {})
        return [self._dict_to_model(result) for result in results]
    
    def update(self, id: str, data: Dict[str, Any]) -> Optional[T]:
        """
        Update a document by ID.
        
        Args:
            id: Document ID
            data: Update data
            
        Returns:
            Updated document if found, None otherwise
        """
        count = self.db.update(self.collection_name, {'_id': id}, data)
        if count > 0:
            return self.find_by_id(id)
        return None
    
    def delete(self, id: str) -> bool:
        """
        Delete a document by ID.
        
        Args:
            id: Document ID
            
        Returns:
            True if document was deleted, False otherwise
        """
        count = self.db.delete(self.collection_name, {'_id': id})
        return count > 0
    
    def _dict_to_model(self, data: Dict[str, Any]) -> T:
        """
        Convert a dictionary to a model instance.
        
        Args:
            data: Dictionary data
            
        Returns:
            Model instance
        """
        # For now, just return the dictionary as-is
        # In the future, this should create a proper model instance
        return data

# Create the database instance
database = InMemoryDatabase()


class SQLDatabase:
    """
    SQLAlchemy database for production use.
    
    This is a placeholder for the future SQLAlchemy implementation.
    It provides no actual functionality at this time.
    """
    
    def __init__(self):
        """Initialize the SQL database."""
        try:
            # Get database URI from config
            self.db_uri = config.get_db_uri()
            
            # Placeholder for SQLAlchemy setup
            # from sqlalchemy import create_engine
            # from sqlalchemy.orm import sessionmaker
            # self.engine = create_engine(self.db_uri)
            # self.Session = sessionmaker(bind=self.engine)
            
            logger.info("SQL database connection initialized (PLACEHOLDER).")
            logger.warning(
                "SQL database implementation is a placeholder. "
                "No actual database operations will be performed."
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize SQL database: {str(e)}")
            logger.warning("Falling back to in-memory database.")
            # In a real implementation, we might want to raise an exception
            # or fall back to a less critical mode of operation


# Future implementation will use SQL database in production
# if not config.is_production():
#     database = InMemoryDatabase()
# else:
#     database = SQLDatabase()  # Not implemented yet, would use SQLAlchemy
