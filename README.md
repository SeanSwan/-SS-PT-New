# MCP Server Implementations

**Status:** 🔴 **NOT IMPLEMENTED**

This directory is intended to hold the Node.js-based MCP (Model Context Protocol) microservices. As of 2025-11-13, these servers are missing, causing a critical infrastructure failure.

## Required Servers

The following Express.js servers need to be created in this directory, as per the incident report:

- `workout-server.mjs` (Port 8000)
- `gamification-server.mjs` (Port 8002)
- `nutrition-server.mjs` (Port 8003)
- `alternatives-server.mjs` (Port 8004)
- `yolo-server.mjs` (Port 8005)

## Template

Use the following template for each server:

```javascript
import express from 'express';
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```