# Design Variants Master Guide
**SwanStudios Personal Training System v3.0**
**Purpose:** Data-driven design specifications for AI-generated visual components
**Last Updated:** 2025-11-05
**Version:** 1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Galaxy-Swan Theme Integration](#galaxy-swan-theme-integration)
3. [Client Profile Card Variants](#client-profile-card-variants)
4. [Progress Dashboard Variants](#progress-dashboard-variants)
5. [Workout Plan Visualizations](#workout-plan-visualizations)
6. [Nutrition Tracking Variants](#nutrition-tracking-variants)
7. [Health Risk Assessment Displays](#health-risk-assessment-displays)
8. [Goal Progress Visualizations](#goal-progress-visualizations)
9. [Pain & Recovery Tracking](#pain-recovery-tracking)
10. [AI Check-In Interface Variants](#ai-check-in-interface-variants)
11. [Gamification Component Designs](#gamification-component-designs)
12. [Responsive Design Rules](#responsive-design-rules)

---

## Overview

This guide provides **data-driven design specifications** that map Master Prompt JSON data to visual UI/UX components. It enables AI design tools (like Claude Artifacts, v0.dev, Figma AI) to generate pixel-perfect, on-brand designs using actual client data.

### Design Philosophy
- **Data-First:** Every design variant is driven by real Master Prompt data
- **Accessibility:** WCAG 2.1 AA compliant, screen reader optimized
- **Galaxy-Swan Theme:** Consistent brand colors, typography, spacing
- **Mobile-First:** Responsive from 320px to 4K displays
- **Performance:** Optimized for 60fps animations, lazy loading

### How to Use This Guide
1. Extract data from `MASTER-PROMPT-TEMPLATE.json`
2. Identify the component type needed (profile card, dashboard, etc.)
3. Select the appropriate variant based on data characteristics
4. Use the design specification to generate the component
5. Apply Galaxy-Swan theme tokens (colors, fonts, spacing)

---

## Galaxy-Swan Theme Integration

### Color Palette
```json
{
  "primary": {
    "deepSpace": "#0A0E27",
    "cosmicBlue": "#1E3A8A",
    "stellarPurple": "#7C3AED",
    "nebulaGold": "#F59E0B"
  },
  "accent": {
    "swanWhite": "#FFFFFF",
    "swanGray": "#9CA3AF",
    "starLight": "#E5E7EB",
    "galaxyDark": "#1F2937"
  },
  "status": {
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444",
    "info": "#3B82F6"
  },
  "gamification": {
    "bronze": "#CD7F32",
    "silver": "#C0C0C0",
    "gold": "#FFD700",
    "platinum": "#E5E4E2",
    "diamond": "#B9F2FF"
  }
}
```

### Typography
```json
{
  "fontFamily": {
    "primary": "Inter, system-ui, -apple-system, sans-serif",
    "display": "Clash Display, Inter, sans-serif",
    "mono": "JetBrains Mono, monospace"
  },
  "fontSize": {
    "xs": "0.75rem",    // 12px
    "sm": "0.875rem",   // 14px
    "base": "1rem",     // 16px
    "lg": "1.125rem",   // 18px
    "xl": "1.25rem",    // 20px
    "2xl": "1.5rem",    // 24px
    "3xl": "1.875rem",  // 30px
    "4xl": "2.25rem",   // 36px
    "5xl": "3rem"       // 48px
  },
  "fontWeight": {
    "normal": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700,
    "extrabold": 800
  }
}
```

### Spacing System (8px grid)
```json
{
  "spacing": {
    "0": "0",
    "1": "0.25rem",  // 4px
    "2": "0.5rem",   // 8px
    "3": "0.75rem",  // 12px
    "4": "1rem",     // 16px
    "6": "1.5rem",   // 24px
    "8": "2rem",     // 32px
    "12": "3rem",    // 48px
    "16": "4rem",    // 64px
    "24": "6rem"     // 96px
  }
}
```

---

## Client Profile Card Variants

### Variant A: Compact Profile Card (Mobile/Tablet)
**Data Source:** `client`, `measurements`, `goals.primary`, `package.tier`

**When to Use:**
- Mobile dashboard views (320px - 767px)
- Sidebar client lists
- Quick-reference cards

**Design Specification:**
```tsx
// Component Structure
<ProfileCardCompact>
  <Avatar size={64} src={initials} gradient="purple-gold" />
  <ClientName variant="display" size="lg">{client.preferredName}</ClientName>
  <Metadata>
    <Age>{client.age}y</Age>
    <Separator />
    <Gender>{client.gender}</Gender>
    <Separator />
    <Tier badge={package.tier}>{package.tier}</Tier>
  </Metadata>
  <PrimaryGoal icon={goalIcon}>{goals.primary}</PrimaryGoal>
  <QuickStats grid="2-col">
    <Stat label="Weight" value={measurements.currentWeight} unit="lbs" />
    <Stat label="Sessions/wk" value={package.sessionsPerWeek} />
  </QuickStats>
</ProfileCardCompact>
```

**Visual Styling:**
```css
.profile-card-compact {
  background: linear-gradient(135deg, #0A0E27 0%, #1E3A8A 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  max-width: 320px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 16px;
}

.client-name {
  font-family: 'Clash Display', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.metadata {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #9CA3AF;
  margin-bottom: 16px;
}

.tier-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.tier-badge.silver { background: #C0C0C0; color: #0A0E27; }
.tier-badge.golden { background: #FFD700; color: #0A0E27; }
.tier-badge.rhodium { background: #E5E4E2; color: #0A0E27; }

.primary-goal {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 14px;
  color: #E5E7EB;
  margin-bottom: 16px;
}

.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat {
  text-align: center;
}
.stat-label {
  font-size: 12px;
  color: #9CA3AF;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
}
.stat-unit {
  font-size: 12px;
  color: #9CA3AF;
  margin-left: 2px;
}
```

**Data Mapping Logic:**
```javascript
// Generate initials from name
function getInitials(fullName) {
  return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
}

// Map goal to icon
function getGoalIcon(primary) {
  const icons = {
    'Weight loss': '🔥',
    'Muscle gain': '💪',
    'Strength': '⚡',
    'Pain relief': '🩹',
    'Athletic performance': '🏃',
    'General health': '❤️'
  };
  return icons[primary] || '🎯';
}

// Dynamic gradient based on tier
function getTierGradient(tier) {
  const gradients = {
    'Silver': 'linear-gradient(135deg, #C0C0C0 0%, #E5E7EB 100%)',
    'Golden': 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
    'Rhodium': 'linear-gradient(135deg, #E5E4E2 0%, #B9F2FF 100%)'
  };
  return gradients[tier] || gradients.Silver;
}
```

---

### Variant B: Full Profile Card (Desktop)
**Data Source:** `client`, `measurements`, `goals`, `health`, `training`, `package`

**When to Use:**
- Desktop dashboard views (1024px+)
- Client detail pages
- Admin/trainer full-context views

**Design Specification:**
```tsx
<ProfileCardFull>
  <Header>
    <Avatar size={96} src={initials} gradient="tier-based" />
    <HeaderInfo>
      <ClientName>{client.preferredName}</ClientName>
      <Metadata>
        <Age>{client.age}y</Age> |
        <Gender>{client.gender}</Gender> |
        <BloodType>{client.bloodType}</BloodType>
      </Metadata>
      <Contact>
        <Phone>{client.contact.phone}</Phone>
        <Email>{client.contact.email}</Email>
      </Contact>
    </HeaderInfo>
    <TierBadge tier={package.tier} price={package.price} />
  </Header>

  <StatsGrid columns={4}>
    <Stat label="Current Weight" value={measurements.currentWeight} unit="lbs" trend={weightTrend} />
    <Stat label="Target Weight" value={measurements.targetWeight} unit="lbs" />
    <Stat label="Body Fat %" value={measurements.bodyFatPercentage} unit="%" />
    <Stat label="BMI" value={calculatedBMI} status={bmiStatus} />
  </StatsGrid>

  <GoalsSection>
    <PrimaryGoal icon={goalIcon}>{goals.primary}</PrimaryGoal>
    <Timeline>{goals.timeline}</Timeline>
    <SuccessVision>{goals.successLooksLike}</SuccessVision>
    <CommitmentMeter value={goals.commitmentLevel} max={10} />
  </GoalsSection>

  <HealthAlerts>
    {health.medicalConditions.length > 0 && (
      <Alert variant="warning" icon="⚠️">
        Medical Conditions: {health.medicalConditions.join(', ')}
      </Alert>
    )}
    {health.currentPain.length > 0 && (
      <Alert variant="error" icon="🩹">
        Active Pain: {health.currentPain.map(p => p.bodyPart).join(', ')}
      </Alert>
    )}
    {!health.doctorCleared && (
      <Alert variant="error" icon="🚨">
        Doctor Clearance Required
      </Alert>
    )}
  </HealthAlerts>

  <TrainingInfo grid="3-col">
    <InfoCard label="Fitness Level" value={training.fitnessLevel} />
    <InfoCard label="Sessions/Week" value={training.sessionFrequency} />
    <InfoCard label="Preferred Style" value={training.preferredStyle.join(', ')} />
  </TrainingInfo>

  <ActionBar>
    <Button variant="primary" icon="📅">Schedule Session</Button>
    <Button variant="secondary" icon="📊">View Progress</Button>
    <Button variant="secondary" icon="💬">Send Message</Button>
  </ActionBar>
</ProfileCardFull>
```

**Visual Styling:**
```css
.profile-card-full {
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 1200px;
}

.header {
  background: linear-gradient(135deg, #0A0E27 0%, #1E3A8A 100%);
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
}

.avatar-large {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.2);
}

.header-info {
  flex: 1;
}

.client-name-large {
  font-family: 'Clash Display', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.tier-badge-large {
  position: absolute;
  top: 32px;
  right: 32px;
  padding: 12px 24px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.tier-price {
  font-size: 18px;
  font-weight: 800;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  padding: 32px;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.stat-card {
  text-align: center;
}
.stat-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.stat-value-large {
  font-size: 32px;
  font-weight: 800;
  color: #0A0E27;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}
.stat-trend {
  font-size: 14px;
  margin-left: 8px;
}
.stat-trend.up { color: #10B981; }
.stat-trend.down { color: #EF4444; }

.goals-section {
  padding: 32px;
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  color: #FFFFFF;
}

.commitment-meter {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 16px;
}
.commitment-fill {
  height: 100%;
  background: #FFFFFF;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.health-alerts {
  padding: 24px 32px;
  background: #FEF3C7;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
}
.alert.warning {
  background: #FEF3C7;
  color: #92400E;
  border-left: 4px solid #F59E0B;
}
.alert.error {
  background: #FEE2E2;
  color: #7F1D1D;
  border-left: 4px solid #EF4444;
}

.training-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 32px;
}

.info-card {
  padding: 16px;
  background: #F9FAFB;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
}
.info-card-label {
  font-size: 12px;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.info-card-value {
  font-size: 16px;
  font-weight: 600;
  color: #0A0E27;
}

.action-bar {
  padding: 24px 32px;
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
  display: flex;
  gap: 12px;
}

.button {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.button-primary {
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  color: #FFFFFF;
  border: none;
}
.button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(124, 58, 237, 0.3);
}
.button-secondary {
  background: #F9FAFB;
  color: #0A0E27;
  border: 1px solid #E5E7EB;
}
.button-secondary:hover {
  background: #E5E7EB;
}
```

**Data Calculation Logic:**
```javascript
// Calculate BMI
function calculateBMI(weight, height) {
  const heightInInches = (height.feet * 12) + height.inches;
  const heightInMeters = heightInInches * 0.0254;
  const weightInKg = weight * 0.453592;
  const bmi = weightInKg / (heightInMeters * heightInMeters);
  return Math.round(bmi * 10) / 10;
}

// BMI status classification
function getBMIStatus(bmi) {
  if (bmi < 18.5) return { status: 'Underweight', color: '#F59E0B' };
  if (bmi < 25) return { status: 'Normal', color: '#10B981' };
  if (bmi < 30) return { status: 'Overweight', color: '#F59E0B' };
  return { status: 'Obese', color: '#EF4444' };
}

// Calculate weight trend (requires historical data)
function getWeightTrend(currentWeight, previousWeight) {
  if (!previousWeight) return null;
  const diff = currentWeight - previousWeight;
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
  return { trend, diff: Math.abs(diff) };
}
```

---

## Progress Dashboard Variants

### Variant A: Weekly Progress Dashboard
**Data Source:** `baseline`, `measurements`, `training.workoutsPerWeek`, `goals.primary`

**When to Use:**
- Weekly check-in views
- Mobile progress summaries
- AI daily check-in reports

**Design Specification:**
```tsx
<WeeklyProgressDashboard>
  <Header>
    <Week>Week of {currentWeekStart}</Week>
    <ProgressRing percentage={weeklyGoalCompletion} />
  </Header>

  <WorkoutCompletion>
    <Label>Workouts Completed</Label>
    <Progress current={completedWorkouts} target={plannedWorkouts} />
    <DayGrid>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
        <DayCircle key={i} completed={workoutDays.includes(i)} />
      ))}
    </DayGrid>
  </WorkoutCompletion>

  <MetricsGrid>
    <Metric
      label="Weight Change"
      value={weightChange}
      unit="lbs"
      trend={weightTrend}
      chart="mini-sparkline"
    />
    <Metric
      label="Avg Heart Rate"
      value={avgHeartRate}
      unit="bpm"
      status={hrStatus}
    />
    <Metric
      label="Total Volume"
      value={totalVolume}
      unit="lbs"
      improvement={volumeImprovement}
    />
    <Metric
      label="PRs This Week"
      value={personalRecords}
      icon="🏆"
    />
  </MetricsGrid>

  <StreakBanner>
    <Icon>🔥</Icon>
    <Text>{workoutStreak} day workout streak!</Text>
  </StreakBanner>
</WeeklyProgressDashboard>
```

**Visual Styling:**
```css
.weekly-dashboard {
  background: linear-gradient(135deg, #0A0E27 0%, #1E3A8A 100%);
  border-radius: 20px;
  padding: 24px;
  color: #FFFFFF;
}

.progress-ring {
  width: 80px;
  height: 80px;
  position: relative;
}
.progress-ring-circle {
  transform: rotate(-90deg);
}
.progress-ring-background {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}
.progress-ring-fill {
  fill: none;
  stroke: url(#gradient-gold);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease;
}
.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  font-weight: 700;
}

.workout-completion {
  margin: 24px 0;
}

.day-grid {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-top: 16px;
}
.day-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
}
.day-circle.completed {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border-color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}
.metric-label {
  font-size: 12px;
  color: #9CA3AF;
  margin-bottom: 8px;
}
.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
}
.metric-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 14px;
}
.metric-trend.positive { color: #10B981; }
.metric-trend.negative { color: #EF4444; }

.streak-banner {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}
```

---

### Variant B: Monthly Progress Dashboard (Comprehensive)
**Data Source:** All baseline metrics, historical data, goals

**When to Use:**
- Monthly progress reviews
- Desktop/tablet full reports
- Trainer assessment views

**Design Specification:**
```tsx
<MonthlyProgressDashboard>
  <MonthHeader>
    <Month>{monthName} {year}</Month>
    <OverallProgress percentage={monthlyGoalProgress} />
  </MonthHeader>

  <GoalTracking>
    <PrimaryGoal>
      <GoalName>{goals.primary}</GoalName>
      <ProgressBar current={currentProgress} target={monthlyTarget} />
      <Milestones>
        {milestones.map(m => (
          <Milestone key={m.id} achieved={m.achieved} date={m.date}>
            {m.description}
          </Milestone>
        ))}
      </Milestones>
    </PrimaryGoal>
  </GoalTracking>

  <BodyCompositionChart>
    <Title>Body Composition Trend</Title>
    <LineChart data={bodyCompData} metrics={['weight', 'bodyFat', 'muscleMass']} />
    <Legend />
  </BodyCompositionChart>

  <StrengthProgressGrid>
    {['Bench Press', 'Squat', 'Deadlift', 'OHP'].map(exercise => (
      <StrengthCard key={exercise}>
        <ExerciseName>{exercise}</ExerciseName>
        <CurrentMax>{currentMaxes[exercise]} lbs</CurrentMax>
        <Improvement>
          +{improvements[exercise]} lbs ({improvementPercent[exercise]}%)
        </Improvement>
        <MiniChart data={exerciseHistory[exercise]} />
      </StrengthCard>
    ))}
  </StrengthProgressGrid>

  <WorkoutConsistency>
    <Title>Workout Consistency</Title>
    <CalendarHeatmap data={workoutCalendar} />
    <Stats>
      <Stat label="Sessions Completed" value={sessionsCompleted} />
      <Stat label="Avg per Week" value={avgPerWeek} />
      <Stat label="Longest Streak" value={longestStreak} />
    </Stats>
  </WorkoutConsistency>

  <PainTrackingSection>
    <Title>Pain & Recovery</Title>
    {health.currentPain.map(pain => (
      <PainTimeline key={pain.bodyPart}>
        <BodyPart>{pain.bodyPart}</BodyPart>
        <IntensityGraph data={painHistory[pain.bodyPart]} />
        <CurrentStatus>{pain.status}</CurrentStatus>
      </PainTimeline>
    ))}
  </PainTrackingSection>

  <AIInsights>
    <Title>AI-Powered Insights</Title>
    <InsightCard type="success">
      <Icon>🎉</Icon>
      <Text>You've improved bench press by 15% this month!</Text>
    </InsightCard>
    <InsightCard type="warning">
      <Icon>⚠️</Icon>
      <Text>Lower back pain intensity increasing - recommend mobility work</Text>
    </InsightCard>
    <InsightCard type="info">
      <Icon>💡</Icon>
      <Text>You train best on Tuesday/Thursday mornings (82% completion)</Text>
    </InsightCard>
  </AIInsights>
</MonthlyProgressDashboard>
```

**Visual Styling:**
```css
.monthly-dashboard {
  background: #FFFFFF;
  min-height: 100vh;
}

.month-header {
  background: linear-gradient(135deg, #0A0E27 0%, #1E3A8A 100%);
  padding: 48px 32px;
  color: #FFFFFF;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-tracking {
  padding: 32px;
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  color: #FFFFFF;
}

.milestones {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}
.milestone {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border-left: 4px solid transparent;
}
.milestone.achieved {
  border-left-color: #10B981;
}
.milestone.achieved::before {
  content: '✓';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #10B981;
  border-radius: 50%;
  font-weight: 700;
}

.body-composition-chart {
  padding: 32px;
  background: #F9FAFB;
}

.strength-progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  padding: 32px;
}

.strength-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 2px solid #E5E7EB;
  transition: all 0.2s ease;
}
.strength-card:hover {
  border-color: #7C3AED;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.15);
  transform: translateY(-4px);
}

.exercise-name {
  font-size: 14px;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.current-max {
  font-size: 32px;
  font-weight: 800;
  color: #0A0E27;
  margin-bottom: 4px;
}
.improvement {
  font-size: 14px;
  color: #10B981;
  font-weight: 600;
  margin-bottom: 16px;
}

.workout-consistency {
  padding: 32px;
}

.calendar-heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin: 24px 0;
}
.calendar-day {
  aspect-ratio: 1;
  border-radius: 4px;
  background: #E5E7EB;
}
.calendar-day.workout-0 { background: #E5E7EB; }
.calendar-day.workout-1 { background: #BFDBFE; }
.calendar-day.workout-2 { background: #60A5FA; }
.calendar-day.workout-3 { background: #2563EB; }
.calendar-day.workout-4 { background: #1E3A8A; }

.pain-tracking-section {
  padding: 32px;
  background: #FEF3C7;
}

.pain-timeline {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.ai-insights {
  padding: 32px;
  background: linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%);
}

.insight-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.insight-card.success {
  border-left: 4px solid #10B981;
}
.insight-card.warning {
  border-left: 4px solid #F59E0B;
}
.insight-card.info {
  border-left: 4px solid #3B82F6;
}
```

---

## Workout Plan Visualizations

### Variant A: Daily Workout Card
**Data Source:** `training.sessionDuration`, `training.preferredStyle`, `baseline.strength`

**Design Specification:**
```tsx
<DailyWorkoutCard>
  <Header>
    <DayName>Monday - Push Day</DayName>
    <Duration>{training.sessionDuration}</Duration>
  </Header>

  <ExerciseList>
    {exercises.map(ex => (
      <Exercise key={ex.name}>
        <ExerciseName>{ex.name}</ExerciseName>
        <Sets>
          {ex.sets.map((set, i) => (
            <Set key={i} completed={set.completed}>
              {set.reps} × {set.weight}lbs
            </Set>
          ))}
        </Sets>
        <RestTimer>{ex.restTime}s</RestTimer>
        <Notes>{ex.notes}</Notes>
      </Exercise>
    ))}
  </ExerciseList>

  <WorkoutMetrics>
    <Metric label="Total Volume" value={totalVolume} unit="lbs" />
    <Metric label="Working Sets" value={totalSets} />
    <Metric label="Est. Duration" value={estimatedTime} unit="min" />
  </WorkoutMetrics>
</DailyWorkoutCard>
```

---

## Nutrition Tracking Variants

### Variant A: Daily Nutrition Summary
**Data Source:** `nutrition.targetProtein`, `nutrition.waterIntake`, `nutrition.eatingSchedule`

**Design Specification:**
```tsx
<DailyNutritionSummary>
  <MacroRings>
    <Ring label="Protein" current={currentProtein} target={nutrition.targetProtein} color="#10B981" />
    <Ring label="Carbs" current={currentCarbs} target={targetCarbs} color="#F59E0B" />
    <Ring label="Fat" current={currentFat} target={targetFat} color="#3B82F6" />
  </MacroRings>

  <MealTimeline>
    {meals.map(meal => (
      <Meal key={meal.time}>
        <Time>{meal.time}</Time>
        <Foods>{meal.foods.join(', ')}</Foods>
        <Macros protein={meal.protein} carbs={meal.carbs} fat={meal.fat} />
      </Meal>
    ))}
  </MealTimeline>

  <WaterTracking>
    <Glasses current={currentWater} target={nutrition.waterIntake} />
  </WaterTracking>
</DailyNutritionSummary>
```

---

## Health Risk Assessment Displays

### Variant A: Health Risk Dashboard
**Data Source:** `health`, `trainerAssessment.healthRisk`

**Design Specification:**
```tsx
<HealthRiskDashboard>
  <RiskLevel level={trainerAssessment.healthRisk}>
    <Icon>{riskIcon}</Icon>
    <Level>{trainerAssessment.healthRisk} Risk</Level>
    <Description>{riskDescription}</Description>
  </RiskLevel>

  <MedicalConditions>
    {health.medicalConditions.map(condition => (
      <Condition key={condition}>
        <Name>{condition}</Name>
        <ManagementPlan>{conditionPlans[condition]}</ManagementPlan>
      </Condition>
    ))}
  </MedicalConditions>

  <Medications>
    {health.medications.map(med => (
      <Medication key={med.name}>
        <Name>{med.name}</Name>
        <Dosage>{med.dosage} - {med.frequency}</Dosage>
        <ExerciseConsiderations>{medConsiderations[med.name]}</ExerciseConsiderations>
      </Medication>
    ))}
  </Medications>

  {!health.doctorCleared && (
    <DoctorClearanceBanner>
      <Icon>🚨</Icon>
      <Message>Doctor Clearance Required Before Starting Training</Message>
      <Action>Schedule Appointment</Action>
    </DoctorClearanceBanner>
  )}
</HealthRiskDashboard>
```

---

## Goal Progress Visualizations

### Variant A: Goal Progress Timeline
**Data Source:** `goals`, historical progress data

**Design Specification:**
```tsx
<GoalProgressTimeline>
  <GoalHeader>
    <Icon>{goalIcon}</Icon>
    <GoalName>{goals.primary}</GoalName>
    <Timeline>{goals.timeline}</Timeline>
  </GoalHeader>

  <ProgressTrack>
    <StartPoint date={metadata.firstSessionDate}>Start</StartPoint>
    <Milestones>
      {milestones.map(m => (
        <Milestone key={m.id} achieved={m.achieved} date={m.date}>
          {m.description}
        </Milestone>
      ))}
    </Milestones>
    <EndPoint date={projectedEndDate}>Goal: {goals.successLooksLike}</EndPoint>
  </ProgressTrack>

  <MetricsComparison>
    <Metric label="Starting" value={startingMetrics} />
    <Arrow direction="right" />
    <Metric label="Current" value={currentMetrics} />
    <Arrow direction="right" />
    <Metric label="Target" value={targetMetrics} />
  </MetricsComparison>

  <CommitmentScore>
    <Label>Commitment Level</Label>
    <Score value={goals.commitmentLevel} max={10} />
    <Feedback>{commitmentFeedback}</Feedback>
  </CommitmentScore>
</GoalProgressTimeline>
```

---

## Pain & Recovery Tracking

### Variant A: Pain Intensity Heatmap
**Data Source:** `health.currentPain`, historical pain data

**Design Specification:**
```tsx
<PainIntensityHeatmap>
  <BodyDiagram>
    {health.currentPain.map(pain => (
      <PainMarker
        key={pain.bodyPart}
        location={painLocations[pain.bodyPart]}
        intensity={pain.intensity}
        color={getPainColor(pain.intensity)}
      />
    ))}
  </BodyDiagram>

  <PainDetails>
    {health.currentPain.map(pain => (
      <PainCard key={pain.bodyPart}>
        <BodyPart>{pain.bodyPart}</BodyPart>
        <IntensityMeter value={pain.intensity} max={10} />
        <Duration>{pain.duration}</Duration>
        <Triggers>{pain.triggers}</Triggers>
        <Relieves>{pain.relieves}</Relieves>
        <ImpactBadge affects={pain.affectsDailyLife}>
          {pain.affectsDailyLife ? 'Affects Daily Life' : 'Manageable'}
        </ImpactBadge>
        <TrendGraph data={painHistory[pain.bodyPart]} />
      </PainCard>
    ))}
  </PainDetails>
</PainIntensityHeatmap>
```

**Visual Styling:**
```css
.pain-intensity-heatmap {
  background: #FFFFFF;
  padding: 32px;
  border-radius: 20px;
}

.body-diagram {
  position: relative;
  width: 300px;
  height: 600px;
  margin: 0 auto 32px;
  background-image: url('body-outline.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.pain-marker {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

/* Pain intensity colors */
.pain-marker.intensity-1,
.pain-marker.intensity-2 { background: #FEF3C7; }
.pain-marker.intensity-3,
.pain-marker.intensity-4 { background: #FCD34D; }
.pain-marker.intensity-5,
.pain-marker.intensity-6 { background: #F59E0B; }
.pain-marker.intensity-7,
.pain-marker.intensity-8 { background: #EF4444; }
.pain-marker.intensity-9,
.pain-marker.intensity-10 { background: #991B1B; }

.pain-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.pain-card {
  background: #F9FAFB;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #E5E7EB;
}

.intensity-meter {
  width: 100%;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}
.intensity-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.impact-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 12px;
}
.impact-badge.affects {
  background: #FEE2E2;
  color: #7F1D1D;
}
.impact-badge.manageable {
  background: #D1FAE5;
  color: #065F46;
}
```

---

## AI Check-In Interface Variants

### Variant A: Daily Check-In Chat Interface
**Data Source:** `aiCoaching`

**Design Specification:**
```tsx
<DailyCheckInInterface>
  <Header>
    <Avatar src="ai-avatar.png" />
    <Name>SwanStudios AI Coach</Name>
    <Time>{aiCoaching.checkInTime}</Time>
  </Header>

  <ChatMessages>
    <AIMessage>
      <Avatar size="sm" />
      <Bubble variant="ai">
        Hey {client.preferredName}! How are you feeling today? Did you complete your workout?
      </Bubble>
      <Timestamp>{timestamp}</Timestamp>
    </AIMessage>

    <UserMessage>
      <Bubble variant="user">
        Yes! Finished the push workout. Feeling strong!
      </Bubble>
      <Timestamp>{timestamp}</Timestamp>
    </UserMessage>

    <AIMessage>
      <Avatar size="sm" />
      <Bubble variant="ai">
        Awesome! 🎉 How's your energy level (1-10)?
      </Bubble>
      <QuickReplies>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <QuickReply key={n} value={n}>{n}</QuickReply>
        ))}
      </QuickReplies>
    </AIMessage>
  </ChatMessages>

  <InputArea>
    <TextInput placeholder="Type a message..." />
    <SendButton icon="send" />
    <VoiceButton icon="microphone" enabled={aiCoaching.checkInMethod === 'Voice'} />
  </InputArea>
</DailyCheckInInterface>
```

**Visual Styling:**
```css
.daily-checkin-interface {
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  height: 700px;
  display: flex;
  flex-direction: column;
}

.checkin-header {
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  padding: 20px;
  border-radius: 20px 20px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #FFFFFF;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-message,
.user-message {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.user-message {
  flex-direction: row-reverse;
}

.bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.4;
}

.bubble.ai {
  background: #F3F4F6;
  color: #0A0E27;
  border-bottom-left-radius: 4px;
}

.bubble.user {
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  color: #FFFFFF;
  border-bottom-right-radius: 4px;
}

.quick-replies {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.quick-reply {
  background: #FFFFFF;
  border: 2px solid #7C3AED;
  color: #7C3AED;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-reply:hover {
  background: #7C3AED;
  color: #FFFFFF;
  transform: translateY(-2px);
}

.input-area {
  padding: 16px 20px;
  border-top: 1px solid #E5E7EB;
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #E5E7EB;
  border-radius: 24px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  border-color: #7C3AED;
}

.send-button,
.voice-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-button {
  background: linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%);
  color: #FFFFFF;
}

.send-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.voice-button {
  background: #F3F4F6;
  color: #6B7280;
}

.voice-button:hover {
  background: #E5E7EB;
}
```

---

## Gamification Component Designs

### Variant A: Achievement Badge System
**Data Source:** Workout streaks, PRs, milestones

**Design Specification:**
```tsx
<AchievementBadgeSystem>
  <Header>
    <Title>Your Achievements</Title>
    <TotalBadges>{earnedBadges.length}/{totalBadges}</TotalBadges>
  </Header>

  <BadgeGrid>
    {badges.map(badge => (
      <Badge key={badge.id} earned={badge.earned} rarity={badge.rarity}>
        <Icon>{badge.icon}</Icon>
        <Name>{badge.name}</Name>
        <Description>{badge.description}</Description>
        {badge.earned ? (
          <EarnedDate>Earned: {badge.earnedDate}</EarnedDate>
        ) : (
          <Progress current={badge.progress} target={badge.requirement} />
        )}
      </Badge>
    ))}
  </BadgeGrid>
</AchievementBadgeSystem>
```

**Visual Styling:**
```css
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 24px;
}

.badge {
  background: #F9FAFB;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 2px solid #E5E7EB;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.badge.earned {
  background: linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%);
  border-color: #7C3AED;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.2);
}

.badge.earned::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 70%);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

.badge-icon {
  font-size: 48px;
  margin-bottom: 12px;
  filter: grayscale(100%);
  opacity: 0.5;
}

.badge.earned .badge-icon {
  filter: grayscale(0%);
  opacity: 1;
  animation: pop 0.5s ease;
}

@keyframes pop {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.badge.rarity-common { border-color: #9CA3AF; }
.badge.rarity-rare { border-color: #3B82F6; }
.badge.rarity-epic { border-color: #7C3AED; }
.badge.rarity-legendary { border-color: #F59E0B; }
```

---

## Responsive Design Rules

### Breakpoints
```css
/* Mobile (portrait) */
@media (max-width: 767px) {
  /* Use compact variants, single column layouts */
}

/* Tablet (portrait) */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Use 2-column grids, condensed dashboards */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Use full variants, multi-column grids */
}

/* Large Desktop */
@media (min-width: 1440px) {
  /* Use expanded layouts, additional data visualizations */
}
```

### Touch Target Sizes
- Minimum touch target: 44×44px (iOS HIG)
- Preferred touch target: 48×48px (Material Design)
- Button padding: minimum 12px vertical, 16px horizontal

### Font Scaling
```css
/* Mobile: 87.5% base scale */
html { font-size: 14px; }

/* Tablet: 100% base scale */
@media (min-width: 768px) {
  html { font-size: 16px; }
}

/* Desktop: 100% base scale */
@media (min-width: 1024px) {
  html { font-size: 16px; }
}

/* Large Desktop: 106.25% base scale */
@media (min-width: 1440px) {
  html { font-size: 17px; }
}
```

---

## Design Variant Selection Logic

### Automatic Variant Selection Algorithm
```javascript
function selectDesignVariant(componentType, clientData, deviceType, viewportWidth) {
  // Device detection
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isDesktop = viewportWidth >= 1024;

  // Data complexity assessment
  const hasExtensiveHealth = clientData.health.medicalConditions.length > 2 ||
                             clientData.health.currentPain.length > 1;
  const hasMultipleGoals = clientData.goals.secondary?.length > 0;
  const isAdvancedClient = clientData.training.fitnessLevel === 'Advanced';

  // Component-specific variant selection
  switch(componentType) {
    case 'profileCard':
      if (isMobile) return 'ProfileCardCompact';
      if (isDesktop && hasExtensiveHealth) return 'ProfileCardFull';
      return 'ProfileCardStandard';

    case 'progressDashboard':
      if (isMobile) return 'WeeklyProgressDashboard';
      if (isAdvancedClient) return 'MonthlyProgressDashboard';
      return 'WeeklyProgressDashboard';

    case 'workoutPlan':
      if (isMobile) return 'DailyWorkoutCard';
      if (isAdvancedClient) return 'DetailedWorkoutPlan';
      return 'DailyWorkoutCard';

    case 'nutritionTracking':
      if (clientData.nutrition.tracksFood) return 'DetailedNutritionSummary';
      return 'SimpleMacroTracker';

    default:
      return 'DefaultVariant';
  }
}
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- **Color Contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators:** Visible 2px outline, 4.5:1 contrast
- **Keyboard Navigation:** All interactive elements accessible via Tab/Shift+Tab
- **Screen Reader Labels:** ARIA labels for all icons and graphics
- **Alt Text:** Descriptive alt text for all images
- **Form Labels:** Explicit labels for all inputs
- **Error Messages:** Clear, actionable error messages

### Screen Reader Optimizations
```html
<!-- Example: Profile Card with ARIA -->
<div role="article" aria-labelledby="client-name" class="profile-card">
  <h2 id="client-name">John Doe - Personal Training Client</h2>
  <div role="group" aria-label="Client Metrics">
    <div role="text">
      <span aria-label="Current Weight">185 pounds</span>
      <span aria-label="Target Weight">170 pounds</span>
    </div>
  </div>
  <button aria-label="Schedule training session with John Doe">
    Schedule Session
  </button>
</div>
```

---

## Performance Optimization

### Image Optimization
- Use WebP format with JPEG fallback
- Lazy load images below the fold
- Responsive image sizes via srcset
- Maximum file size: 200KB for photos, 50KB for icons

### Animation Performance
- Use CSS transforms (translate, scale, rotate) for 60fps
- Avoid animating width, height, margin, padding
- Use `will-change` sparingly for complex animations
- Disable animations on low-power devices

### Code Splitting
- Load dashboard variants on-demand
- Lazy load chart libraries (Chart.js, D3.js)
- Defer non-critical CSS

---

## Integration with Master Prompt

### Example: Auto-Generate Profile Card from JSON
```javascript
import { MASTER_PROMPT_TEMPLATE } from './templates/MASTER-PROMPT-TEMPLATE.json';
import { ProfileCardFull } from './components/ProfileCardFull';

async function generateClientProfile(clientData) {
  // Validate against schema
  const isValid = validateMasterPrompt(clientData);
  if (!isValid) throw new Error('Invalid client data');

  // Calculate derived metrics
  const bmi = calculateBMI(clientData.measurements.weight, clientData.measurements.height);
  const bmiStatus = getBMIStatus(bmi);
  const goalIcon = getGoalIcon(clientData.goals.primary);
  const tierGradient = getTierGradient(clientData.package.tier);

  // Render component with data
  return (
    <ProfileCardFull
      client={clientData.client}
      measurements={clientData.measurements}
      goals={clientData.goals}
      health={clientData.health}
      training={clientData.training}
      package={clientData.package}
      bmi={bmi}
      bmiStatus={bmiStatus}
      goalIcon={goalIcon}
      tierGradient={tierGradient}
    />
  );
}
```

---

## Version History
- **v1.0 (2025-11-05):** Initial release with 11 component variant types
- Future: Add wearable device integrations, 3D body visualization, AR workout demonstrations

---

**End of Design Variants Master Guide**
