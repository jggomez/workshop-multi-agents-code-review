# PR Auditor AI - Web Frontend Application

Aplicación web moderna e interactiva desarrollada con **HTML5, TailwindCSS y JavaScript Vanilla** para la visualización en tiempo real de la auditoría de Pull Requests realizada por la tubería de agentes **Google ADK 2.5.0** y el servidor **FastMCP**.

---

## 🎨 Características de Diseño & UX/UI

- **Diseño Moderno & Glassmorphic**: Interfaz gráfica en modo oscuro con fondos difuminados (glassmorphism), gradientes armónicos y tipografía limpia de Google Fonts (Inter + JetBrains Mono).
- **Entrada de Repositorio GitHub**: Permite al usuario ingresar una URL completa (`https://github.com/octocat/Hello-World`) o la forma abreviada (`octocat/Hello-World`). Botones rápidos para repositorios populares.
- **Visualizador de Agentes en Tiempo Real**:
  - Muestra tarjetas dedicadas para los 3 agentes de la tubería (`pr_investigator_agent`, `critical_reviewer_agent` y `pr_report_agent`).
  - Animación de estado en vivo (`Pensando...`, `Ejecutando MCP`, `Revisando Loop`, `Completado`) con barra de progreso global.
- **Consola de Eventos Streaming (ADK SSE Feed)**: Muestra en directo los pensamientos del modelo, las llamadas a las herramientas del servidor FastMCP y las respuestas recibidas.
- **Reporte Técnico Organizado**:
  - Indicador circular de Puntuación de Calidad (0 - 100) con código de colores (Verde >80, Amarillo 60-79, Rojo <60) y veredicto.
  - Tarjetas de Resumen Ejecutivo, Evaluación de Seguridad OWASP y Cumplimiento SOLID.
  - Lista interactiva de hallazgos con filtrado dinámico por criticidad (`Todos`, `Critical`, `High`, `Medium`, `Low`).
- **Exportación a PDF**: Botón dedicado que utiliza la librería `html2pdf.js` para descargar el reporte estructurado en formato PDF.
- **Modo Demo Interactivo Integrado**: Permite probar la experiencia completa en tiempo real de forma offline o para demostraciones instantáneas.

---

## 🚀 Ejecución Local

### 1. Iniciar el Servidor Frontend (Puerto 3000)

```bash
cd pr-auditor-frontend
python3 -m http.server 3000
```

Abre en tu navegador la dirección: [http://localhost:3000](http://localhost:3000)

---

## 🔗 Integración con el Backend (ADK FastAPI)

El frontend se conecta vía `fetch` con Server-Sent Events (SSE) al endpoint del backend ADK:
- **Endpoint**: `POST http://localhost:8000/run_sse`
