/**
 * A2uiRenderer (Infrastructure Layer)
 * Renders A2UI protocol surface component trees into interactive HTML elements
 */
export class A2uiRenderer {
  renderSurface(a2uiSurface) {
    if (!a2uiSurface) return null;

    const surfaceContainer = document.createElement('div');
    surfaceContainer.className = 'a2ui-surface-container my-3 p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4 shadow-xl shadow-indigo-950/40';

    const rootComp = a2uiSurface.getRootComponent();
    if (!rootComp) {
      surfaceContainer.innerHTML = `<div class="text-xs text-slate-400">A2UI Surface vacuá</div>`;
      return surfaceContainer;
    }

    const rootNode = this.renderComponentNode(rootComp, a2uiSurface);
    if (rootNode) {
      surfaceContainer.appendChild(rootNode);
    }

    return surfaceContainer;
  }

  renderComponentNode(component, surface) {
    if (!component) return null;

    const type = component.component || 'Text';

    if (type === 'Card') {
      const card = document.createElement('div');
      card.className = 'glass-card p-5 rounded-xl border border-indigo-500/30 space-y-3 bg-slate-950/80';

      if (component.title) {
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-sm font-extrabold text-indigo-300 flex items-center border-b border-slate-800 pb-2.5';
        titleEl.innerHTML = `<i class="fa-solid fa-layer-group mr-2 text-indigo-400"></i>${this.escapeHtml(component.title)}`;
        card.appendChild(titleEl);
      }

      if (component.children && Array.isArray(component.children)) {
        const bodyContainer = document.createElement('div');
        bodyContainer.className = 'space-y-2.5';

        component.children.forEach((childId) => {
          const childComp = surface.getComponentById(childId);
          if (childComp) {
            const childNode = this.renderComponentNode(childComp, surface);
            if (childNode) bodyContainer.appendChild(childNode);
          }
        });
        card.appendChild(bodyContainer);
      }
      return card;
    }

    if (type === 'Text') {
      const p = document.createElement('div');
      const textVal = component.text || '';

      if (textVal.startsWith('🎯 Quality Score')) {
        p.className = 'p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs font-mono font-bold text-emerald-300';
      } else if (textVal.startsWith('📋') || textVal.startsWith('🛡️') || textVal.startsWith('🧩')) {
        p.className = 'p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap';
      } else if (textVal.startsWith('🚨')) {
        p.className = 'text-xs font-bold text-rose-400 mt-2 flex items-center';
      } else if (textVal.startsWith('• [')) {
        p.className = 'p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 text-[11px] text-slate-300 font-mono whitespace-pre-wrap';
      } else {
        p.className = 'text-xs text-slate-300 leading-relaxed whitespace-pre-wrap';
      }

      p.innerText = textVal;
      return p;
    }

    if (type === 'Button') {
      const btn = document.createElement('button');
      btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20';
      btn.innerText = component.label || 'Action';
      return btn;
    }

    // Default fallback Text node
    const fallback = document.createElement('div');
    fallback.className = 'text-xs text-slate-300';
    fallback.innerText = component.text || JSON.stringify(component);
    return fallback;
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
