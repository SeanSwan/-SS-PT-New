#!/bin/bash

echo "Step 1: Closing VS Code..."
taskkill /IM Code.exe /F 2>/dev/null

echo "Step 2: Starting Gemini CLI..."
echo "Please authenticate and then type /settings to enable Preview Features."
gemini

echo "Step 3: After enabling Preview Features, reopen VS Code."
echo "Gemini 3 will then be available in Agent Mode."