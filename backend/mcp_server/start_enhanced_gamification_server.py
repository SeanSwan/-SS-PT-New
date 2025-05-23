#!/usr/bin/env python3
"""
Enhanced Gamification MCP Server Launcher
Ensures the enhanced gamification server starts properly with good logging
"""

import os
import sys
import subprocess
import time
import signal
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("enhanced_gamification_launcher")

def main():
    # Get the directory of this script
    script_dir = Path(__file__).parent
    
    # Path to the enhanced gamification MCP server
    enhanced_server_path = script_dir / "enhanced_gamification_mcp" / "enhanced_gamification_mcp_server.py"
    
    # Check if the server file exists
    if not enhanced_server_path.exists():
        logger.error(f"Enhanced gamification server not found at: {enhanced_server_path}")
        logger.error("Please ensure the server is properly installed.")
        sys.exit(1)
    
    logger.info("🎮 Starting Enhanced Gamification MCP Server...")
    logger.info(f"Server location: {enhanced_server_path}")
    
    # Change to the server directory
    server_dir = enhanced_server_path.parent
    os.chdir(server_dir)
    
    # Check for requirements
    requirements_file = server_dir / "requirements.txt"
    if requirements_file.exists():
        logger.info("Checking Python dependencies...")
        # Optionally check if dependencies are installed
    
    # Set environment variables
    env = os.environ.copy()
    env['PORT'] = env.get('PORT', '8002')
    env['PYTHONPATH'] = str(server_dir)
    
    # Start the server
    try:
        logger.info(f"Starting server on port {env['PORT']}...")
        
        # Use python executable from current environment
        python_cmd = sys.executable
        
        process = subprocess.Popen(
            [python_cmd, str(enhanced_server_path)],
            cwd=server_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Set up signal handler for graceful shutdown
        def signal_handler(signum, frame):
            logger.info("Received shutdown signal, stopping server...")
            process.terminate()
            process.wait()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Monitor the process and show output
        startup_time = time.time()
        startup_timeout = 30  # 30 seconds
        server_ready = False
        
        while True:
            output = process.stdout.readline()
            if output:
                print(output.rstrip())
                
                # Check if server is ready
                if "Uvicorn running on" in output:
                    server_ready = True
                    logger.info("✅ Enhanced Gamification MCP Server is ready!")
                    logger.info("📡 Server running at http://localhost:8002")
                    logger.info("🔍 Health check: http://localhost:8002/health")
                    logger.info("🛠️  Available tools: http://localhost:8002/tools")
            
            # Check if process is still running
            if process.poll() is not None:
                if server_ready:
                    logger.error("❌ Server process terminated unexpectedly")
                else:
                    logger.error("❌ Server failed to start")
                break
            
            # Check startup timeout
            if not server_ready and (time.time() - startup_time) > startup_timeout:
                logger.error(f"❌ Server failed to start within {startup_timeout} seconds")
                process.terminate()
                break
            
            time.sleep(0.1)
        
        return_code = process.wait()
        logger.info(f"Server process exited with code: {return_code}")
        sys.exit(return_code)
        
    except Exception as e:
        logger.error(f"Error starting enhanced gamification server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
