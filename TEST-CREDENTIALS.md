# Test User Credentials - Quick Reference

## 🔑 Login Credentials

### Client Account (Primary Test Account)
```
Username: clienttest
Email: client@test.com
Password: [Your password]
Role: Client
User ID: 3
```
**Has:**
- ✅ 12 session credits remaining
- ✅ 6 completed trainer-led sessions
- ✅ 6 solo workouts logged
- ✅ 2 upcoming scheduled sessions

---

### Trainer Account
```
Username: trainertest
Email: trainer@test.com
Password: [Your password]
Role: Trainer
User ID: 2
```
**Has:**
- ✅ Assigned to clienttest
- ✅ 6 completed sessions with clienttest
- ✅ 2 upcoming sessions scheduled

---

### Admin Account
```
Username: testadmin
Email: testadmin@test.com
Password: [Your password]
Role: Admin
User ID: 1
```
**Has:**
- ✅ Full administrative access
- ✅ Can manage all users, sessions, and credits

---

## 📊 Test Data Summary

### Sessions (clienttest)
- **Total Sessions:** 8
  - Completed: 6 (credits deducted)
  - Scheduled: 2 (credits not yet deducted)
- **Credits Used:** 8 out of 20
- **Credits Remaining:** 12

### Workouts (clienttest)
- **Total Workouts:** 12
  - Trainer-Led: 6 (sessionType='trainer-led', linked to sessions)
  - Solo: 6 (sessionType='solo', NO credit deduction)

---

## 🧪 Quick Test Commands

### Check Current Data
```bash
cd backend
node -e "const sequelize = require('./database.mjs').default; (async () => { const [result] = await sequelize.query('SELECT \"availableSessions\" FROM \"Users\" WHERE id = 3'); console.log('Client Credits:', result[0].availableSessions); const [sessions] = await sequelize.query('SELECT COUNT(*) as count FROM sessions WHERE \"userId\" = 3'); console.log('Total Sessions:', sessions[0].count); const [workouts] = await sequelize.query('SELECT COUNT(*) as count FROM workout_sessions WHERE \"userId\" = 3'); console.log('Total Workouts:', workouts[0].count); await sequelize.close(); })()"
```

### Reset Test Data
```bash
cd backend
# Clean up
node -e "const sequelize = require('./database.mjs').default; (async () => { await sequelize.query('DELETE FROM workout_sessions WHERE \"userId\" = 3'); await sequelize.query('DELETE FROM sessions WHERE \"userId\" = 3'); await sequelize.query('UPDATE \"Users\" SET \"availableSessions\" = 0 WHERE id = 3'); console.log('✅ Cleaned up'); await sequelize.close(); })()"

# Re-seed
npx sequelize-cli db:seed --seed 20260102000002-comprehensive-test-data.cjs
```

---

## 🎯 Testing URLs (localhost)

Assuming app runs on `http://localhost:3000`:

- Login: `http://localhost:3000/login`
- Client Dashboard: `http://localhost:3000/client/dashboard`
- Admin Dashboard: `http://localhost:3000/admin/dashboard`
- Trainer Dashboard: `http://localhost:3000/trainer/dashboard`

---

## 📋 Expected Test Results

### Workout Type Distribution Chart
```
Solo Workouts:    ████████████ 6 (50%)
Trainer Sessions: ████████████ 6 (50%)
```

### Session Credits
```
Total Purchased: 20
Used (Completed): 8
Remaining: 12
```

### Upcoming Sessions
1. Jan 5, 2026 - Upper Body Pull Day
2. Jan 8, 2026 - Full Body Functional Training

