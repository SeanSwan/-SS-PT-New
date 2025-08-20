"""
PostgreSQL connection utilities for the Workout MCP Server.

This module provides functions for connecting to PostgreSQL and performing database operations.
Replaces the previous MongoDB implementation with PostgreSQL using SQLAlchemy.
"""

import os
import logging
from typing import Dict, List, Any, Optional, Union
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from .config import config

logger = logging.getLogger("workout_mcp_server.postgresql")

# PostgreSQL connection variables
_engine = None
_session_factory = None
_connection = None

def get_postgresql_uri() -> str:
    """
    Get the PostgreSQL connection URI.
    
    Returns:
        PostgreSQL connection URI
    """
    # Check for full DATABASE_URL first (production)
    database_url = config.get('DATABASE_URL')
    if database_url:
        return database_url
    
    # Fallback to individual components (development)
    host = config.get('PG_HOST', 'localhost')
    port = config.get('PG_PORT', '5432')
    db_name = config.get('PG_DATABASE', 'swanstudios')
    username = config.get('PG_USER', 'postgres')
    password = config.get('PG_PASSWORD', '')
    
    return f"postgresql://{username}:{password}@{host}:{port}/{db_name}"

async def connect_to_postgresql() -> Dict[str, Any]:
    """
    Connect to PostgreSQL using SQLAlchemy.
    
    Returns:
        Dict containing engine and session factory
    """
    global _engine, _session_factory, _connection
    
    # If already connected, return existing connection
    if _engine is not None and _session_factory is not None:
        return {"engine": _engine, "session_factory": _session_factory}
    
    # Get connection URI
    db_uri = get_postgresql_uri()
    
    logger.info("Connecting to PostgreSQL database...")
    
    try:
        # Create SQLAlchemy engine
        _engine = create_engine(
            db_uri,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=3600,
            echo=False  # Set to True for SQL debugging
        )
        
        # Test connection
        with _engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        
        # Create session factory
        _session_factory = sessionmaker(bind=_engine)
        
        logger.info("Successfully connected to PostgreSQL database")
        return {"engine": _engine, "session_factory": _session_factory}
    
    except SQLAlchemyError as e:
        logger.error(f"Failed to connect to PostgreSQL: {str(e)}")
        _engine = None
        _session_factory = None
        return {"engine": None, "session_factory": None}

def get_engine():
    """
    Get the SQLAlchemy engine instance.
    
    Returns:
        SQLAlchemy engine or None if not connected
    """
    return _engine

def get_session():
    """
    Get a new database session.
    
    Returns:
        SQLAlchemy session or None if not connected
    """
    if _session_factory is not None:
        return _session_factory()
    return None

async def execute_query(query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Execute a raw SQL query and return results.
    
    Args:
        query: SQL query string
        params: Query parameters
        
    Returns:
        List of result dictionaries
    """
    if _engine is None:
        logger.error("Database not connected")
        return []
    
    try:
        with _engine.connect() as conn:
            if params:
                result = conn.execute(text(query), params)
            else:
                result = conn.execute(text(query))
            
            # Convert result to list of dictionaries
            columns = result.keys()
            rows = result.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
    
    except SQLAlchemyError as e:
        logger.error(f"Query execution failed: {str(e)}")
        return []

async def execute_insert(table: str, data: Dict[str, Any]) -> Optional[int]:
    """
    Execute an INSERT query and return the inserted ID.
    
    Args:
        table: Table name
        data: Data to insert
        
    Returns:
        Inserted record ID or None if failed
    """
    if _engine is None:
        logger.error("Database not connected")
        return None
    
    try:
        columns = ', '.join(data.keys())
        placeholders = ', '.join([f":{key}" for key in data.keys()])
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) RETURNING id"
        
        with _engine.connect() as conn:
            result = conn.execute(text(query), data)
            conn.commit()
            
            inserted_id = result.scalar()
            return inserted_id
    
    except SQLAlchemyError as e:
        logger.error(f"Insert failed: {str(e)}")
        return None

async def execute_update(table: str, data: Dict[str, Any], where_clause: str, where_params: Dict[str, Any] = None) -> bool:
    """
    Execute an UPDATE query.
    
    Args:
        table: Table name
        data: Data to update
        where_clause: WHERE clause (without WHERE keyword)
        where_params: Parameters for WHERE clause
        
    Returns:
        True if successful, False otherwise
    """
    if _engine is None:
        logger.error("Database not connected")
        return False
    
    try:
        set_clause = ', '.join([f"{key} = :{key}" for key in data.keys()])
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        
        # Combine data and where parameters
        all_params = {**data}
        if where_params:
            all_params.update(where_params)
        
        with _engine.connect() as conn:
            conn.execute(text(query), all_params)
            conn.commit()
            
        return True
    
    except SQLAlchemyError as e:
        logger.error(f"Update failed: {str(e)}")
        return False

async def close_postgresql_connection() -> None:
    """
    Close the PostgreSQL connection.
    """
    global _engine, _session_factory, _connection
    
    if _engine is not None:
        _engine.dispose()
        _engine = None
        _session_factory = None
        _connection = None
        logger.info("PostgreSQL connection closed")

def is_connected() -> bool:
    """
    Check if connected to PostgreSQL.
    
    Returns:
        True if connected, False otherwise
    """
    if _engine is None:
        return False
    
    try:
        # Test connection
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

# Legacy compatibility functions (for easier migration from MongoDB)
async def get_workouts_for_user(user_id: int) -> List[Dict[str, Any]]:
    """
    Get all workout sessions for a specific user.
    
    Args:
        user_id: User ID
        
    Returns:
        List of workout sessions
    """
    query = """
        SELECT ws.*, u.firstName, u.lastName 
        FROM "Sessions" ws 
        JOIN "Users" u ON ws."userId" = u.id 
        WHERE ws."userId" = :user_id 
        ORDER BY ws."createdAt" DESC
    """
    return await execute_query(query, {"user_id": user_id})

async def get_exercises() -> List[Dict[str, Any]]:
    """
    Get all available exercises.
    
    Returns:
        List of exercises
    """
    query = 'SELECT * FROM "Exercises" ORDER BY name'
    return await execute_query(query)

async def create_workout_session(user_id: int, workout_data: Dict[str, Any]) -> Optional[int]:
    """
    Create a new workout session.
    
    Args:
        user_id: User ID
        workout_data: Workout session data
        
    Returns:
        Created session ID or None if failed
    """
    workout_data['userId'] = user_id
    return await execute_insert('Sessions', workout_data)

async def update_workout_session(session_id: int, update_data: Dict[str, Any]) -> bool:
    """
    Update an existing workout session.
    
    Args:
        session_id: Session ID
        update_data: Data to update
        
    Returns:
        True if successful, False otherwise
    """
    return await execute_update('Sessions', update_data, 'id = :session_id', {'session_id': session_id})
