#!/bin/bash

# Backup original StoreFront component
echo "Creating backup of original StoreFront component..."
cp "C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/pages/shop/StoreFront.component.tsx" "C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/pages/shop/StoreFront.component.tsx.backup"

# Replace with API version
echo "Replacing StoreFront component with API version..."
cp "C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/pages/shop/StoreFrontAPI.component.tsx" "C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/pages/shop/StoreFront.component.tsx"

echo "StoreFront component successfully updated!"
echo "The new component will now fetch packages from the database."
