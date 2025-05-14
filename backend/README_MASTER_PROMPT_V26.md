# 🚀 Master Prompt v26 - Usage Guide & Implementation Instructions

## 📋 Overview

Master Prompt v26 is your comprehensive solution for **Ethical AI**, **Accessibility Champion**, **Privacy-First Design**, **Addictive Gamification**, and **MCP-Centric Architecture** in the SwanStudios platform.

---

## 🔧 Getting Started

### 1. Initialize Master Prompt v26

```bash
# Start the system
curl -X POST http://localhost:5000/api/master-prompt/initialize

# Check system status
curl http://localhost:5000/api/master-prompt/status

# Verify health
curl http://localhost:5000/api/master-prompt/health
```

### 2. Integration in Your Code

```javascript
// Import Master Prompt services
import { masterPromptIntegration } from './services/integration/MasterPromptIntegration.mjs';
import { ethicalAIReview } from './services/ai/EthicalAIReview.mjs';
import { gamificationEngine } from './services/gamification/GamificationEngine.mjs';

// Initialize on server start
await masterPromptIntegration.initialize();
```

---

## 🤖 Ethical AI Implementation

### Generate Ethical Workouts

```javascript
// Frontend Request
const generateEthicalWorkout = async (userProfile, workoutPrefs) => {
  // 1. Generate workout with existing AI
  const workoutPlan = await generateWorkout(userProfile, workoutPrefs);
  
  // 2. Review for ethical compliance
  const response = await fetch('/api/master-prompt/ethical-ai/review-workout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workoutPlan,
      clientProfile: userProfile
    })
  });
  
  const ethicalReview = await response.json();
  
  // 3. Use only if ethical review passes
  if (ethicalReview.data.passed) {
    return {
      workout: workoutPlan,
      ethicalScore: ethicalReview.data.overallScore,
      recommendation: ethicalReview.data.recommendations
    };
  } else {
    // Fallback or human review required
    return { error: 'Workout requires human review', review: ethicalReview };
  }
};
```

### Nutrition Plan Review

```javascript
const reviewNutritionPlan = async (nutritionPlan, userProfile) => {
  const response = await fetch('/api/master-prompt/ethical-ai/review-nutrition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nutritionPlan, clientProfile: userProfile })
  });
  
  return response.json();
};
```

---

## ♿ Accessibility Implementation

### Automatic Accessibility Testing

```javascript
// Test any feature for accessibility
const testFeatureAccessibility = async (featureName) => {
  const response = await fetch('/api/master-prompt/accessibility/test-feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featureName })
  });
  
  const result = await response.json();
  
  console.log(`Accessibility Score: ${result.data.score}/100`);
  console.log(`WCAG Compliant: ${result.data.wcagCompliant ? 'Yes' : 'No'}`);
  
  return result.data;
};

// Usage examples
await testFeatureAccessibility('workout-generator');
await testFeatureAccessibility('progress-tracker');
await testFeatureAccessibility('nutrition-planner');
```

### Generate Accessibility Tests

```javascript
// Generate Cypress tests for accessibility
const generateA11yTests = async () => {
  const response = await fetch('/api/master-prompt/accessibility/save-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outputDir: './cypress/accessibility' })
  });
  
  const result = await response.json();
  console.log(`Generated ${result.data.testFiles.length} accessibility test files`);
};
```

---

## 🎮 Gamification Implementation

### Award Points System

```javascript
// Award points when user completes workout
const completeWorkout = async (userId, workoutData) => {
  // 1. Process workout completion
  await saveWorkoutCompletion(userId, workoutData);
  
  // 2. Award gamification points
  const response = await fetch('/api/master-prompt/gamification/process-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'workout_completed',
      metadata: {
        workoutDuration: workoutData.duration,
        formScore: workoutData.formScore
      }
    })
  });
  
  const gamification = await response.json();
  
  // 3. Show user their progress
  if (gamification.data.levelUp) {
    showLevelUpNotification(gamification.data.newLevel);
  }
  
  return gamification.data;
};
```

### Get User Gamification Status

```javascript
// Display user's gamification status
const getUserGamificationStatus = async () => {
  const response = await fetch('/api/master-prompt/gamification/status');
  const status = await response.json();
  
  return {
    level: status.data.level,
    totalPoints: status.data.totalPoints,
    currentStreak: status.data.currentStreak,
    achievements: status.data.achievements,
    progress: status.data.levelProgress
  };
};

// Usage in React component
const GamificationDashboard = () => {
  const [gamificationData, setGamificationData] = useState(null);
  
  useEffect(() => {
    getUserGamificationStatus().then(setGamificationData);
  }, []);
  
  return (
    <div>
      <h3>Level {gamificationData?.level}</h3>
      <p>{gamificationData?.totalPoints} points</p>
      <p>{gamificationData?.currentStreak} day streak</p>
    </div>
  );
};
```

### Leaderboard Implementation

```javascript
const getLeaderboard = async (timeframe = 'weekly') => {
  const response = await fetch(
    `/api/master-prompt/gamification/leaderboard?timeframe=${timeframe}&limit=10`
  );
  return response.json();
};
```

---

## 🔧 MCP Server Monitoring

### Monitor Your AI Services

```javascript
// Get all MCP servers status
const monitorMCPServers = async () => {
  const response = await fetch('/api/master-prompt/mcp/servers');
  const servers = await response.json();
  
  servers.data.servers.forEach(server => {
    console.log(`${server.name}: ${server.health.status}`);
    console.log(`Response time: ${server.metrics.avgResponseTime}ms`);
    console.log(`Success rate: ${server.metrics.successRate}%`);
  });
  
  return servers.data;
};

// Get system overview
const getMCPOverview = async () => {
  const response = await fetch('/api/master-prompt/mcp/system-overview');
  return response.json();
};
```

### Invoke MCP Tools

```javascript
// Use AI tools through MCP
const generateWorkoutWithMCP = async (userProfile, preferences) => {
  const response = await fetch('/api/master-prompt/mcp/tool/generate_workout/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverName: 'workout-generation',
      args: { userProfile, preferences }
    })
  });
  
  return response.json();
};
```

---

## 🔒 Privacy Implementation

### PII-Safe User Data Handling

```javascript
// Scan content for PII before storage
const scanAndStoreSafeContent = async (userContent) => {
  // 1. Scan for PII
  const response = await fetch('/api/master-prompt/privacy/scan-pii', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: userContent })
  });
  
  const scanResult = await response.json();
  
  // 2. Sanitize if PII found
  if (scanResult.data.piiDetected) {
    const sanitizeResponse = await fetch('/api/master-prompt/privacy/sanitize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: userContent,
        method: 'mask',
        preserveFormat: true
      })
    });
    
    const sanitized = await sanitizeResponse.json();
    return sanitized.data.sanitizedContent;
  }
  
  return userContent;
};
```

### User Data Rights

```javascript
// Export user data (GDPR compliance)
const exportUserData = async (userId) => {
  const response = await fetch('/api/master-prompt/privacy/export-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      format: 'json',
      includeMetadata: true 
    })
  });
  
  const exportResult = await response.json();
  return exportResult.data.downloadUrl;
};

// Delete user data (Right to be forgotten)
const deleteUserData = async (userId, confirmToken) => {
  const response = await fetch('/api/master-prompt/privacy/delete-user-data', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId,
      confirmToken,
      retentionOverride: false
    })
  });
  
  return response.json();
};
```

---

## 📊 Real-World Use Cases

### 1. **User Registration with Privacy**

```javascript
const registerUserWithPrivacy = async (userData) => {
  // 1. Scan for accidental PII in form data
  const safeData = await scanAndStoreSafeContent(JSON.stringify(userData));
  
  // 2. Create user account
  const user = await createUser(JSON.parse(safeData));
  
  // 3. Set up gamification
  await fetch('/api/master-prompt/gamification/status', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${user.token}` }
  });
  
  // 4. Check accessibility preferences
  await setupAccessibilityPreferences(user.id);
  
  return user;
};
```

### 2. **Workout Generation Pipeline**

```javascript
const generateCompleteWorkout = async (userId, preferences) => {
  // 1. Get user profile safely
  const userProfile = await getUserProfile(userId);
  
  // 2. Generate workout using MCP
  const workout = await generateWorkoutWithMCP(userProfile, preferences);
  
  // 3. Review ethically
  const ethical = await ethicalAIReview.reviewWorkoutGeneration(
    workout.result.data, 
    userProfile
  );
  
  // 4. Test accessibility
  const accessible = await testFeatureAccessibility('workout-display');
  
  // 5. Award points if successful
  if (ethical.passed && accessible.score > 85) {
    await awardPoints(userId, 'workout_generated', {
      ethicalScore: ethical.overallScore,
      accessibilityScore: accessible.score
    });
  }
  
  return {
    workout: workout.result.data,
    ethical: ethical.passed,
    accessible: accessible.wcagCompliant,
    gamification: ethical.passed ? await getUserGamificationStatus() : null
  };
};
```

### 3. **Admin Dashboard Implementation**

```javascript
const AdminDashboard = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [mcpServers, setMcpServers] = useState([]);
  
  useEffect(() => {
    // Load all system status
    const loadDashboard = async () => {
      // System health
      const health = await fetch('/api/master-prompt/health').then(r => r.json());
      setSystemHealth(health);
      
      // Privacy compliance
      const compliance = await fetch('/api/master-prompt/compliance').then(r => r.json());
      setComplianceStatus(compliance);
      
      // MCP servers
      const servers = await fetch('/api/master-prompt/mcp/servers').then(r => r.json());
      setMcpServers(servers.data.servers);
    };
    
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="admin-dashboard">
      <h1>Master Prompt v26 Dashboard</h1>
      
      <div className="system-health">
        <h2>System Health: {systemHealth?.overall}</h2>
        <p>GDPR Compliance: {complianceStatus?.data.ethical.score}%</p>
        <p>Accessibility Score: {complianceStatus?.data.accessibility.score}%</p>
      </div>
      
      <div className="mcp-servers">
        <h2>MCP Servers</h2>
        {mcpServers.map(server => (
          <div key={server.name}>
            <span>{server.name}: {server.health.status}</span>
            <span>Avg Response: {server.metrics.avgResponseTime}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 4. **User Progress with Gamification**

```javascript
const UserProgressPage = () => {
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  
  useEffect(() => {
    const loadProgress = async () => {
      // Get gamification status
      const gamification = await getUserGamificationStatus();
      setProgress(gamification);
      
      // Get achievements
      const achievementData = await fetch('/api/master-prompt/gamification/achievements')
        .then(r => r.json());
      setAchievements(achievementData.data.earned);
    };
    
    loadProgress();
  }, []);
  
  return (
    <div className="user-progress" role="main" aria-label="User Progress">
      <h1>Your Fitness Journey</h1>
      
      <div className="level-progress" aria-live="polite">
        <h2>Level {progress?.level}</h2>
        <div 
          className="progress-bar" 
          role="progressbar" 
          aria-valuenow={progress?.progress} 
          aria-valuemin="0" 
          aria-valuemax="100"
        >
          <div style={{ width: `${progress?.progress}%` }}></div>
        </div>
        <p>{progress?.totalPoints} total points</p>
      </div>
      
      <div className="achievements">
        <h2>Achievements</h2>
        {achievements.map(achievement => (
          <div key={achievement.id} className="achievement">
            <h3>{achievement.name}</h3>
            <p>{achievement.description}</p>
            <small>Earned: {new Date(achievement.earnedAt).toLocaleDateString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🔍 Testing Your Implementation

### 1. Run Integration Tests

```bash
# Run the comprehensive test suite
node backend/tests/masterPromptIntegrationTest.mjs
```

### 2. Manual Testing Checklist

```javascript
// Copy this into your browser console for quick testing

// 1. Test System Health
fetch('/api/master-prompt/status').then(r => r.json()).then(console.log);

// 2. Test Ethical AI
fetch('/api/master-prompt/ethical-ai/review-workout', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    workoutPlan: { exercises: [{ name: 'Push-ups' }] },
    clientProfile: { userId: 'test', age: 30 }
  })
}).then(r => r.json()).then(console.log);

// 3. Test Accessibility
fetch('/api/master-prompt/accessibility/test-feature', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ featureName: 'workout-generator' })
}).then(r => r.json()).then(console.log);

// 4. Test Gamification
fetch('/api/master-prompt/gamification/status').then(r => r.json()).then(console.log);

// 5. Test Privacy
fetch('/api/master-prompt/privacy/status').then(r => r.json()).then(console.log);
```

---

## 📈 Performance Monitoring

### Set Up Monitoring Dashboard

```javascript
// Create a real-time monitoring component
const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    const updateMetrics = async () => {
      const response = await fetch('/api/master-prompt/metrics');
      const data = await response.json();
      setMetrics(data.data);
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="monitoring-dashboard">
      <h2>Master Prompt v26 Metrics</h2>
      <div>Overall Health: {metrics?.overallHealth}</div>
      <div>System Metrics: {JSON.stringify(metrics?.systemMetrics)}</div>
    </div>
  );
};
```

---

## 🚀 Deployment Checklist

### Before Going Live

1. **Initialize Master Prompt v26**
   ```bash
   POST /api/master-prompt/initialize
   ```

2. **Verify All Systems Healthy**
   ```bash
   GET /api/master-prompt/health
   ```

3. **Check Compliance Status**
   ```bash
   GET /api/master-prompt/compliance
   ```

4. **Test Key Features**
   - Ethical AI review
   - Accessibility testing
   - Gamification points
   - Privacy scanning

5. **Set Up Monitoring**
   - Configure health check alerts
   - Set up performance monitoring
   - Enable audit logging

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review compliance reports
2. **Daily**: Check system health
3. **Real-time**: Monitor MCP server performance
4. **Monthly**: Run full integration tests

### Troubleshooting Common Issues

```javascript
// Debug failing ethical AI reviews
const debugEthicalAI = async (workoutPlan, clientProfile) => {
  try {
    const result = await ethicalAIReview.reviewWorkoutGeneration(workoutPlan, clientProfile);
    console.log('Ethical Review Result:', result);
    
    if (!result.passed) {
      console.log('Issues found:', result.recommendations);
      console.log('Scores:', {
        inclusivity: result.inclusivity.score,
        accessibility: result.abilityAccommodation.score,
        positivity: result.positiveTone.score,
        bias: result.biasDetection.score
      });
    }
  } catch (error) {
    console.error('Ethical AI Review Error:', error);
  }
};
```

---

## 🎉 You're Ready to Use Master Prompt v26!

Your Master Prompt v26 implementation provides:

✅ **Ethical AI** - Bias-free, inclusive content generation  
✅ **Accessibility** - WCAG 2.1 AA compliance across all features  
✅ **Privacy** - GDPR/CCPA compliant data handling  
✅ **Gamification** - Healthy, engaging user experience  
✅ **Monitoring** - Real-time system health and performance  

Start integrating these features into your SwanStudios platform today! 🚀

---

*Master Prompt v26 - Ethical AI, Accessible Design, Privacy-First Innovation* ✨