@echo off
echo 🧪 QUICK BACKEND API TEST
echo =========================
echo.

echo 📍 Testing backend health endpoint...
curl -s -X GET "https://ss-pt-new.onrender.com/api/contact/health"
echo.
echo.

echo 📍 Testing main contact API endpoint...
curl -s -X POST "https://ss-pt-new.onrender.com/api/contact" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User Fix\",\"email\":\"test@example.com\",\"message\":\"Test message from deployment script\",\"consultationType\":\"general\",\"priority\":\"normal\"}"
echo.
echo.

echo ✅ Backend API test complete!
echo If you see JSON responses above with "success":true, the backend is working!
echo.
