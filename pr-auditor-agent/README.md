# PR Auditor Agent (Google ADK)

Un agente inteligente desarrollado con **Google Agent Development Kit (ADK 2.5.0)** que realiza auditorías automáticas de código en Pull Requests de GitHub, conectándose al servidor FastMCP creado en Python a través del protocolo **Streamable HTTP**, utilizando un **patrón de revisión crítica iterativa (`LoopAgent`)**.

---

## 🏗️ Arquitectura del Agente

El agente está estructurado combinando `SequentialAgent` y `LoopAgent` con salida estructurada Pydantic:

### 🔄 Bucle de Refinamiento Iterativo (`refinement_loop` - `LoopAgent`)
1. **`pr_investigator_agent`** (Modelo: `gemini-2.5-flash-lite`):
   - **Rol**: Senior Code Security & Quality Auditor.
   - **Herramientas**: Conectado vía `McpToolset` (`StreamableHTTPConnectionParams`) a `http://127.0.0.1:8085/mcp`.
   - **Función**: Inspecciona los PRs abiertos, lee archivos con `get_file_content` y realiza la detección inicial de vulnerabilidades, code smells y violaciones SOLID. Si hay retroalimentación del revisor crítico en la sesión, la subsana.

2. **`critical_reviewer_agent`** (Modelo: `gemini-2.5-flash`):
   - **Rol**: Principal Code Audit Critic & QA Lead.
   - **Herramientas**: `McpToolset` + Herramienta de aprobación `approve_audit`.
   - **Función**: Revisa de forma independiente el repositorio y los hallazgos del investigador.
     - **Si detecta omisiones**: Genera feedback constructivo y solicita otra iteración en el bucle.
     - **Si los hallazgos están completos**: Invoca `approve_audit()` (que establece `tool_context.actions.escalate = True`) para salir del bucle de refinamiento.

---

### 📄 Generador de Reporte Estructurado (`pr_report_agent`)
- **Rol**: Technical Audit Report Generator.
- **Esquema de Salida Estructurado**: `PRCodeAuditReport` (Pydantic).
- Genera el reporte final en JSON estructurado con `overall_quality_score`, lista detallada de `issues` (`CodeIssue`), evaluación de seguridad y conclusión.

---

## 🛠️ Requisitos y Configuración

### 1. Variables de Entorno (`.env`)

```env
# Configuración de Modelos
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_CRITIC_MODEL=gemini-2.5-flash

# Vertex AI Configuration
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=vibe-check-devhack
GOOGLE_CLOUD_LOCATION=us-central1

# Servidor MCP (FastMCP)
MCP_SERVER_URL=http://127.0.0.1:8085/mcp
```

### 2. Iniciar el Servidor MCP

Antes de ejecutar el agente o las evaluaciones, inicia el servidor MCP en segundo plano:

```bash
cd ../mcp-server-github
uv run mcp-server-github --transport streamable-http --host 0.0.0.0 --port 8085
```

---

## 🌐 API Streaming (Servidor FastAPI)

El agente expone endpoints de streaming HTTP (Server-Sent Events) listos para integrarse con cualquier cliente frontend:

```bash
# Iniciar el servidor FastAPI en el puerto 8000
uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000
```

### Endpoint de Streaming SSE (`/run_sse`)
Ideal para clientes frontend. Envía peticiones POST con el cuerpo:

```json
{
  "app_name": "app",
  "user_id": "user_123",
  "session_id": "session_123",
  "new_message": {
    "role": "user",
    "parts": [{"text": "Audit open pull requests for repository 'octocat/Hello-World'"}]
  },
  "streaming": true
}
```

---

## 🧪 Pruebas y Rúbricas de Evaluación (ADK Quality Flywheel)

### 1. Pruebas Unitarias e Integración (`pytest`)

```bash
uv run pytest tests/test_pr_auditor.py tests/integration/test_agent.py -v
```

### 2. Rúbricas de Evaluación Avanzadas (`tests/eval/eval_config.yaml`)

Se añadieron rúbricas de evaluación avanzadas:
- **`pr_report_structure_check`**: Comprueba que el reporte contenga resumen, puntuación y sección de seguridad.
- **`agent_turn_count`**: Mide la ejecución adecuada de turnos de conversación.
- **`critic_review_quality`**: Evalúa que el agente crítico participe activamente inspeccionando el repositorio y validando el reporte.

### 3. Generación y Calificación de Evaluaciones (`agents-cli eval`)

```bash
# Paso 1: Generar trazas de inferencia ejecutando el bucle multi-agente
agents-cli eval generate --dataset tests/eval/datasets/pr_auditor_dataset.json

# Paso 2: Calificar las trazas generadas con las rúbricas
agents-cli eval grade
```
