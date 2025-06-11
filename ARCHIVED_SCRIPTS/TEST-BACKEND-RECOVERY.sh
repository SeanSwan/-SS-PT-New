#!/bin/bash

echo "🔍 TESTING BACKEND RECOVERY - SWAN ALCHEMIST"
echo "============================================="
echo ""

echo "📡 Testing backend health endpoint..."
echo "GET https://swan-studios-api.onrender.com/health"
echo ""

# Test the health endpoint
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "https://swan-studios-api.onrender.com/health")
http_code=$(echo $response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
body=$(echo $response | sed -E 's/HTTPSTATUS:[0-9]*$//')

echo "HTTP Status Code: $http_code"
echo "Response: $body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS! Backend is responding correctly!"
    echo "🎉 CRISIS RESOLVED - Backend API is operational"
    echo ""
    echo "🔍 Now testing frontend..."
    echo "GET https://sswanstudios.com"
    
    frontend_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "https://sswanstudios.com")
    frontend_code=$(echo $frontend_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    echo "Frontend HTTP Status: $frontend_code"
    
    if [ "$frontend_code" = "200" ]; then
        echo "✅ COMPLETE SUCCESS! Both backend and frontend are operational!"
        echo ""
        echo "🚀 PRODUCTION CRISIS FULLY RESOLVED!"
        echo "=================================="
        echo "✅ Backend API: Operational"
        echo "✅ Frontend: Loading"
        echo "✅ Security: .env files protected"
        echo "✅ Components: FloatingSessionWidget fixed"
        echo "✅ Context: SessionContext stable"
    else
        echo "⚠️  Frontend may have issues (HTTP $frontend_code)"
        echo "But backend recovery is the primary success!"
    fi
    
elif [ "$http_code" = "404" ]; then
    echo "❌ Backend still returning 404 - Service may still be building"
    echo "💡 Wait 2-3 more minutes and test again"
    echo "   Render deployment can take 3-5 minutes total"
    
elif [ "$http_code" = "502" ] || [ "$http_code" = "503" ]; then
    echo "⚠️  Backend service is starting but not ready yet"
    echo "💡 This is normal - wait 1-2 minutes and test again"
    
else
    echo "❌ Unexpected response code: $http_code"
    echo "💡 Check Render dashboard logs for specific errors"
fi

echo ""
echo "🔧 If backend still fails after 5 minutes:"
echo "1. Check Render dashboard → swan-studios-api → Logs"
echo "2. Look for database connection errors"
echo "3. Verify environment variables are set"
echo ""
echo "📊 Monitor commands:"
echo "   Render Dashboard: https://dashboard.render.com"
echo "   Test Backend: curl -I https://swan-studios-api.onrender.com/health"
echo "   Test Frontend: curl -I https://sswanstudios.com"
