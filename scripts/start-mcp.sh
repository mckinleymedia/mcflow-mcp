#!/bin/bash

# McFlow MCP Server Startup Script
# Works with any MCP-compatible AI coding agent

# Set default environment variables
export WORKFLOWS_PATH="${WORKFLOWS_PATH:-../n8n-workflows-template}"
export MCP_PORT="${MCP_PORT:-3000}"
export MCP_MODE="${MCP_MODE:-stdio}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting McFlow MCP Server...${NC}"
echo -e "${YELLOW}Configuration:${NC}"
echo "  - Workflows Path: $WORKFLOWS_PATH"
echo "  - Mode: $MCP_MODE"
echo "  - Port: $MCP_PORT (if using HTTP mode)"

# Check if workflows directory exists
if [ ! -d "$WORKFLOWS_PATH" ]; then
    echo -e "${RED}Error: Workflows directory not found at $WORKFLOWS_PATH${NC}"
    echo "Please set WORKFLOWS_PATH environment variable to your n8n-workflows-template directory"
    exit 1
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building project...${NC}"
    npm run build
fi

# Start the server based on mode
if [ "$MCP_MODE" = "http" ]; then
    echo -e "${GREEN}Starting in HTTP mode on port $MCP_PORT...${NC}"
    MCP_MODE=http MCP_PORT=$MCP_PORT node dist/index.js
else
    echo -e "${GREEN}Starting in STDIO mode...${NC}"
    node dist/index.js
fi