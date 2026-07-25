#!/usr/bin/env bash

# ==============================================================================
# PR Code Auditor AI - Cloud Run Multi-Service Automated Deployer
# Deploys FastMCP Server, ADK Agent Server, and Frontend to GCP Cloud Run
# ==============================================================================

set -eo pipefail

# Visual Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Workspace Root Detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/infrastructure"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REGION="${GCP_REGION:-us-central1}"
REPOSITORY="pr-auditor-repo"
SERVICE_ACCOUNT_NAME="pr-auditor-sa"

echo -e "${CYAN}${BOLD}"
echo "================================================================="
echo "   🚀 PR Code Auditor AI - Cloud Run Deployment Suite"
echo "================================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. Project ID Prompt & Validation
# ------------------------------------------------------------------------------
PROJECT_ID="${GCP_PROJECT_ID:-}"

# Parse optional command line flags (e.g., ./deploy.sh --project my-gcp-project)
while [[ $# -gt 0 ]]; do
  case $1 in
    --project|-p)
      PROJECT_ID="$2"
      shift 2
      ;;
    --region|-r)
      REGION="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ -z "$PROJECT_ID" ]; then
  echo -e "${YELLOW}🔑 GCP_PROJECT_ID not detected in environment variables.${NC}"
  echo -n -e "${BOLD}Enter GCP Project ID: ${NC}"
  read -r PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ Error: GCP Project ID is required to continue.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Using GCP Project ID: ${BOLD}$PROJECT_ID${NC}"
echo -e "${GREEN}✅ Selected Region:      ${BOLD}$REGION${NC}"

# Check gcloud installation
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: 'gcloud' CLI is not installed on system.${NC}"
    exit 1
fi

# Set gcloud project context
gcloud config set project "$PROJECT_ID" --quiet

# ------------------------------------------------------------------------------
# 2. Enable Required GCP APIs
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}1. Enabling required GCP APIs...${NC}"
REQUIRED_SERVICES=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "iam.googleapis.com"
  "secretmanager.googleapis.com"
  "serviceusage.googleapis.com"
  "aiplatform.googleapis.com"
)

gcloud services enable "${REQUIRED_SERVICES[@]}" --project="$PROJECT_ID" --quiet
echo -e "${GREEN}   └─ APIs enabled successfully.${NC}"

# ------------------------------------------------------------------------------
# 3. Artifact Registry Setup
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}2. Verifying Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${YELLOW}   └─ Creating Docker repository '$REPOSITORY' in $REGION...${NC}"
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for PR Code Auditor AI" \
    --project="$PROJECT_ID" --quiet
else
  echo -e "${GREEN}   └─ Repository '$REPOSITORY' verified.${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Service Account & IAM Permissions Setup
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}3. Configuring Service Account & IAM...${NC}"
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${YELLOW}   └─ Creating Service Account '$SERVICE_ACCOUNT_NAME'...${NC}"
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="Service Account for PR Code Auditor AI Services" \
    --project="$PROJECT_ID" --quiet
else
  echo -e "${GREEN}   └─ Service Account '$SERVICE_ACCOUNT_NAME' verified.${NC}"
fi

ROLES=(
  "roles/logging.logWriter"
  "roles/secretmanager.secretAccessor"
  "roles/aiplatform.user"
)

for role in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role" \
    --quiet &>/dev/null
done
echo -e "${GREEN}   └─ IAM policy bindings granted to $SA_EMAIL.${NC}"

# ------------------------------------------------------------------------------
# 5. Secret Manager Setup (GEMINI_API_KEY & GITHUB_TOKEN)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}4. Managing GCP Secret Manager credentials...${NC}"

setup_secret() {
  local secret_name="$1"
  local env_var_val="$2"
  local prompt_label="$3"

  if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}   └─ Creating secret '$secret_name'...${NC}"
    
    local secret_val="$env_var_val"
    if [ -z "$secret_val" ]; then
      echo -n -e "${BOLD}Enter value for $prompt_label: ${NC}"
      read -r -s secret_val
      echo ""
    fi

    if [ -z "$secret_val" ]; then
      echo -e "${YELLOW}⚠️ Empty value entered. Creating initial placeholder secret.${NC}"
      secret_val="CHANGE_ME"
    fi

    echo -n "$secret_val" | gcloud secrets create "$secret_name" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID" --quiet
  else
    echo -e "${GREEN}   └─ Secret '$secret_name' verified in Secret Manager.${NC}"
  fi
}

setup_secret "gemini-api-key" "${GEMINI_API_KEY:-}" "GEMINI_API_KEY"
setup_secret "github-token" "${GITHUB_TOKEN:-${GITHUB_PERSONAL_ACCESS_TOKEN:-}}" "GITHUB_TOKEN / GITHUB_PERSONAL_ACCESS_TOKEN"

# ------------------------------------------------------------------------------
# 6. Deploy Service 1: FastMCP GitHub Server
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}5. Deploying FastMCP GitHub Server to Cloud Run...${NC}"

gcloud builds submit "$ROOT_DIR" \
  --config="$SCRIPT_DIR/mcp-server/cloudbuild.yaml" \
  --substitutions="_LOCATION=$REGION,_REPOSITORY=$REPOSITORY,_SERVICE_NAME=mcp-server-github,_SERVICE_ACCOUNT=$SA_EMAIL" \
  --project="$PROJECT_ID" --quiet

MCP_SERVER_URL=$(gcloud run services describe mcp-server-github --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$MCP_SERVER_URL" ]; then
  echo -e "${RED}❌ Error retrieving URL for mcp-server-github.${NC}"
  exit 1
fi
echo -e "   └─ FastMCP Server URL: ${CYAN}${BOLD}${MCP_SERVER_URL}/mcp${NC}"

# ------------------------------------------------------------------------------
# 7. Deploy Service 2: ADK Agent Backend
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}6. Deploying ADK Agent Backend Server to Cloud Run...${NC}"

gcloud builds submit "$ROOT_DIR" \
  --config="$SCRIPT_DIR/agent-server/cloudbuild.yaml" \
  --substitutions="_LOCATION=$REGION,_REPOSITORY=$REPOSITORY,_SERVICE_NAME=pr-auditor-agent,_SERVICE_ACCOUNT=$SA_EMAIL,_MCP_SERVER_URL=${MCP_SERVER_URL}/mcp,_USE_VERTEXAI=true" \
  --project="$PROJECT_ID" --quiet

AGENT_SERVER_URL=$(gcloud run services describe pr-auditor-agent --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$AGENT_SERVER_URL" ]; then
  echo -e "${RED}❌ Error retrieving URL for pr-auditor-agent.${NC}"
  exit 1
fi
echo -e "   └─ ADK Agent Backend URL: ${CYAN}${BOLD}${AGENT_SERVER_URL}${NC}"

# ------------------------------------------------------------------------------
# 8. Deploy Service 3: Frontend Application
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}7. Deploying Web Frontend Application to Cloud Run...${NC}"

gcloud builds submit "$ROOT_DIR" \
  --config="$SCRIPT_DIR/frontend/cloudbuild.yaml" \
  --substitutions="_LOCATION=$REGION,_REPOSITORY=$REPOSITORY,_SERVICE_NAME=pr-auditor-frontend,_AGENT_SERVER_URL=${AGENT_SERVER_URL}" \
  --project="$PROJECT_ID" --quiet

FRONTEND_URL=$(gcloud run services describe pr-auditor-frontend --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")

# ------------------------------------------------------------------------------
# 9. Summary Dashboard
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 Cloud Run Multi-Service Deployment Completed!${NC}"
echo -e "${CYAN}${BOLD}=================================================================${NC}"
echo -e "   🌐 Frontend Web App:         ${CYAN}${BOLD}${FRONTEND_URL:-Unknown}${NC}"
echo -e "   🤖 ADK Agent API:            ${CYAN}${BOLD}${AGENT_SERVER_URL}${NC}"
echo -e "   🛠️  FastMCP Server Endpoint:     ${CYAN}${BOLD}${MCP_SERVER_URL}/mcp${NC}"
echo -e "   📍 GCP Project:              ${BOLD}${PROJECT_ID}${NC}"
echo -e "   📍 GCP Region:               ${BOLD}${REGION}${NC}"
echo -e "   🛡️ Service Account:          ${BOLD}${SA_EMAIL}${NC}"
echo -e "${CYAN}${BOLD}=================================================================${NC}\n"
