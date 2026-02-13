"""
Configuration management for the Workout MCP Server.

This module handles loading and validating configuration from environment variables.
It provides a secure way to manage sensitive settings like API keys and database credentials.
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv

logger = logging.getLogger("workout_mcp_server.config")

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=str(env_path))
else:
    logger.warning(f".env file not found at {env_path}. Using environment variables only.")

class Config:
    """Configuration singleton for the Workout MCP Server."""
    
    # Default configuration values
    _defaults = {
        'PORT': '8000',
        'DEBUG': 'true',
        'LOG_LEVEL': 'info',
        'BACKEND_API_URL': 'http://localhost:10000/api',
        'API_TOKEN': '',
        'DB_HOST': 'localhost',
        'DB_PORT': '5432',
        'DB_NAME': 'workout',
        'DB_USER': '',
        'DB_PASSWORD': ''
    }
    
    # Singleton instance
    _instance = None
    
    # Configuration values
    _config: Dict[str, Any] = {}
    
    def __new__(cls):
        """Create or return the singleton instance."""
        if cls._instance is None:
            cls._instance = super(Config, cls).__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """Load configuration from environment variables."""
        for key, default in self._defaults.items():
            self._config[key] = os.environ.get(key, default)
        
        # Type conversions
        self._config['PORT'] = int(self._config['PORT'])
        self._config['DEBUG'] = self._config['DEBUG'].lower() == 'true'
        self._config['DB_PORT'] = int(self._config['DB_PORT'])
        
        # Log the configuration (excluding sensitive data)
        self._log_config()
    
    def _log_config(self):
        """Log the configuration, excluding sensitive data."""
        log_config = self._config.copy()
        
        # Mask sensitive data
        sensitive_keys = ['API_TOKEN', 'DB_PASSWORD']
        for key in sensitive_keys:
            if log_config.get(key):
                log_config[key] = '********'
        
        logger.info(f"Configuration loaded: {log_config}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value.
        
        Args:
            key: Configuration key
            default: Default value if key is not found
            
        Returns:
            Configuration value or default
        """
        return self._config.get(key, default)
    
    def get_db_uri(self) -> str:
        """
        Get the database connection URI.
        
        Returns:
            Database connection URI
        """
        host = self._config['DB_HOST']
        port = self._config['DB_PORT']
        name = self._config['DB_NAME']
        user = self._config['DB_USER']
        password = self._config['DB_PASSWORD']
        
        if not user or not password:
            raise ValueError("Database credentials not configured. Please set DB_USER and DB_PASSWORD environment variables.")
        
        return f"postgresql://{user}:{password}@{host}:{port}/{name}"
    
    def is_production(self) -> bool:
        """
        Check if the server is running in production mode.
        
        Returns:
            True if in production, False otherwise
        """
        return not self._config['DEBUG']
    
    def get_log_level(self) -> str:
        """
        Get the log level.
        
        Returns:
            Log level
        """
        return self._config['LOG_LEVEL'].upper()
    
    def get_backend_api_url(self) -> str:
        """
        Get the backend API URL.
        
        Returns:
            Backend API URL
        """
        return self._config['BACKEND_API_URL']
    
    def get_api_token(self) -> str:
        """
        Get the API token.
        
        Returns:
            API token
        """
        return self._config['API_TOKEN']
    
    def get_port(self) -> int:
        """
        Get the server port.
        
        Returns:
            Server port
        """
        return self._config['PORT']

# Export the singleton instance
config = Config()
