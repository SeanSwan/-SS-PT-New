# SwanStudios AI/MCP Integration Guide

## 🚀 Overview

SwanStudios now features an advanced AI-powered system built on MCP (Model Context Protocol) architecture. This guide covers the integration, setup, and usage of AI features.

## 🏗️ Architecture

### MCP Servers
- **Workout MCP Server** (Port 8000): AI-powered workout generation
- **Gamification MCP Server** (Port 8002): Dynamic gamification features
- **Future MCP Servers**: YOLO AI (8001), Food Scanner (8003)

### Backend Integration
- `/api/mcp/*` routes bridge frontend with MCP servers
- Authentication middleware ensures secure access
- Comprehensive error handling and logging

### Frontend Features
- **AI Features Dashboard**: Central hub for all AI functionality
- **Real-time MCP Status**: Monitor server health
- **Workout Generator**: Advanced AI workout creation
- **Progress Analysis**: AI-powered client insights
- **Nutrition AI**: Smart meal planning
- **Exercise Alternatives**: Intelligent substitutions

## 📦 Installation & Setup

### 1. Environment Configuration

**Backend (.env)**
```env
# MCP Configuration
WORKOUT_MCP_URL=http://localhost:8000
WORKOUT_MCP_ENABLED=true
GAMIFICATION_MCP_URL=http://localhost:8002
GAMIFICATION_MCP_ENABLED=true
```

**Frontend (.env.local)**
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_MCP_SERVER_URL=http://localhost:5000/api/mcp
VITE_ENABLE_AI_FEATURES=true
```

### 2. Start MCP Servers

```bash
# Start Workout MCP Server
cd backend/mcp_server
python workout_mcp_server.py

# Start Gamification MCP Server (in another terminal)
python start_gamification_server.py
```

### 3. Backend Server

```bash
cd backend
npm install
npm start
```

### 4. Frontend Application

```bash
cd frontend
npm install
npm run dev
```

## 🔧 API Endpoints

### MCP Integration Routes

#### Status Check
```
GET /api/mcp/status
```
Returns the status of all MCP servers.

#### Workout Generation
```
POST /api/mcp/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "modelName": "claude-3-5-sonnet",
  "temperature": 0.7,
  "maxTokens": 4000,
  "systemPrompt": "...",
  "humanMessage": "...",
  "mcpContext": { ... }
}
```

#### Progress Analysis
```
POST /api/mcp/analyze
Authorization: Bearer <token>
```

#### Exercise Alternatives
```
POST /api/mcp/alternatives
Authorization: Bearer <token>
```

#### Nutrition Planning
```
POST /api/mcp/nutrition
Authorization: Bearer <token>
```

#### Gamification Actions
```
POST /api/mcp/gamification/:action
Authorization: Bearer <token>
```

## 🎯 Usage Examples

### Accessing AI Features

1. **Navigate to AI Dashboard**
   - Login as trainer or admin
   - Go to Dashboard → AI Features
   - Monitor MCP server status

2. **Generate Workout Plan**
   - Click "AI Workout Generator"
   - Select focus areas and parameters
   - Configure equipment preferences
   - Generate personalized plan

3. **Analyze Progress**
   - Select client in dashboard
   - Click "Progress Analytics"
   - Review AI-generated insights

## 🔒 Security & Authentication

- All MCP routes require authentication
- JWT tokens validate user access
- Role-based permissions apply
- Request logging for audit trails

## 📊 Monitoring & Health Checks

### MCP Health Endpoint
```
GET /api/mcp/health
```

### Status Dashboard
- Real-time server monitoring
- Auto-refresh capabilities
- Health percentage indicators
- Error reporting

## 🛠️ Troubleshooting

### Common Issues

**1. MCP Server Offline**
- Check if MCP servers are running
- Verify port availability (8000, 8002)
- Review server logs for errors

**2. Connection Refused**
- Confirm MCP_URL environment variables
- Check firewall settings
- Verify backend server is running

**3. Authentication Errors**
- Ensure valid JWT token
- Check token expiration
- Verify user permissions

### Debug Mode

Enable debug logging in development:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 🔄 Development Workflow

### Adding New AI Features

1. **Create MCP Server**
   - Implement MCP protocol
   - Add health check endpoint
   - Configure in server list

2. **Backend Integration**
   - Add route in mcpRoutes.mjs
   - Implement authentication
   - Add error handling

3. **Frontend Component**
   - Create feature component
   - Add to AI Features Dashboard
   - Implement UI/UX

4. **Testing**
   - Unit tests for routes
   - Integration tests
   - UI testing

## 📈 Performance Optimization

### Caching Strategy
- Implement response caching
- Use Redis for session storage
- Cache frequent MCP requests

### Load Balancing
- Multiple MCP server instances
- Health-based routing
- Failover mechanisms

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
WORKOUT_MCP_URL=https://workout-mcp.yourdomain.com
GAMIFICATION_MCP_URL=https://gamification-mcp.yourdomain.com
```

### Docker Configuration
```dockerfile
# MCP Server
FROM python:3.9
COPY mcp_server/ /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "workout_mcp_server.py"]
```

### Scaling Considerations
- Horizontal scaling for MCP servers
- Load balancer configuration
- Database optimization
- CDN for static assets

## 📁 File Structure

```
backend/
├── routes/
│   └── mcpRoutes.mjs        # MCP integration routes
├── mcp_server/              # MCP server implementations
│   ├── workout_mcp_server/
│   ├── gamification_mcp_server/
│   └── ...

frontend/
├── components/
│   ├── AIFeaturesDashboard/  # AI features hub
│   ├── WorkoutGenerator/     # AI workout generation
│   └── ...
```

## 🔮 Future Enhancements

### Planned Features
- YOLO AI form analysis
- Real-time coaching
- Voice-activated AI
- Multi-language support
- Advanced analytics dashboard

### Roadmap
- Q2 2024: YOLO AI integration
- Q3 2024: Voice AI assistant
- Q4 2024: Predictive health insights

## 📞 Support

For technical support or questions about AI features:
- Check the troubleshooting section
- Review server logs
- Contact development team
- Open GitHub issue

---

**Note**: This is a living document. Update as new AI features are added or architecture changes.