# 🏗️ PR Code Auditor AI - Infraestructura & Despliegue en GCP Cloud Run

Este directorio contiene la arquitectura de infraestructura como código y contenedores optimizados para desplegar los tres microservicios de **PR Code Auditor AI** en **Google Cloud Run**.

---

## 🏛️ Arquitectura de Servicios

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│   pr-auditor-frontend     │─────>│     pr-auditor-agent      │─────>│     mcp-server-github     │
│   (Cloud Run - Nginx)     │      │ (Cloud Run - ADK Backend) │      │  (Cloud Run - FastMCP)    │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

1. **FastMCP GitHub Server (`mcp-server-github`)**:
   - Servidor MCP (Model Context Protocol) expuesto sobre HTTP streamable (puerto 8085).
   - Accede a la API de GitHub para inspeccionar PRs, archivos y difs.
2. **ADK Agent Backend (`pr-auditor-agent`)**:
   - Backend FastAPI desarrollado con Google ADK (Agent Development Kit) y soporte A2A/SSE (puerto 8000).
   - Conecta con `mcp-server-github` a través de la variable `MCP_SERVER_URL`.
3. **Web Frontend (`pr-auditor-frontend`)**:
   - Aplicación web estática servida por Nginx Alpine (puerto 8080).
   - Inyecta dinámicamente la URL del backend ADK (`AGENT_SERVER_URL`) en tiempo de ejecución.

---

## 📁 Estructura del Directorio `infrastructure`

```
infrastructure/
├── mcp-server/
│   ├── Dockerfile            # Multi-stage Python 3.12 + uv optimizado
│   └── cloudbuild.yaml       # Pipeline de CI/CD para FastMCP Server
├── agent-server/
│   ├── Dockerfile            # Multi-stage Python 3.12 + uv para ADK FastAPI
│   └── cloudbuild.yaml       # Pipeline de CI/CD para ADK Agent Server
├── frontend/
│   ├── Dockerfile            # Nginx Alpine con dynamic PORT & config injection
│   ├── nginx.conf.template   # Plantilla Nginx con soporte envsubst
│   ├── docker-entrypoint.sh  # Script de inyección runtime para AGENT_SERVER_URL
│   └── cloudbuild.yaml       # Pipeline de CI/CD para Web Frontend
├── deploy.sh                 # Script shell interactivo de despliegue automatizado
└── README.md                 # Documentación técnica
```

---

## 🚀 Despliegue Automatizado

### Requisitos Previos

1. **Google Cloud SDK (`gcloud` CLI)** instalado y autenticado (`gcloud auth login`).
2. Un **Proyecto en GCP** activo con permisos de administración/despliegue.

### Ejecución del Despliegue

Puedes ejecutar el script de despliegue interactivo desde la raíz del proyecto o desde el directorio `infrastructure`:

```bash
# Opción 1: Desde la raíz del repositorio
./deploy.sh

# Opción 2: Pasando el GCP Project ID como parámetro
./deploy.sh --project tu-gcp-project-id --region us-central1
```

### Lo que realiza el script automatizado (`deploy.sh`):

1. **Solicitud de Project ID**: Si no se proporciona por variable de entorno (`GCP_PROJECT_ID`) o parámetro `--project`, lo solicita de forma interactiva.
2. **Habilitación de APIs en GCP**:
   - `run.googleapis.com` (Cloud Run)
   - `cloudbuild.googleapis.com` (Cloud Build)
   - `artifactregistry.googleapis.com` (Artifact Registry)
   - `iam.googleapis.com` (IAM)
   - `secretmanager.googleapis.com` (Secret Manager)
   - `serviceusage.googleapis.com`
3. **Repositorio Artifact Registry**: Crea el repositorio Docker `pr-auditor-repo` en la región seleccionada.
4. **Service Account e IAM**: Crea `pr-auditor-sa` y le asigna los roles necesarios (`logWriter`, `secretAccessor`, `aiplatform.user`).
5. **Secret Manager**: Configura de forma segura los secretos `gemini-api-key` y `github-token`.
6. **Despliegue Secuencial**:
   - Despliega `mcp-server-github` y obtiene su URL pública.
   - Despliega `pr-auditor-agent` enlazando la URL del MCP Server (`MCP_SERVER_URL`).
   - Despliega `pr-auditor-frontend` enlazando la URL del Agent Backend (`AGENT_SERVER_URL`).

---

## 🔒 Seguridad y Buenas Prácticas

- **Principios Non-Root**: Los contenedores ejecutan bajo usuarios sin privilegios (`appuser` con UID 1000).
- **Gestión de Secretos**: Ningún secreto está hardcodeado; se utilizan referencias a GCP Secret Manager (`gemini-api-key`, `github-token`).
- **Inyección Dinámica de Puertos**: Los contenedores respetan la variable `$PORT` inyectada dinámicamente por Cloud Run.
