#!/usr/bin/env python
"""
YOLO MCP Server Test Script
==========================

Simple test script to verify YOLO MCP server functionality.
Tests basic endpoints and WebSocket connectivity.
"""

import asyncio
import aiohttp
import json
import time
import sys
import logging
import base64
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Server configuration
SERVER_HOST = "localhost"
SERVER_PORT = 8002
BASE_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"
WS_URL = f"ws://{SERVER_HOST}:{SERVER_PORT}"

async def test_health_check():
    """Test the health check endpoint."""
    logger.info("Testing health check endpoint...")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Health check passed: {data}")
                    return True
                else:
                    logger.error(f"Health check failed with status {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return False

async def test_tools_endpoint():
    """Test the tools listing endpoint."""
    logger.info("Testing tools endpoint...")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/tools") as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Tools endpoint returned {len(data['tools'])} tools")
                    for tool in data['tools']:
                        logger.info(f"  - {tool['name']}: {tool['description']}")
                    return True
                else:
                    logger.error(f"Tools endpoint failed with status {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Tools endpoint error: {e}")
            return False

async def test_start_form_analysis():
    """Test starting a form analysis session."""
    logger.info("Testing StartFormAnalysis tool...")
    
    async with aiohttp.ClientSession() as session:
        try:
            payload = {
                "user_id": "test_user_123",
                "exercise_name": "squat"
            }
            
            async with session.post(
                f"{BASE_URL}/tools/StartFormAnalysis",
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    session_id = data.get("session_id")
                    logger.info(f"Analysis session started: {session_id}")
                    return session_id
                else:
                    logger.error(f"StartFormAnalysis failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return None
        except Exception as e:
            logger.error(f"StartFormAnalysis error: {e}")
            return None

async def test_get_real_time_feedback(session_id):
    """Test getting real-time feedback."""
    logger.info("Testing GetRealTimeFeedback tool...")
    
    async with aiohttp.ClientSession() as session:
        try:
            payload = {
                "session_id": session_id
            }
            
            async with session.post(
                f"{BASE_URL}/tools/GetRealTimeFeedback",
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Feedback retrieved: {data.get('message')}")
                    return True
                else:
                    logger.error(f"GetRealTimeFeedback failed with status {response.status}")
                    return False
        except Exception as e:
            logger.error(f"GetRealTimeFeedback error: {e}")
            return False

async def test_stop_form_analysis(session_id):
    """Test stopping a form analysis session."""
    logger.info("Testing StopFormAnalysis tool...")
    
    async with aiohttp.ClientSession() as session:
        try:
            payload = {
                "session_id": session_id
            }
            
            async with session.post(
                f"{BASE_URL}/tools/StopFormAnalysis",
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Analysis session stopped: {data.get('message')}")
                    return True
                else:
                    logger.error(f"StopFormAnalysis failed with status {response.status}")
                    return False
        except Exception as e:
            logger.error(f"StopFormAnalysis error: {e}")
            return False

async def test_websocket_connection(session_id):
    """Test WebSocket connection and frame processing."""
    logger.info("Testing WebSocket connection...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(
                f"{WS_URL}/ws/form-analysis/{session_id}"
            ) as ws:
                # Send a ping
                ping_message = {
                    "type": "ping",
                    "timestamp": str(time.time())
                }
                await ws.send_str(json.dumps(ping_message))
                
                # Simulate sending a frame (dummy data)
                # In a real test, you'd send actual base64 encoded image data
                frame_message = {
                    "type": "frame",
                    "data": "dummy_frame_data",  # Would be actual base64 image
                    "include_annotated": False
                }
                await ws.send_str(json.dumps(frame_message))
                
                # Wait for responses
                timeout = 5
                start_time = time.time()
                
                while time.time() - start_time < timeout:
                    try:
                        msg = await asyncio.wait_for(ws.receive(), timeout=1.0)
                        
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            if data.get("type") == "pong":
                                logger.info("Received pong response")
                            elif data.get("type") == "analysis":
                                logger.info("Received analysis response")
                            else:
                                logger.info(f"Received message: {data}")
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            logger.error(f"WebSocket error: {ws.exception()}")
                            return False
                        
                    except asyncio.TimeoutError:
                        continue
                
                logger.info("WebSocket test completed successfully")
                return True
                
    except Exception as e:
        logger.error(f"WebSocket test error: {e}")
        return False

async def run_tests():
    """Run all tests sequentially."""
    logger.info("Starting YOLO MCP Server tests...")
    
    tests_passed = 0
    tests_total = 0
    
    # Test 1: Health check
    tests_total += 1
    if await test_health_check():
        tests_passed += 1
    
    # Test 2: Tools endpoint
    tests_total += 1
    if await test_tools_endpoint():
        tests_passed += 1
    
    # Test 3: Start form analysis
    tests_total += 1
    session_id = await test_start_form_analysis()
    if session_id:
        tests_passed += 1
        
        # Test 4: Get real-time feedback (only if session started)
        tests_total += 1
        if await test_get_real_time_feedback(session_id):
            tests_passed += 1
        
        # Test 5: WebSocket connection (only if session started)
        tests_total += 1
        if await test_websocket_connection(session_id):
            tests_passed += 1
        
        # Test 6: Stop form analysis
        tests_total += 1
        if await test_stop_form_analysis(session_id):
            tests_passed += 1
    else:
        # Skip dependent tests if session couldn't be created
        tests_total += 3
    
    # Summary
    logger.info(f"\nTest Summary: {tests_passed}/{tests_total} tests passed")
    
    if tests_passed == tests_total:
        logger.info("All tests passed! ✅")
        return True
    else:
        logger.error(f"{tests_total - tests_passed} tests failed! ❌")
        return False

async def main():
    """Main test runner."""
    try:
        success = await run_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test runner error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
