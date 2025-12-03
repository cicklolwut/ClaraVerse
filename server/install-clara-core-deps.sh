#!/bin/bash

# Clara-Core Docker Management Dependencies Installation
# This script installs the required dependencies for Clara-Core Docker management

set -e

echo "=============================================="
echo "Clara-Core Docker Management Setup"
echo "=============================================="
echo ""

# Change to server directory
cd "$(dirname "$0")"

echo "[1/4] Installing npm dependencies..."
npm install

echo ""
echo "[2/4] Verifying TypeScript compilation..."
npm run build

echo ""
echo "[3/4] Checking installed packages..."
npm list dockerode
npm list @types/dockerode

echo ""
echo "[4/4] Verifying API files exist..."
files=(
  "src/types/claraCore.ts"
  "src/services/gpuDetection.ts"
  "src/services/claraCoreDocker.ts"
  "src/api/claraCoreRoutes.ts"
  "CLARA_CORE_API.md"
  "CLARA_CORE_DOCKER_IMPLEMENTATION.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "✗ $file missing"
    exit 1
  fi
done

echo ""
echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Rebuild the server Docker image:"
echo "   cd ../deployment/docker"
echo "   docker-compose build server"
echo ""
echo "2. Restart the server:"
echo "   docker-compose up -d server"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:3000/api/server/clara-core/docker-connection"
echo "   curl http://localhost:3000/api/server/clara-core/detect-gpu"
echo ""
echo "4. See CLARA_CORE_API.md for complete API documentation"
echo ""
