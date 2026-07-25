/**
 * ChatController (Presentation Layer)
 * Manages chat interactions, repository prompts, A2UI stream parsing, and surface mounting
 */
export class ChatController {
  constructor({ chatView, startAuditUseCase, a2uiParser, a2uiRenderer, sseRepository, demoRepository }) {
    this.chatView = chatView;
    this.startAuditUseCase = startAuditUseCase;
    this.a2uiParser = a2uiParser;
    this.a2uiRenderer = a2uiRenderer;
    this.sseRepository = sseRepository;
    this.demoRepository = demoRepository;

    this.currentRepo = null;
    this.isProcessing = false;
  }

  initialize() {
    this.bindEvents();
    this.sendInitialGreeting();
  }

  bindEvents() {
    this.chatView.elements.tabDashboardBtn.addEventListener('click', () => {
      this.chatView.switchTab('dashboard');
    });

    this.chatView.elements.tabChatBtn.addEventListener('click', () => {
      this.chatView.switchTab('chat');
    });

    this.chatView.elements.sendChatBtn.addEventListener('click', () => {
      this.handleSendMessage();
    });

    this.chatView.elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
  }

  sendInitialGreeting() {
    const greetingText = `👋 Hello! I am your code audit assistant powered by multi-agent intelligence (Google ADK, FastMCP & A2UI Protocol).
Please provide the GitHub repository you wish to audit (e.g., \`octocat/Hello-World\` or \`https://github.com/owner/repo\`).`;

    this.chatView.appendAgentMessage('pr_auditor_agent', greetingText);
  }

  async handleSendMessage() {
    if (this.isProcessing) return;

    const userText = this.chatView.getChatInput();
    if (!userText) return;

    this.chatView.clearChatInput();
    this.chatView.appendUserMessage(userText);

    this.isProcessing = true;
    this.chatView.setChatLoading(true);

    try {
      const parsedRepo = this.startAuditUseCase.parseRepoInput(userText);
      this.currentRepo = parsedRepo.full;

      this.chatView.appendAgentMessage(
        'pr_investigator_agent',
        `🔎 Starting code audit for repository '${this.currentRepo}'. Specialized agents will inspect PRs and source code files...`
      );

      const isConnected = await this.sseRepository.checkHealth();
      const activeRepo = isConnected ? this.sseRepository : this.demoRepository;
      this.startAuditUseCase.auditRepository = activeRepo;

      await this.startAuditUseCase.execute(this.currentRepo, {
        onEvent: (ev) => this.handleAgentEvent(ev),
        onComplete: (auditReport) => this.handleAuditComplete(auditReport),
        onError: (err) => this.handleAuditError(err, this.currentRepo),
      });

    } catch (err) {
      this.handleAuditError(err, this.currentRepo);
    } finally {
      this.chatView.setChatLoading(false);
      this.isProcessing = false;
    }
  }

  handleAgentEvent(event) {
    const author = event.author || 'Agent';
    const text = event.message || '';

    const { cleanText, surfaces } = this.a2uiParser.extractA2uiBlocks(text);

    let surfaceNode = null;
    if (surfaces.length > 0) {
      surfaceNode = this.a2uiRenderer.renderSurface(surfaces[0]);
    }

    if (cleanText || surfaceNode) {
      this.chatView.appendAgentMessage(author, cleanText, surfaceNode);
    }
  }

  handleAuditComplete(auditReport) {
    const a2uiRawJson = this.a2uiParser.createAuditReportA2ui({
      repository: auditReport.repository,
      overall_quality_score: auditReport.overallQualityScore,
      audit_summary: auditReport.auditSummary,
      security_assessment: auditReport.securityAssessment,
      solid_compliance_notes: auditReport.solidComplianceNotes,
      issues: auditReport.issues.map(i => ({
        severity: i.severity,
        file_path: i.filePath,
        line_number: i.lineNumber,
        summary: i.summary,
        recommendation: i.recommendation,
      })),
    });

    const { cleanText, surfaces } = this.a2uiParser.extractA2uiBlocks(a2uiRawJson);
    let surfaceNode = null;
    if (surfaces.length > 0) {
      surfaceNode = this.a2uiRenderer.renderSurface(surfaces[0]);
    }

    const completionText = `✅ Audit completed successfully. The interactive A2UI surface has been generated (A2UI Protocol v0.9):`;
    this.chatView.appendAgentMessage('pr_report_agent', completionText, surfaceNode);
  }

  async handleAuditError(err, repoFull) {
    this.chatView.appendAgentMessage(
      'SYSTEM',
      `⚠️ Backend offline. Running in Demo Mode with A2UI Protocol...`
    );

    this.startAuditUseCase.auditRepository = this.demoRepository;
    await this.startAuditUseCase.execute(repoFull || 'octocat/Hello-World', {
      onEvent: (ev) => this.handleAgentEvent(ev),
      onComplete: (report) => this.handleAuditComplete(report),
      onError: () => {},
    });
  }
}
