#!/bin/bash

# Redis Fix Verification Script
# Runs the test and captures output to verify no Redis errors occur

echo "=================================================="
echo "Redis Fix Verification Script"
echo "=================================================="

# Check if REDIS_ENABLED is false
echo "Checking environment configuration..."
if grep -q "REDIS_ENABLED=false" ../.env; then
    echo "✓ REDIS_ENABLED=false found in .env"
else
    echo "✗ REDIS_ENABLED not set to false"
    echo "Please ensure REDIS_ENABLED=false in .env file"
    exit 1
fi

# Run the test and capture output
echo "Running Redis fix test..."
OUTPUT=$(node test-redis-fix.mjs 2>&1)
EXIT_CODE=$?

# Check for Redis error messages
if echo "$OUTPUT" | grep -i "ioredis.*error\|redis.*connection.*refused\|econnrefused.*6379\|unhandled.*error.*event"; then
    echo "✗ Redis connection errors detected!"
    echo "The fix may not be working properly."
    echo "Output:"
    echo "$OUTPUT"
    exit 1
else
    echo "✓ No Redis connection errors detected"
fi

# Check exit code
if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Test completed successfully"
else
    echo "✗ Test failed with exit code $EXIT_CODE"
    echo "Output:"
    echo "$OUTPUT"
    exit 1
fi

echo "=================================================="
echo "Redis Fix Verification PASSED"
echo "- No Redis connection attempts when disabled"
echo "- Memory cache fallback working correctly"
echo "- All operations completed successfully"
echo "=================================================="
