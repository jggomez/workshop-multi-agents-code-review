/**
 * AuditView (Presentation Layer)
 * Manages DOM manipulation and UI rendering
 */
export class AuditView {
  constructor() {
    this.elements = {
      backendStatusBadge: document.getElementById('backendStatusBadge'),
      repoInput: document.getElementById('repoInput'),
      startBtn: document.getElementById('startBtn'),
      demoBtn: document.getElementById('demoBtn'),
      presetBtns: document.querySelectorAll('.preset-btn'),
      
      cardInvestigator: document.getElementById('cardInvestigator'),
      cardCritic: document.getElementById('cardCritic'),
      cardReport: document.getElementById('cardReport'),
      
      statusInvestigator: document.getElementById('statusInvestigator'),
      statusCritic: document.getElementById('statusCritic'),
      statusReport: document.getElementById('statusReport'),
      
      progressBar: document.getElementById('progressBar'),
      progressText: document.getElementById('progressText'),
      
      terminalConsole: document.getElementById('terminalConsole'),
      clearTerminalBtn: document.getElementById('clearTerminalBtn'),
      
      reportSection: document.getElementById('reportSection'),
      reportContainer: document.getElementById('reportContainer'),
      scoreBadge: document.getElementById('scoreBadge'),
      scoreValue: document.getElementById('scoreValue'),
      scoreLabel: document.getElementById('scoreLabel'),
      verdictBadge: document.getElementById('verdictBadge'),
      summaryText: document.getElementById('summaryText'),
      securityText: document.getElementById('securityText'),
      solidText: document.getElementById('solidText'),
      issuesContainer: document.getElementById('issuesContainer'),
      issuesCountBadge: document.getElementById('issuesCountBadge'),
      filterBtns: document.querySelectorAll('.filter-btn'),
      exportPdfBtn: document.getElementById('exportPdfBtn'),
    };
  }

  setBackendStatus(isConnected) {
    if (isConnected) {
      this.elements.backendStatusBadge.innerHTML = `
        <span class="relative flex h-2.5 w-2.5 mr-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span class="text-xs font-semibold text-emerald-400">ADK Backend Conectado (8000)</span>
      `;
    } else {
      this.elements.backendStatusBadge.innerHTML = `
        <span class="relative flex h-2.5 w-2.5 mr-2">
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <span class="text-xs font-semibold text-amber-400">Modo Demo / Servidor Inactivo</span>
      `;
    }
  }

  getRepoInput() {
    return this.elements.repoInput.value.trim();
  }

  setRepoInput(val) {
    this.elements.repoInput.value = val;
  }

  resetUi() {
    this.elements.terminalConsole.innerHTML = '';
    this.elements.reportSection.classList.add('hidden');
    this.updateProgress(0, 'Initializing agent pipeline...');

    [this.elements.cardInvestigator, this.elements.cardCritic, this.elements.cardReport].forEach(card => {
      card.className = 'glass-card p-5 rounded-2xl border border-slate-800 transition-all duration-300';
    });

    this.elements.statusInvestigator.innerHTML = `<span class="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-400 border border-slate-700">Idle</span>`;
    this.elements.statusCritic.innerHTML = `<span class="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-400 border border-slate-700">Idle</span>`;
    this.elements.statusReport.innerHTML = `<span class="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-400 border border-slate-700">Idle</span>`;
  }

  updateProgress(percent, label) {
    this.elements.progressBar.style.width = `${percent}%`;
    this.elements.progressText.innerText = `${percent}% - ${label}`;
  }

  setLoadingState(isLoading) {
    if (isLoading) {
      this.elements.startBtn.disabled = true;
      this.elements.demoBtn.disabled = true;
      this.elements.startBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Auditing...`;
    } else {
      this.elements.startBtn.disabled = false;
      this.elements.demoBtn.disabled = false;
      this.elements.startBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart mr-2"></i>Audit Pull Requests`;
    }
  }

  setActiveAgent(agentType, statusMessage, progressPercent) {
    this.updateProgress(progressPercent, statusMessage);

    this.elements.cardInvestigator.classList.remove('agent-card-active');
    this.elements.cardCritic.classList.remove('agent-card-active');
    this.elements.cardReport.classList.remove('agent-card-active');

    if (agentType === 'investigator') {
      this.elements.cardInvestigator.classList.add('agent-card-active');
      this.elements.statusInvestigator.innerHTML = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Analyzing</span>`;
    } else if (agentType === 'critic') {
      this.elements.cardInvestigator.classList.add('agent-card-completed');
      this.elements.statusInvestigator.innerHTML = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><i class="fa-solid fa-check mr-1"></i>Investigated</span>`;

      this.elements.cardCritic.classList.add('agent-card-active');
      this.elements.statusCritic.innerHTML = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse"><i class="fa-solid fa-scale-balanced mr-1"></i>Reviewing Loop</span>`;
    } else if (agentType === 'report') {
      this.elements.cardInvestigator.classList.add('agent-card-completed');
      this.elements.cardCritic.classList.add('agent-card-completed');
      this.elements.statusCritic.innerHTML = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><i class="fa-solid fa-check mr-1"></i>Approved</span>`;

      this.elements.cardReport.classList.add('agent-card-active');
      this.elements.statusReport.innerHTML = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><i class="fa-solid fa-check mr-1"></i>Completed</span>`;
    }
  }

  appendLog({ author, message }) {
    const timestamp = new Date().toLocaleTimeString();
    const logItem = document.createElement('div');
    logItem.className = 'py-1 border-b border-slate-900/60 flex items-start space-x-2 text-xs leading-relaxed';

    let authorColor = 'text-indigo-400 font-semibold';
    let badgeIcon = 'fa-robot';

    if (author.includes('investigator')) {
      authorColor = 'text-sky-400 font-semibold';
      badgeIcon = 'fa-magnifying-glass';
    } else if (author.includes('critic') || author.includes('reviewer')) {
      authorColor = 'text-purple-400 font-semibold';
      badgeIcon = 'fa-scale-balanced';
    } else if (author.includes('report')) {
      authorColor = 'text-emerald-400 font-semibold';
      badgeIcon = 'fa-file-contract';
    } else if (author === 'SYSTEM') {
      authorColor = 'text-amber-400 font-semibold';
      badgeIcon = 'fa-gear';
    }

    logItem.innerHTML = `
      <span class="text-slate-500 shrink-0 font-mono">${timestamp}</span>
      <span class="${authorColor} shrink-0 flex items-center">
        <i class="fa-solid ${badgeIcon} mr-1"></i>[${author}]:
      </span>
      <span class="text-slate-200 font-mono break-all">${this.escapeHtml(message)}</span>
    `;

    this.elements.terminalConsole.appendChild(logItem);
    this.elements.terminalConsole.scrollTop = this.elements.terminalConsole.scrollHeight;
  }

  clearTerminal() {
    this.elements.terminalConsole.innerHTML = `
      <div class="text-slate-500 italic py-2">Event console cleared. Awaiting next turns...</div>
    `;
  }

  renderReport(auditReportEntity) {
    this.elements.reportSection.classList.remove('hidden');
    this.elements.reportSection.scrollIntoView({ behavior: 'smooth' });

    const score = auditReportEntity.overallQualityScore;
    const verdict = auditReportEntity.getVerdict();

    this.elements.scoreValue.innerText = score;
    
    if (score >= 80) {
      this.elements.scoreBadge.className = "w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20";
      this.elements.scoreLabel.innerText = "Excellent Quality";
      this.elements.verdictBadge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      this.elements.verdictBadge.innerHTML = `<i class="fa-solid fa-circle-check mr-1.5"></i>${verdict.label}`;
    } else if (score >= 60) {
      this.elements.scoreBadge.className = "w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 border-amber-500 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/20";
      this.elements.scoreLabel.innerText = "Requires Refinement";
      this.elements.verdictBadge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30";
      this.elements.verdictBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5"></i>${verdict.label}`;
    } else {
      this.elements.scoreBadge.className = "w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 border-rose-500 bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/20";
      this.elements.scoreLabel.innerText = "Critical Risk";
      this.elements.verdictBadge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30";
      this.elements.verdictBadge.innerHTML = `<i class="fa-solid fa-ban mr-1.5"></i>${verdict.label}`;
    }

    this.elements.summaryText.innerText = auditReportEntity.auditSummary;
    this.elements.securityText.innerText = auditReportEntity.securityAssessment;
    this.elements.solidText.innerText = auditReportEntity.solidComplianceNotes;

    this.renderIssues(auditReportEntity.issues);
  }

  renderIssues(issuesList) {
    this.elements.issuesCountBadge.innerText = `${issuesList.length} findings`;
    this.elements.issuesContainer.innerHTML = '';

    if (issuesList.length === 0) {
      this.elements.issuesContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
          <i class="fa-solid fa-shield-check text-3xl text-emerald-400 mb-2"></i>
          <p>No findings found for this filter.</p>
        </div>
      `;
      return;
    }

    issuesList.forEach(issue => {
      let sevClass = "bg-slate-800 text-slate-300 border-slate-700";
      let sevIcon = "fa-info-circle";

      const sevLower = issue.severity;
      if (sevLower === "critical") {
        sevClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";
        sevIcon = "fa-radiation";
      } else if (sevLower === "high") {
        sevClass = "bg-orange-500/20 text-orange-300 border-orange-500/30";
        sevIcon = "fa-triangle-exclamation";
      } else if (sevLower === "medium") {
        sevClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
        sevIcon = "fa-circle-exclamation";
      } else if (sevLower === "low") {
        sevClass = "bg-sky-500/20 text-sky-300 border-sky-500/30";
        sevIcon = "fa-bug";
      }

      const card = document.createElement("div");
      card.className = "glass-card p-5 rounded-xl border border-slate-800 space-y-3";

      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${sevClass} flex items-center">
              <i class="fa-solid ${sevIcon} mr-1.5"></i>${issue.severity.toUpperCase()}
            </span>
            <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800">
              ${this.escapeHtml(issue.filePath)}:${issue.lineNumber || "N/A"}
            </span>
          </div>
          <span class="text-xs text-slate-400 capitalize font-medium">${this.escapeHtml(issue.issueType.replace('_', ' '))}</span>
        </div>

        <h4 class="text-sm font-bold text-slate-100">${this.escapeHtml(issue.summary)}</h4>
        <p class="text-xs text-slate-300 leading-relaxed">${this.escapeHtml(issue.description)}</p>

        <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
          <span class="font-semibold text-emerald-400 flex items-center mb-1">
            <i class="fa-solid fa-lightbulb mr-1.5"></i>Recomendación:
          </span>
          <span class="text-slate-300">${this.escapeHtml(issue.recommendation)}</span>
        </div>
      `;

      this.elements.issuesContainer.appendChild(card);
    });
  }

  setSelectedFilterButton(activeFilter) {
    this.elements.filterBtns.forEach(btn => {
      if (btn.dataset.filter === activeFilter) {
        btn.className = "filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20";
      } else {
        btn.className = "filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700";
      }
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
