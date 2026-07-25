#!/usr/bin/env bash

# ==============================================================================
# PR Code Auditor AI - Service Launcher
# Launches FastMCP Server (8085), ADK Backend (8000), and Web Frontend (3000)
# ==============================================================================

set -e

# Color definitions
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Workspace Root & Logs Directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$ROOT_DIR/logs"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

echo -e "${CYAN}${BOLD}"
echo "================================================================="
echo "   🤖 PR Code Auditor AI - Multi-Agent Architecture Launcher"
echo "================================================================="
echo -e "${NC}"

# Cleanup function to kill child processes on exit (Ctrl+C)
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
    if [ -n "$MCP_PID" ]; then kill "$MCP_PID" 2>/dev/null || true; fi
    if [ -n "$AGENT_PID" ]; then kill "$AGENT_PID" 2>/dev/null || true; fi
    if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
    echo -e "${GREEN}✅ All services stopped successfully.${NC}"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM EXIT

# Kill any existing processes running on target ports (8085, 8000, 3000)
kill_port() {
    local port=$1
    local pid=$(lsof -ti tcp:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Freeing port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null || true
    fi
}

echo -e "${CYAN}🧹 Checking target ports (8085, 8000, 3000)...${NC}"
kill_port 8085
kill_port 8000
kill_port 3000

# 1. Start FastMCP GitHub Server (Port 8085)
echo -e "\n${GREEN}1. Starting FastMCP GitHub Server (Port 8085)...${NC}"
cd "$ROOT_DIR/mcp-server-github"
uv run mcp-server-github --transport streamable-http --host 0.0.0.0 --port 8085 > "$LOGS_DIR/mcp-server.log" 2>&1 &
MCP_PID=$!
echo -e "   └─ FastMCP started (PID: ${BOLD}$MCP_PID${NC}) - Logs: logs/mcp-server.log"
sleep 2

# 2. Start ADK Agent FastAPI Backend (Port 8000)
echo -e "\n${GREEN}2. Starting ADK Agent Backend Server (Port 8000)...${NC}"
cd "$ROOT_DIR/pr-auditor-agent"
uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000 > "$LOGS_DIR/adk-agent.log" 2>&1 &
AGENT_PID=$!
echo -e "   └─ ADK Backend started (PID: ${BOLD}$AGENT_PID${NC}) - Logs: logs/adk-agent.log"
sleep 3

# 3. Start Web Frontend Server (Port 3000)
echo -e "\n${GREEN}3. Starting Web Frontend Application (Port 3000)...${NC}"
cd "$ROOT_DIR/pr-auditor-frontend"
python3 -m http.server 3000 > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "   └─ Frontend started (PID: ${BOLD}$FRONTEND_PID${NC}) - Logs: logs/frontend.log"
sleep 1

# Summary Dashboard
echo -e "\n${CYAN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}🚀 All services are up and running!${NC}"
echo -e "   🌐 Frontend Web App:     ${CYAN}${BOLD}http://localhost:3000${NC}"
echo -e "   🤖 ADK Agent API (SSE):   ${CYAN}${BOLD}http://localhost:8000/run_sse${NC}"
echo -e "   🛠️  FastMCP Server HTTP:  ${CYAN}${BOLD}http://localhost:8085/mcp${NC}"
echo -e "   📁 Logs Directory:       ${CYAN}${BOLD}$LOGS_DIR${NC}"
echo -e "${CYAN}${BOLD}=================================================================${NC}"
echo -e "${YELLOW}Press [Ctrl+C] at any time to stop all services.${NC}\n"

# Keep script running and tail logs from logs/ directory
tail -f "$LOGS_DIR/adk-agent.log" "$LOGS_DIR/mcp-server.log" 2>/dev/null
