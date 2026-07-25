/**
 * AuditController (Presentation Layer)
 * Coordinates user actions, Use Cases, and View rendering
 */
import { AgentState } from '../../domain/entities/AgentState.js';

export class AuditController {
  constructor({ view, startAuditUseCase, exportPdfUseCase, filterIssuesUseCase, sseRepository, demoRepository }) {
    this.view = view;
    this.startAuditUseCase = startAuditUseCase;
    this.exportPdfUseCase = exportPdfUseCase;
    this.filterIssuesUseCase = filterIssuesUseCase;
    this.sseRepository = sseRepository;
    this.demoRepository = demoRepository;

    this.isAuditing = false;
    this.currentReport = null;
    this.activeFilter = 'all';
  }

  async initialize() {
    this.bindEvents();
    await this.checkBackendStatus();
  }

  async checkBackendStatus() {
    const isConnected = await this.sseRepository.checkHealth();
    this.view.setBackendStatus(isConnected);
    return isConnected;
  }

  bindEvents() {
    this.view.elements.startBtn.addEventListener('click', () => this.handleStartAudit(false));
    this.view.elements.demoBtn.addEventListener('click', () => this.handleStartAudit(true));

    this.view.elements.presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const repo = e.currentTarget.dataset.repo;
        this.view.setRepoInput(repo);
        this.handleStartAudit(false);
      });
    });

    this.view.elements.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.handleFilterChange(filter);
      });
    });

    if (this.view.elements.clearTerminalBtn) {
      this.view.elements.clearTerminalBtn.addEventListener('click', () => this.view.clearTerminal());
    }

    if (this.view.elements.exportPdfBtn) {
      this.view.elements.exportPdfBtn.addEventListener('click', () => this.handleExportPdf());
    }
  }

  async handleStartAudit(forceDemo = false) {
    if (this.isAuditing) return;

    const rawInput = this.view.getRepoInput() || 'octocat/Hello-World';
    this.isAuditing = true;
    this.currentReport = null;
    this.activeFilter = 'all';

    this.view.resetUi();
    this.view.setLoadingState(true);

    const isConnected = await this.checkBackendStatus();
    const useDemo = forceDemo || !isConnected;

    // Inject appropriate repository implementation based on connectivity / demo flag
    const activeRepo = useDemo ? this.demoRepository : this.sseRepository;
    this.startAuditUseCase.auditRepository = activeRepo;

    this.view.appendLog({
      author: 'SYSTEM',
      message: `Starting audit for '${rawInput}' (${useDemo ? 'Demo / Simulation Mode' : 'Connected to ADK Backend'})...`,
    });

    try {
      await this.startAuditUseCase.execute(rawInput, {
        onEvent: (event) => this.handleStreamEvent(event),
        onComplete: (auditReportEntity) => this.handleAuditComplete(auditReportEntity),
        onError: (err) => this.handleAuditError(err, rawInput),
      });
    } catch (err) {
      this.handleAuditError(err, rawInput);
    } finally {
      this.view.setLoadingState(false);
      this.isAuditing = false;
    }
  }

  handleStreamEvent(event) {
    const author = (event.author || '').toLowerCase();

    if (author.includes('investigator')) {
      this.view.setActiveAgent(AgentState.INVESTIGATOR, 'Analyzing source code & querying FastMCP server...', 35);
    } else if (author.includes('critic') || author.includes('reviewer')) {
      this.view.setActiveAgent(AgentState.CRITIC, 'Evaluating findings & verifying omissions...', 65);
    } else if (author.includes('report')) {
      this.view.setActiveAgent(AgentState.REPORT, 'Synthesizing structured Pydantic output...', 90);
    }

    this.view.appendLog(event);
  }

  handleAuditComplete(auditReportEntity) {
    this.currentReport = auditReportEntity;
    this.view.setActiveAgent(AgentState.REPORT, 'Audit completed successfully.', 100);
    this.view.appendLog({ author: 'SYSTEM', message: '✅ Execution finished. Structured report generated.' });
    this.view.renderReport(auditReportEntity);
  }

  async handleAuditError(err, rawInput) {
    this.view.appendLog({
      author: 'SYSTEM',
      message: `⚠️ Streaming error: ${err.message}. Running in Demo Mode...`,
    });

    // Fallback to demo simulation repository
    this.startAuditUseCase.auditRepository = this.demoRepository;
    await this.startAuditUseCase.execute(rawInput, {
      onEvent: (ev) => this.handleStreamEvent(ev),
      onComplete: (report) => this.handleAuditComplete(report),
      onError: () => {},
    });
  }

  handleFilterChange(filter) {
    this.activeFilter = filter;
    this.view.setSelectedFilterButton(filter);

    if (this.currentReport) {
      const filteredIssues = this.filterIssuesUseCase.execute(this.currentReport.issues, filter);
      this.view.renderIssues(filteredIssues);
    }
  }

  async handleExportPdf() {
    if (!this.currentReport) return;
    try {
      this.view.appendLog({ author: 'SYSTEM', message: 'Generating high-quality PDF audit document...' });
      await this.exportPdfUseCase.execute(this.currentReport);
      this.view.appendLog({ author: 'SYSTEM', message: '✅ Audit report exported to PDF successfully.' });
    } catch (err) {
      this.view.appendLog({ author: 'SYSTEM', message: `❌ Error exporting PDF: ${err.message}` });
    }
  }
}
