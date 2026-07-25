# GitHub FastMCP Server

Un servidor MCP en Python desarrollado con **FastMCP** y gestionado con **`uv`**, que permite interactuar con repositorios de GitHub (públicos y privados).

## Herramientas Disponibles

1. **`list_open_pull_requests(owner: str, repo: str)`**
   - **Description**: List open Pull Requests of a repository for review.
   - **Parámetros**:
     - `owner`: Propietario de la cuenta/organización en GitHub (ej. `octocat`).
     - `repo`: Nombre del repositorio (ej. `Hello-World`).

2. **`get_file_content(owner: str, repo: str, path: str, ref: Optional[str] = None)`**
   - **Description**: Get the content of a specific file from a public/private GitHub repository. Use this to inspect source code, Dockerfiles, or workflow YAMLs.
   - **Parámetros**:
     - `owner`: Propietario del repositorio.
     - `repo`: Nombre del repositorio.
     - `path`: Ruta relativa del archivo (ej. `src/main.py`, `Dockerfile`, `.github/workflows/ci.yml`).
     - `ref` *(opcional)*: Rama, etiqueta (tag) o commit SHA. Por defecto usa la rama principal del repositorio.

---

## Requisitos y Configuración

### 1. Variables de entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```env
GITHUB_PERSONAL_ACCESS_TOKEN=tu_personal_access_token_de_github
```

> **Nota**: Para repositorios públicos no es estrictamente obligatorio el token, pero incluirlo incrementa el límite de peticiones de la API de GitHub. Para repositorios privados, el token debe tener permisos de acceso a repositorios (`repo` scope).

### 2. Instalación de Dependencias

Este proyecto usa [`uv`](https://github.com/astral-sh/uv) para la gestión rápida de entornos y dependencias:

```bash
uv sync
```

---

## Ejecución

### 1. Ejecución como HTTP Streamable (Por defecto)

Para iniciar el servidor MCP como servicio HTTP streaming (con Uvicorn):

```bash
uv run mcp-server-github --transport streamable-http --host 0.0.0.0 --port 8085
```

El endpoint del protocolo MCP estará disponible en `http://localhost:8085/mcp`.

Variables de entorno opcionales:
- `MCP_TRANSPORT`: `streamable-http`, `sse`, o `stdio`.
- `MCP_HOST`: Dirección IP donde escuchar (ej. `0.0.0.0` o `127.0.0.1`).
- `MCP_PORT`: Puerto (por defecto: `8085`).

### 2. Ejecución vía Stdio (Para Clientes MCP estándar como Claude Desktop)

Si tu cliente MCP ejecuta el servidor mediante procesos stdio directos:

```bash
uv run mcp-server-github --transport stdio
```

```json
{
  "mcpServers": {
    "github": {
      "command": "uv",
      "args": [
        "--directory",
        "/ruta/completa/a/mcp-server-github",
        "run",
        "mcp-server-github",
        "--transport",
        "stdio"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "tu_token_aqui"
      }
    }
  }
}
```

---

## Pruebas (TDD)

El proyecto incluye pruebas unitarias y pruebas de integración usando el cliente stdio oficial de MCP (`mcp.client.stdio`):

```bash
# Ejecutar todas las pruebas (unitarias e integración)
uv run pytest -v

# Ejecutar solo las pruebas de integración (conectándose al servidor MCP vía stdio)
uv run pytest tests/test_integration.py -v
```
