/**
 * Application Composition Root (Clean Architecture Entrypoint)
 * Wires up Domain, Use Cases, Infrastructure (including A2A Protocol & A2UI), and Presentation layers
 */
import { A2aAuditRepository } from './infrastructure/A2aAuditRepository.js';
import { SseAuditRepository } from './infrastructure/SseAuditRepository.js';
import { DemoAuditRepository } from './infrastructure/DemoAuditRepository.js';
import { Html2PdfExporter } from './infrastructure/Html2PdfExporter.js';
import { A2uiParser } from './infrastructure/A2uiParser.js';
import { A2uiRenderer } from './infrastructure/A2uiRenderer.js';

import { StartAuditUseCase } from './usecases/StartAuditUseCase.js';
import { ExportPdfUseCase } from './usecases/ExportPdfUseCase.js';
import { FilterIssuesUseCase } from './usecases/FilterIssuesUseCase.js';

import { AuditView } from './presentation/views/AuditView.js';
import { AuditController } from './presentation/controllers/AuditController.js';
import { ChatView } from './presentation/views/ChatView.js';
import { ChatController } from './presentation/controllers/ChatController.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Infrastructure Layer (A2A Protocol & SSE Repositories)
  const agentUrl = window.ENV_AGENT_SERVER_URL || window.AGENT_SERVER_URL || 'http://localhost:8000';
  const a2aRepository = new A2aAuditRepository(agentUrl);
  const sseRepository = new SseAuditRepository(agentUrl);
  const demoRepository = new DemoAuditRepository();
  const pdfExporter = new Html2PdfExporter();
  const a2uiParser = new A2uiParser();
  const a2uiRenderer = new A2uiRenderer();

  // 2. Use Cases Layer
  const startAuditUseCase = new StartAuditUseCase(a2aRepository);
  const exportPdfUseCase = new ExportPdfUseCase(pdfExporter);
  const filterIssuesUseCase = new FilterIssuesUseCase();

  // 3. Presentation Layer - Dashboard View & Controller
  const view = new AuditView();
  const controller = new AuditController({
    view,
    startAuditUseCase,
    exportPdfUseCase,
    filterIssuesUseCase,
    sseRepository: a2aRepository,
    demoRepository,
  });

  // 4. Presentation Layer - A2UI Chat View & Controller
  const chatView = new ChatView();
  const chatController = new ChatController({
    chatView,
    startAuditUseCase,
    a2uiParser,
    a2uiRenderer,
    sseRepository: a2aRepository,
    demoRepository,
  });

  // 5. Initialize Application
  await controller.initialize();
  chatController.initialize();
});
