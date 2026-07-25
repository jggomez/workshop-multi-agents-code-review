/**
 * ChatView (Presentation Layer)
 * Manages Chat UI rendering, message bubbles, and A2UI surface mounting
 */
export class ChatView {
  constructor() {
    this.elements = {
      tabDashboardBtn: document.getElementById('tabDashboardBtn'),
      tabChatBtn: document.getElementById('tabChatBtn'),
      
      dashboardSection: document.getElementById('dashboardSection'),
      chatSection: document.getElementById('chatSection'),
      
      chatMessages: document.getElementById('chatMessages'),
      chatInput: document.getElementById('chatInput'),
      sendChatBtn: document.getElementById('sendChatBtn'),
      chatStatusText: document.getElementById('chatStatusText'),
    };
  }

  switchTab(tabName) {
    if (tabName === 'chat') {
      this.elements.dashboardSection.classList.add('hidden');
      this.elements.chatSection.classList.remove('hidden');
      
      this.elements.tabDashboardBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center";
      this.elements.tabChatBtn.className = "px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-600/20 transition flex items-center";
    } else {
      this.elements.chatSection.classList.add('hidden');
      this.elements.dashboardSection.classList.remove('hidden');
      
      this.elements.tabChatBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center";
      this.elements.tabDashboardBtn.className = "px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-600/20 transition flex items-center";
    }
  }

  getChatInput() {
    return this.elements.chatInput.value.trim();
  }

  clearChatInput() {
    this.elements.chatInput.value = '';
  }

  setChatLoading(isLoading) {
    if (isLoading) {
      this.elements.sendChatBtn.disabled = true;
      this.elements.chatInput.disabled = true;
      this.elements.sendChatBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
      this.elements.chatStatusText.innerText = 'Los agentes están procesando y generando A2UI surface...';
    } else {
      this.elements.sendChatBtn.disabled = false;
      this.elements.chatInput.disabled = false;
      this.elements.sendChatBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`;
      this.elements.chatStatusText.innerText = 'Escribe tu mensaje o proporciona la URL del repositorio';
    }
  }

  appendUserMessage(text) {
    const time = new Date().toLocaleTimeString();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex justify-end mb-4';

    msgDiv.innerHTML = `
      <div class="max-w-[80%] bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none space-y-1 shadow-md shadow-indigo-900/30">
        <div class="flex items-center justify-between text-[10px] text-indigo-200 border-b border-indigo-500/40 pb-1 mb-1">
          <span class="font-bold flex items-center"><i class="fa-solid fa-user mr-1"></i>Tú</span>
          <span class="font-mono">${time}</span>
        </div>
        <p class="text-xs leading-relaxed font-sans">${this.escapeHtml(text)}</p>
      </div>
    `;

    this.elements.chatMessages.appendChild(msgDiv);
    this.scrollToBottom();
  }

  appendAgentMessage(author, text, a2uiSurfaceNode = null) {
    const time = new Date().toLocaleTimeString();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex justify-start mb-4';

    let authorBadge = 'pr_auditor_agent (ADK & A2UI)';
    let avatarBg = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    let avatarIcon = 'fa-robot';

    if (author.includes('investigator')) {
      authorBadge = 'pr_investigator_agent';
      avatarBg = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      avatarIcon = 'fa-magnifying-glass';
    } else if (author.includes('critic')) {
      authorBadge = 'critical_reviewer_agent (LoopAgent)';
      avatarBg = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      avatarIcon = 'fa-scale-balanced';
    }

    const textContentHtml = text ? `<p class="text-xs text-slate-200 leading-relaxed font-sans">${this.escapeHtml(text)}</p>` : '';

    msgDiv.innerHTML = `
      <div class="max-w-[85%] glass-panel bg-slate-950/90 border border-slate-800 p-4 rounded-2xl rounded-tl-none space-y-2 shadow-lg">
        <div class="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5 mb-2">
          <span class="font-bold flex items-center text-indigo-300">
            <span class="w-5 h-5 rounded-full ${avatarBg} border flex items-center justify-center mr-1.5 text-[10px]">
              <i class="fa-solid ${avatarIcon}"></i>
            </span>
            ${authorBadge}
          </span>
          <span class="font-mono text-slate-500">${time}</span>
        </div>
        ${textContentHtml}
        <div class="a2ui-mount-slot"></div>
      </div>
    `;

    if (a2uiSurfaceNode) {
      const slot = msgDiv.querySelector('.a2ui-mount-slot');
      if (slot) slot.appendChild(a2uiSurfaceNode);
    }

    this.elements.chatMessages.appendChild(msgDiv);
    this.scrollToBottom();
    return msgDiv;
  }

  scrollToBottom() {
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
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
