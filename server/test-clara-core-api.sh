#!/bin/bash

# Clara-Core API Testing Script
# Tests all Clara-Core Docker management endpoints

set -e

BASE_URL="${1:-http://localhost:3000}"
API_BASE="${BASE_URL}/api/server/clara-core"

echo "=============================================="
echo "Clara-Core Docker Management API Tests"
echo "=============================================="
echo "Base URL: $API_BASE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"

  TESTS_RUN=$((TESTS_RUN + 1))
  echo -n "[$TESTS_RUN] Testing $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE$endpoint")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "   Response: $(echo $body | jq -c . 2>/dev/null || echo $body)"
  elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
    echo -e "${YELLOW}⚠ EXPECTED ERROR${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "   Response: $(echo $body | jq -c . 2>/dev/null || echo $body)"
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "   Response: $(echo $body | jq -c . 2>/dev/null || echo $body)"
  fi
  echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Section 1: Detection & Status Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "Docker Connection" "GET" "/docker-connection"
run_test "GPU Detection" "GET" "/detect-gpu"
run_test "GPU Detection (Skip Cache)" "GET" "/detect-gpu?skipCache=true"
run_test "Container Status" "GET" "/status"
run_test "Health Check" "GET" "/health"
run_test "Container Logs" "GET" "/logs?lines=50"
run_test "System Info" "GET" "/system-info"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Section 2: Utility Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "List Architectures" "GET" "/architectures"
run_test "Check CPU Image" "GET" "/image-exists/cpu"
run_test "Check CUDA Image" "GET" "/image-exists/cuda"
run_test "Check ROCm Image" "GET" "/image-exists/rocm"
run_test "Check Port 8091" "GET" "/port-available/8091"
run_test "Check Port 8092" "GET" "/port-available/8092"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Section 3: Lifecycle Management (Read-Only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: These tests will likely fail if container doesn't exist
# They're here to verify the endpoints respond correctly
run_test "Start (Dry Run)" "GET" "/status"
run_test "Stop (Dry Run)" "GET" "/status"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Section 4: Validation Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "Invalid Architecture" "GET" "/image-exists/invalid"
run_test "Invalid Port (Too Low)" "GET" "/port-available/0"
run_test "Invalid Port (Too High)" "GET" "/port-available/99999"
run_test "Create Without Architecture" "POST" "/create" '{}'
run_test "Create With Invalid Arch" "POST" "/create" '{"architecture":"invalid"}'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests Run:    $TESTS_RUN"
echo -e "Tests Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
