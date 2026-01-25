# SwanStudios Laptop Setup Guide

**Last Updated:** 2026-01-25
**Purpose:** Replicate the full development environment on a new machine

---

## Prerequisites

### 1. Install Required Software
- [ ] **Git** - https://git-scm.com/download/win
- [ ] **Node.js 18+** - https://nodejs.org/
- [ ] **Python 3.12+** - https://www.python.org/downloads/
- [ ] **VS Code** - https://code.visualstudio.com/

### 2. Install VS Code Extensions
- [ ] **Roo Code** (rooveterinaryinc.roo-cline)
- [ ] **Claude Code** (Anthropic's official extension)
- [ ] **Python** (ms-python.python)
- [ ] **ESLint** (dbaeumer.vscode-eslint)
- [ ] **Prettier** (esbenp.prettier-vscode)

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/SeanSwan/-SS-PT-New.git SS-PT
cd SS-PT
```

---

## Step 2: Install Node.js Dependencies

```bash
# Frontend
npm install

# Backend (if separate)
cd backend
npm install
cd ..
```

---

## Step 3: Install Python Dependencies for MCP Server

```bash
# Install Python packages globally (or use venv)
pip install mcp httpx python-dotenv pydantic fastapi uvicorn
```

---

## Step 4: Configure Render MCP Server

### 4.1 Create the .env file
Create `backend/mcp_server/render_mcp_server/.env`:
```
RENDER_API_KEY=rnd_YOUR_RENDER_API_KEY_HERE
```

### 4.2 Configure Roo Code MCP Settings
1. Open VS Code
2. Open Roo Code sidebar
3. Go to MCP Servers settings
4. Edit the JSON configuration:

```json
{
  "mcpServers": {
    "render": {
      "command": "python",
      "args": ["C:/PATH/TO/SS-PT/backend/mcp_server/render_mcp_server/main.py"],
      "env": {
        "PYTHONPATH": "C:/Users/YOUR_USERNAME/AppData/Roaming/Python/Python312/site-packages"
      }
    }
  }
}
```

**Important:** Update the paths to match your laptop's file locations!

### 4.3 Verify MCP Connection
1. Click "Retry Connection" in Roo Code
2. You should see 6 tools:
   - render_list_services
   - render_get_service
   - render_list_deploys
   - render_get_deploy
   - render_list_env_vars
   - render_get_events

---

## Step 5: Configure OpenRouter for Roo Code

1. Get your OpenRouter API key from https://openrouter.ai/keys
2. In Roo Code settings, set the API key
3. Select model: `google/gemini-2.5-flash` (for MCP/tool use)

---

## Step 6: Open the Workspace

Double-click `SS-PT.code-workspace` or:
```
code SS-PT.code-workspace
```

---

## API Keys Needed

| Service | Where to Get | Where to Store |
|---------|--------------|----------------|
| Render | https://dashboard.render.com/u/settings/api-keys | `backend/mcp_server/render_mcp_server/.env` |
| OpenRouter | https://openrouter.ai/keys | Roo Code settings |
| Claude | Anthropic Pro subscription | Claude Code extension |

---

## Troubleshooting

### MCP Connection Issues
1. Check Python is in PATH: `python --version`
2. Verify MCP packages installed: `pip list | grep mcp`
3. Check .env file has correct API key
4. Use full absolute paths in mcp_settings.json

### "No tools available" Error
- Make sure Python packages are installed in the correct location
- Add PYTHONPATH to mcp_settings.json env

### DeepSeek 404 Tool Error
- DeepSeek Free doesn't support tool use
- Switch to `google/gemini-2.5-flash` for MCP tasks

---

## Quick Reference

### Model Selection (Roo Code)
| Task | Model |
|------|-------|
| General coding | `deepseek/deepseek-v3:free` |
| MCP/Tool use | `google/gemini-2.5-flash` |
| React/Frontend | `google/gemini-2.5-flash` |

### Key Files
| Purpose | Path |
|---------|------|
| Workspace | `SS-PT.code-workspace` |
| AI Rules | `.clinerules` |
| Render MCP | `backend/mcp_server/render_mcp_server/main.py` |
| Model Strategy | `AI-Village-Documentation/ROO-CODE-OPENROUTER-MODEL-STRATEGY.md` |

---

**You're all set!** 🚀
