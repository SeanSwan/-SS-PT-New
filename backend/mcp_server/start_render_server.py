import uvicorn
import os

if __name__ == "__main__":
    # Set default port if not already set
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("render_mcp_server.main:app", host="0.0.0.0", port=port, reload=True)
