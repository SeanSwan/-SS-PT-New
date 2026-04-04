# OpenClaw Remote Command Center
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: OpenClaw remote access, Telegram bot, Raspberry Pi

---

## OpenClaw Remote Command Center (PLANNED)
OpenClaw provides remote AI access via Telegram for gym-side workflow, site monitoring, and code operations.

### Hardware Options
| Option | Spec | Best For |
|--------|------|----------|
| **Raspberry Pi 4 (4GB)** | ARM, 4GB RAM, 5W power | Permanent always-on, ~$3/year electricity |
| **Potato Windows Laptop** | Any Windows 10/11, 4GB+ RAM | Quick start, use WSL2 or native Node.js |
| **VPS (Hostinger/etc)** | Cloud, $5-10/month | No hardware needed, always online |

- OpenClaw gateway uses ~300MB RAM — any of these options works
- Brain: Gemini 3.1 Pro (complex tasks) / Gemini 2.5 Flash (simple tasks) via API
- **NO local AI models needed** — all processing is cloud API calls
- Pi/laptop sits on home network, SSH tunnel from main dev PC for admin

### Network Architecture
```
Main Dev PC (source code, API keys, Claude Code)
    ↕ SSH Tunnel (admin only)
OpenClaw Host (Pi 4 / Laptop / VPS — NO source code, NO .env)
    ↕ HTTPS API calls
SwanStudios Backend (sswanstudios.com — privacy proxy layer)
    ↕ Telegram Bot API
Sean's Phone (Telegram — gym, travel, anywhere)
```

### Agents
| Agent | Brain | Channel | Use Case |
|-------|-------|---------|----------|
| Swan Coach | Gemini 3.1 Pro | Telegram | "Log my bench 225x8" from gym |
| Swan Ops | Gemini 2.5 Flash | Telegram | Site health monitoring, daily reports |
| Swan Village | Gemini 3.1 Pro | Telegram | "Run AI Village on staged changes" |
| Swan Onboard | Gemini 3.1 Pro | Telegram | Voice-dictate new client intake |

### Security Configuration
- **Tools Profile:** `coding` (not `full`)
- **Exec Security:** `ask` (requires approval for new tools)
- **Web UI:** localhost only (SSH tunnel for access)
- **Telegram:** user allowlist (Sean's account ONLY)
- **Firewall:** UFW enabled, only port 22 open
- **No ClawHub skills** — malware risk (12% of skills found malicious)
- **Red Lines:** Never access .env files, never rm -rf, never modify SSH/firewall, never store/log PII
- **Yellow Lines:** API calls to sswanstudios.com, creating cron jobs, reading git status
