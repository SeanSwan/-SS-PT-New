#!/usr/bin/env python3
"""
MCP Workout Server Diagnostic Script

This script diagnoses common issues with the MCP Workout Server:
- Checks if Python and dependencies are properly installed
- Verifies port availability
- Tests MongoDB connection
- Starts the server with detailed logging
- Performs health checks

Usage:
    python mcp_diagnostic.py
"""

import sys
import socket
import subprocess
import time
import requests
import os
from pathlib import Path

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def check_python_version():
    """Check Python version compatibility"""
    print_section("PYTHON VERSION CHECK")
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version >= (3, 9):
        print("✓ Python version is compatible")
        return True
    else:
        print("✗ Python 3.9+ required")
        return False

def check_port_availability(port=8000):
    """Check if the specified port is available"""
    print_section(f"PORT {port} AVAILABILITY CHECK")
    
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(('localhost', port))
            print(f"✓ Port {port} is available")
            return True
        except socket.error as e:
            print(f"✗ Port {port} is in use: {e}")
            
            # Try to find what's using the port
            try:
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    if f':{port}' in line and 'LISTENING' in line:
                        print(f"  Process using port: {line.strip()}")
            except:
                pass
            return False

def check_dependencies():
    """Check if required Python packages are installed"""
    print_section("DEPENDENCY CHECK")
    
    required_packages = [
        'fastapi',
        'uvicorn',
        'pymongo',
        'python-dotenv',
        'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package} is installed")
        except ImportError:
            print(f"✗ {package} is missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\nMissing packages: {', '.join(missing_packages)}")
        print("Run: pip install " + " ".join(missing_packages))
        return False
    
    return True

def check_mcp_server_files():
    """Check if MCP server files exist"""
    print_section("MCP SERVER FILES CHECK")
    
    base_path = Path(__file__).parent / "backend" / "mcp_server" / "workout_mcp_server"
    
    required_files = [
        "main.py",
        ".env",
        "utils/config.py",
        "routes/tools.py"
    ]
    
    all_exist = True
    
    for file_path in required_files:
        full_path = base_path / file_path
        if full_path.exists():
            print(f"✓ {file_path} exists")
        else:
            print(f"✗ {file_path} missing")
            all_exist = False
    
    return all_exist

def test_mongodb_connection():
    """Test MongoDB connection"""
    print_section("MONGODB CONNECTION TEST")
    
    try:
        import pymongo
        
        # Try multiple common MongoDB ports
        ports = [5001, 27017]
        
        for port in ports:
            try:
                client = pymongo.MongoClient(f'mongodb://localhost:{port}', serverSelectionTimeoutMS=2000)
                client.admin.command('ping')
                print(f"✓ MongoDB is running on port {port}")
                client.close()
                return True
            except pymongo.errors.ServerSelectionTimeoutError:
                print(f"✗ MongoDB not responding on port {port}")
                continue
        
        print("✗ MongoDB is not accessible on any tested port")
        return False
        
    except ImportError:
        print("✗ pymongo not installed")
        return False

def start_mcp_server():
    """Start the MCP server with logging"""
    print_section("STARTING MCP SERVER")
    
    server_path = Path(__file__).parent / "backend" / "mcp_server" / "workout_mcp_server" / "main.py"
    
    if not server_path.exists():
        print(f"✗ Server file not found: {server_path}")
        return None
    
    print("Starting MCP server...")
    
    # Set environment variables
    env = os.environ.copy()
    env['DEBUG'] = 'true'
    env['LOG_LEVEL'] = 'debug'
    env['PORT'] = '8000'
    
    try:
        # Start the server in a subprocess
        process = subprocess.Popen(
            [sys.executable, str(server_path)],
            cwd=str(server_path.parent),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # Give the server time to start
        print("Waiting for server to start...")
        time.sleep(5)
        
        # Check if process is still running
        if process.poll() is None:
            print("✓ Server process is running")
            return process
        else:
            print("✗ Server process terminated")
            # Print any output from the failed startup
            output, _ = process.communicate()
            print("Server output:")
            print(output)
            return None
            
    except Exception as e:
        print(f"✗ Failed to start server: {e}")
        return None

def test_health_endpoint(max_retries=5):
    """Test the health endpoint"""
    print_section("HEALTH ENDPOINT TEST")
    
    url = "http://localhost:8000/health"
    
    for i in range(max_retries):
        try:
            print(f"Attempt {i+1}/{max_retries}...")
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                print("✓ Health endpoint is responding")
                health_data = response.json()
                print(f"Health data: {health_data}")
                return True
            else:
                print(f"✗ Health endpoint returned status {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"✗ Connection refused (attempt {i+1})")
        except requests.exceptions.Timeout:
            print(f"✗ Request timeout (attempt {i+1})")
        except Exception as e:
            print(f"✗ Unexpected error: {e}")
        
        if i < max_retries - 1:
            time.sleep(2)
    
    return False

def main():
    """Main diagnostic routine"""
    print("MCP WORKOUT SERVER DIAGNOSTIC")
    print("="*60)
    
    # Run all checks
    checks_passed = 0
    total_checks = 5
    
    if check_python_version():
        checks_passed += 1
    
    if check_port_availability():
        checks_passed += 1
    
    if check_dependencies():
        checks_passed += 1
    
    if check_mcp_server_files():
        checks_passed += 1
    
    if test_mongodb_connection():
        checks_passed += 1
    
    print_section("DIAGNOSTIC SUMMARY")
    print(f"Checks passed: {checks_passed}/{total_checks}")
    
    if checks_passed == total_checks:
        print("✓ All checks passed - attempting to start server")
        
        # Try to start the server
        server_process = start_mcp_server()
        
        if server_process:
            # Test the health endpoint
            if test_health_endpoint():
                print_section("SUCCESS")
                print("✓ MCP Workout Server is running correctly!")
                print("✓ Server is accessible at http://localhost:8000")
                print("✓ You can now use the frontend application")
                
                # Keep the server running
                print("\nServer is running. Press Ctrl+C to stop...")
                try:
                    server_process.wait()
                except KeyboardInterrupt:
                    print("\nStopping server...")
                    server_process.terminate()
                    server_process.wait()
            else:
                print_section("PARTIAL SUCCESS")
                print("Server started but health check failed")
                if server_process:
                    server_process.terminate()
        
    else:
        print_section("FAILED")
        print("✗ Some checks failed - please resolve the issues above")
        
        if checks_passed >= 3:
            print("\nYou may still try to start the server manually:")
            print("cd backend/mcp_server")
            print("python start_workout_server.py --debug")

if __name__ == "__main__":
    main()
