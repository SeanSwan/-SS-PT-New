"""
API client for making requests to the backend API.
"""

import logging
import requests
from typing import Dict, Optional

from fastapi import HTTPException, status
from .config import config

logger = logging.getLogger("gamification_mcp_server.api_client")

async def make_api_request(method: str, path: str, data: Optional[Dict] = None, token: Optional[str] = None):
    """
    Make a request to the backend API.
    
    Args:
        method: HTTP method (GET, POST, PUT, DELETE)
        path: API path (without base URL)
        data: Request data (for POST/PUT)
        token: Authentication token
        
    Returns:
        Response data as dict
    """
    # Get API configuration from the config module
    backend_api_url = config.get_backend_api_url()
    api_token = config.get_api_token()
    
    url = f"{backend_api_url}/{path.lstrip('/')}"
    headers = {
        'Content-Type': 'application/json'
    }
    
    if token or api_token:
        headers['Authorization'] = f"Bearer {token or api_token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=data or {})
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data or {})
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data or {})
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, json=data or {})
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                error_message = error_data.get('message', str(e))
            except:
                error_message = f"API error: {e.response.status_code} - {str(e)}"
        else:
            error_message = f"API connection error: {str(e)}"
        
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=error_message
        )
