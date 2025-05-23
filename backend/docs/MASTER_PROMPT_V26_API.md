# Master Prompt v26 API Documentation

## 🚀 Overview

Master Prompt v26 provides a comprehensive suite of ethical AI, accessibility, gamification, MCP monitoring, and privacy features. All endpoints are designed with accessibility-first principles and privacy compliance built-in.

## 🔗 Base URL

```
/api/master-prompt
```

## 📋 Core Features

### 1. System Management

#### GET /status
Get Master Prompt v26 system status
- **Access**: Public
- **Response**: System status, version, and feature availability

#### GET /health
Comprehensive system health check
- **Access**: Admin only
- **Response**: Detailed health status of all systems

#### GET /report
Generate comprehensive integration report
- **Access**: Admin only
- **Response**: Full system report with metrics and recommendations

#### POST /initialize
Initialize Master Prompt v26 systems
- **Access**: Admin only
- **Response**: Initialization results for all systems

#### GET /features
Get available Master Prompt features
- **Access**: Private
- **Response**: List of all features and their capabilities

#### GET /metrics
Get system metrics summary
- **Access**: Admin/Trainer only
- **Response**: Performance and health metrics

#### GET /compliance
Get ethical and accessibility compliance status
- **Access**: Private
- **Response**: Compliance scores for GDPR, CCPA, WCAG

---

## 🤖 Ethical AI Routes

### Base: `/api/master-prompt/ethical-ai`

#### POST /review-workout
Review workout generation for ethical compliance
- **Access**: Private
- **Body**: `{ workoutPlan: {}, clientProfile: {} }`
- **Response**: Ethical review results with bias detection

#### POST /review-nutrition
Review nutrition plan for ethical compliance
- **Access**: Private
- **Body**: `{ nutritionPlan: {}, clientProfile: {} }`
- **Response**: Ethical review with inclusive language checks

#### POST /run-pipeline
Run comprehensive ethical AI pipeline
- **Access**: Admin only
- **Body**: `{ config: {} }`
- **Response**: Pipeline execution results with recommendations

#### GET /pipeline-config
Get ethical AI pipeline configuration
- **Access**: Admin only
- **Response**: Available pipeline stages and CI/CD templates

#### POST /generate-pipeline
Generate CI/CD pipeline for ethical AI
- **Access**: Admin only
- **Body**: `{ platform: "github|gitlab|azure", outputPath?: string }`
- **Response**: Generated pipeline configuration files

---

## ♿ Accessibility Routes

### Base: `/api/master-prompt/accessibility`

#### POST /test-feature
Run accessibility test for specific feature
- **Access**: Private
- **Body**: `{ featureName: string, options?: {} }`
- **Response**: WCAG 2.1 AA compliance test results

#### GET /report
Generate comprehensive accessibility report
- **Access**: Private
- **Query**: `?feature=optional`
- **Response**: Accessibility audit with scores and recommendations

#### POST /validate-compliance
Validate accessibility compliance for CI/CD
- **Access**: Admin only
- **Body**: `{ featureName: string, options?: {} }`
- **Response**: Compliance validation results

#### GET /test-config
Get accessibility testing configuration
- **Access**: Private
- **Response**: Test configurations and compliance matrix

#### POST /save-config
Save accessibility test configuration files
- **Access**: Admin only
- **Body**: `{ outputDir?: string }`
- **Response**: Generated test files and configurations

#### GET /user-permissions
Get user permissions with accessibility context
- **Access**: Private
- **Response**: Role-based permissions with accessibility features

#### POST /check-permission
Check specific permission with accessibility context
- **Access**: Private
- **Body**: `{ feature: string }`
- **Response**: Permission status with accessibility-aware errors

---

## 🎮 Gamification Routes

### Base: `/api/master-prompt/gamification`

#### GET /status
Get user's gamification status and progress
- **Access**: Private
- **Response**: Points, level, achievements, and streaks

#### POST /award-points
Award points for specific actions (internal use)
- **Access**: Admin/System only
- **Body**: `{ userId: string, points: number, action: string, metadata?: {} }`
- **Response**: Updated user gamification status

#### GET /achievements
Get available and earned achievements
- **Access**: Private
- **Response**: Achievement progress and earned badges

#### GET /leaderboard
Get leaderboard with privacy options
- **Access**: Private
- **Query**: `?timeframe=weekly&category=overall&limit=10`
- **Response**: Leaderboard data with user rank

#### POST /check-ethical-compliance
Run ethical gamification compliance check
- **Access**: Admin only
- **Body**: `{ userId: string, feature: string }`
- **Response**: Ethical compliance analysis

#### GET /engagement-metrics
Get engagement metrics for analysis
- **Access**: Admin/Trainer only
- **Query**: `?timeframe=30d&segment=optional`
- **Response**: Engagement analytics and patterns

#### POST /configure-rules
Configure gamification rules and thresholds
- **Access**: Admin only
- **Body**: `{ rules: {}, ethicalConstraints?: {} }`
- **Response**: Updated rules with ethical validation

#### POST /process-action
Process user action for gamification
- **Access**: Private
- **Body**: `{ action: string, metadata?: {} }`
- **Response**: Gamification updates with ethical checks

#### GET /health-check
Check gamification system health
- **Access**: Admin only
- **Response**: System health and ethical compliance status

---

## 🔧 MCP-Centric Routes

### Base: `/api/master-prompt/mcp`

#### GET /servers
Get all registered MCP servers and status
- **Access**: Admin only
- **Response**: Complete server list with health metrics

#### GET /server/:name
Get detailed information about specific MCP server
- **Access**: Admin only
- **Query**: `?timeframe=24h`
- **Response**: Server details, metrics, and health history

#### POST /server/:name/health-check
Trigger manual health check for MCP server
- **Access**: Admin only
- **Body**: `{ comprehensive?: boolean }`
- **Response**: Health check results

#### GET /metrics/summary
Get aggregated metrics across all MCP servers
- **Access**: Admin only
- **Query**: `?timeframe=1h`
- **Response**: System-wide performance metrics

#### GET /tools
Get all available MCP tools across servers
- **Access**: Private
- **Query**: `?category=optional&server=optional`
- **Response**: Available tools and capabilities

#### POST /tool/:toolName/invoke
Invoke specific MCP tool
- **Access**: Private
- **Body**: `{ serverName: string, args?: {} }`
- **Response**: Tool execution results

#### POST /server/:name/restart
Restart specific MCP server
- **Access**: Admin only
- **Body**: `{ force?: boolean }`
- **Response**: Restart operation results

#### POST /server/register
Register new MCP server
- **Access**: Admin only
- **Body**: `{ name: string, config: {}, autoStart?: boolean }`
- **Response**: Registration confirmation

#### DELETE /server/:name
Unregister MCP server
- **Access**: Admin only
- **Body**: `{ gracefulShutdown?: boolean }`
- **Response**: Unregistration confirmation

#### GET /cost-analysis
Get cost analysis across MCP servers
- **Access**: Admin only
- **Query**: `?timeframe=7d&breakdown=true`
- **Response**: Cost analysis and projections

#### GET /system-overview
Get comprehensive MCP system overview
- **Access**: Admin only
- **Response**: Complete system status and metrics

---

## 🔒 Privacy Routes

### Base: `/api/master-prompt/privacy`

#### GET /status
Get privacy and PII protection status
- **Access**: Private
- **Response**: Personal privacy status and compliance

#### POST /scan-pii
Scan content for PII and get recommendations
- **Access**: Admin only
- **Body**: `{ content: string, context?: string }`
- **Response**: PII detection results with recommendations

#### POST /sanitize
Sanitize content by removing/masking PII
- **Access**: Admin/System only
- **Body**: `{ content: string, method?: "mask", preserveFormat?: boolean }`
- **Response**: Sanitized content with change log

#### GET /user-data/:userId
Get user's data inventory for compliance
- **Access**: Admin/User Self only
- **Response**: Complete data inventory by category

#### POST /export-data
Export user data for GDPR compliance
- **Access**: User Self only
- **Body**: `{ format?: "json", includeMetadata?: boolean }`
- **Response**: Data export with download link

#### DELETE /delete-user-data
Delete user data (Right to be forgotten)
- **Access**: User Self/Admin only
- **Body**: `{ userId?: string, confirmToken: string, retentionOverride?: boolean }`
- **Response**: Deletion confirmation with certificate

#### GET /consent-status
Get user's consent status for data processing
- **Access**: Private
- **Response**: Detailed consent preferences

#### POST /update-consent
Update user's consent preferences
- **Access**: Private
- **Body**: `{ consents: {} }`
- **Response**: Updated consent status

#### GET /audit-log
Get privacy-related audit log
- **Access**: Admin/User Self only
- **Query**: `?timeframe=30d&userId=optional&action=optional`
- **Response**: Privacy audit trail

#### GET /compliance-report
Generate privacy compliance report
- **Access**: Admin only
- **Query**: `?timeframe=30d&detailed=false`
- **Response**: Comprehensive compliance report

#### POST /data-minimization
Run data minimization process
- **Access**: Admin only
- **Body**: `{ dryRun?: false, categories?: [] }`
- **Response**: Data minimization results

---

## 🔐 Authentication & Permissions

### Permission Levels
- **Public**: No authentication required
- **Private**: Requires valid user session
- **User Self**: User can only access their own data
- **Admin**: Requires admin role
- **Trainer**: Requires trainer or admin role
- **System**: Internal system calls only

### Accessibility-Aware Errors
All endpoints provide accessibility-enhanced error responses with:
- Screen reader compatible messages
- Keyboard navigation instructions
- High contrast error displays
- Multi-language support

### Privacy-First Design
All endpoints automatically:
- Scrub PII from logs
- Track data access for audit
- Apply data minimization principles
- Respect user consent preferences

---

## 📊 Response Formats

### Standard Success Response
```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "accessibility": {
    "screenReader": "Screen reader message",
    "keyboardShortcut": "Alt+H",
    "alternatives": "Alternative actions"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Compliance Headers
All responses include:
- `X-Privacy-Policy`: Link to privacy policy
- `X-Accessibility-Support`: WCAG compliance level
- `X-Master-Prompt-Version`: Implementation version
- `X-Ethical-AI`: Ethical AI status

---

## 🚀 Getting Started

1. **Initialize System**
   ```bash
   POST /api/master-prompt/initialize
   ```

2. **Check Health**
   ```bash
   GET /api/master-prompt/health
   ```

3. **Get System Status**
   ```bash
   GET /api/master-prompt/status
   ```

4. **Start Using Features**
   - Test accessibility: `POST /api/master-prompt/accessibility/test-feature`
   - Check gamification: `GET /api/master-prompt/gamification/status`
   - Monitor MCP servers: `GET /api/master-prompt/mcp/servers`
   - Scan for PII: `POST /api/master-prompt/privacy/scan-pii`

---

## 📞 Support

For accessibility support, privacy concerns, or technical issues:
- **Accessibility Helpline**: +1-800-ACCESS
- **Privacy Email**: privacy@company.com
- **Documentation**: `/accessibility-help`

---

*Master Prompt v26 - Ethical AI, Accessible Design, Privacy-First*