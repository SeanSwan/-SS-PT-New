"""
MongoDB connection utilities for the Workout MCP Server.

This module provides functions for connecting to MongoDB and performing database operations.
It supports fallback to another port if the primary port connection fails.
"""

import os
import logging
from typing import Dict, List, Any, Optional, Union
import pymongo
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from .config import config

logger = logging.getLogger("workout_mcp_server.mongodb")

# MongoDB connection variables
_client: Optional[MongoClient] = None
_db: Optional[Database] = None

def get_mongodb_uri() -> str:
    """
    Get the MongoDB connection URI.
    
    Returns:
        MongoDB connection URI
    """
    host = config.get('MONGODB_HOST', 'localhost')
    port = config.get('MONGODB_PORT', '5001')
    db_name = config.get('MONGODB_DB', 'swanstudios')
    
    return f"mongodb://{host}:{port}/{db_name}"

def get_mongodb_fallback_uri() -> str:
    """
    Get the MongoDB fallback connection URI.
    
    Returns:
        MongoDB fallback connection URI
    """
    host = config.get('MONGODB_HOST', 'localhost')
    fallback_port = config.get('MONGODB_FALLBACK_PORT', '27017')
    db_name = config.get('MONGODB_DB', 'swanstudios')
    
    return f"mongodb://{host}:{fallback_port}/{db_name}"

async def connect_to_mongodb() -> Dict[str, Any]:
    """
    Connect to MongoDB with fallback to secondary port if needed.
    
    Returns:
        Dict containing client and db objects
    """
    global _client, _db
    
    # If already connected, return existing connection
    if _client is not None and _db is not None:
        return {"client": _client, "db": _db}
    
    # Get connection URIs
    primary_uri = get_mongodb_uri()
    fallback_uri = get_mongodb_fallback_uri()
    
    # Connection options
    options = {
        "serverSelectionTimeoutMS": 5000,
        "connectTimeoutMS": 5000,
        "socketTimeoutMS": 30000,
    }
    
    logger.info(f"Connecting to MongoDB at {primary_uri}")
    
    try:
        # Try primary URI first
        _client = MongoClient(primary_uri, **options)
        # Ping to verify connection
        _client.admin.command('ping')
        _db = _client.get_database()
        logger.info("Successfully connected to MongoDB")
        return {"client": _client, "db": _db}
    
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.warning(f"Failed to connect to primary MongoDB: {str(e)}")
        logger.info(f"Trying fallback MongoDB connection at {fallback_uri}")
        
        try:
            # Try fallback URI
            _client = MongoClient(fallback_uri, **options)
            # Ping to verify connection
            _client.admin.command('ping')
            _db = _client.get_database()
            logger.info("Successfully connected to MongoDB using fallback port")
            
            # Update config with successful port for future use
            fallback_port = config.get('MONGODB_FALLBACK_PORT', '27017')
            os.environ['MONGODB_PORT'] = fallback_port
            
            return {"client": _client, "db": _db}
        
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to fallback MongoDB: {str(e)}")
            logger.error("Could not establish MongoDB connection")
            _client = None
            _db = None
            return {"client": None, "db": None}

def get_db() -> Optional[Database]:
    """
    Get the MongoDB database instance.
    
    Returns:
        MongoDB database or None if not connected
    """
    return _db

def get_collection(collection_name: str) -> Optional[pymongo.collection.Collection]:
    """
    Get a MongoDB collection.
    
    Args:
        collection_name: Name of the collection
        
    Returns:
        MongoDB collection or None if not connected
    """
    if _db is not None:
        return _db[collection_name]
    return None

async def close_mongodb_connection() -> None:
    """
    Close the MongoDB connection.
    """
    global _client, _db
    
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")

def is_connected() -> bool:
    """
    Check if connected to MongoDB.
    
    Returns:
        True if connected, False otherwise
    """
    if _client is None or _db is None:
        return False
    
    try:
        # Verify connection is still active
        _client.admin.command('ping')
        return True
    except Exception:
        return False
