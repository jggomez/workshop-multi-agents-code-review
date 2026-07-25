/**
 * Html2PdfExporter (Infrastructure Layer)
 * Implements IPdfExporter using html2pdf.js library
 */
import { IPdfExporter } from '../domain/repositories/IPdfExporter.js';

export class Html2PdfExporter extends IPdfExporter {
  async export(auditReport) {
    if (!auditReport) {
      throw new Error('Audit report entity is null');
    }

    const repoNameSafe = (auditReport.repository || 'repo').replace(/[^a-zA-Z0-9_-]/g, '_');
    const score = auditReport.overallQualityScore || 75;
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
    const verdict = auditReport.getVerdict();

    // Create clean printable element
    const printWrapper = document.createElement('div');
    printWrapper.style.padding = '24px';
    printWrapper.style.backgroundColor = '#0b0f19';
    printWrapper.style.color = '#ffffff';
    printWrapper.style.fontFamily = 'Inter, system-ui, sans-serif';

    let issuesHtml = '';
    (auditReport.issues || []).forEach((issue) => {
      const sev = (issue.severity || 'medium').toLowerCase();
      const sevColor = sev === 'critical' ? '#f43f5e' : sev === 'high' ? '#f97316' : sev === 'medium' ? '#f59e0b' : '#38bdf8';

      issuesHtml += `
        <div style="margin-bottom: 12px; padding: 12px; background-color: #1e293b; border: 1px solid #334155; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="background-color: ${sevColor}22; color: ${sevColor}; border: 1px solid ${sevColor}44; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              ${sev}
            </span>
            <span style="font-family: monospace; font-size: 11px; color: #a5b4fc; background: #090d16; padding: 2px 6px; border-radius: 4px;">
              ${this.escapeHtml(issue.filePath)}:${issue.lineNumber || 'N/A'}
            </span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #ffffff;">${this.escapeHtml(issue.summary)}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #cbd5e1; line-height: 1.4;">${this.escapeHtml(issue.description)}</p>
          <div style="background-color: #0f172a; padding: 6px 10px; border-radius: 6px; font-size: 11px; border-left: 3px solid #10b981;">
            <strong style="color: #10b981;">Recomendación:</strong> <span style="color: #e2e8f0;">${this.escapeHtml(issue.recommendation)}</span>
          </div>
        </div>
      `;
    });

    printWrapper.innerHTML = `
      <div style="border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff;">Code Audit Technical Report</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-family: monospace;">Repository: ${this.escapeHtml(auditReport.repository)} | PR #${auditReport.prNumber || 'N/A'}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: 900; color: ${scoreColor};">${score} / 100</div>
          <div style="font-size: 11px; font-weight: bold; color: ${scoreColor}; font-family: monospace;">${verdict.label}</div>
        </div>
      </div>

      <div style="margin-bottom: 14px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
        <h3 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #818cf8; text-transform: uppercase;">Executive Summary</h3>
        <p style="margin: 0; font-size: 11px; color: #e2e8f0; line-height: 1.5;">${this.escapeHtml(auditReport.auditSummary)}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <h3 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #f43f5e; text-transform: uppercase;">Security & OWASP Assessment</h3>
          <p style="margin: 0; font-size: 11px; color: #e2e8f0; line-height: 1.4;">${this.escapeHtml(auditReport.securityAssessment)}</p>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <h3 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #c084fc; text-transform: uppercase;">SOLID Principles Compliance</h3>
          <p style="margin: 0; font-size: 11px; color: #e2e8f0; line-height: 1.4;">${this.escapeHtml(auditReport.solidComplianceNotes)}</p>
        </div>
      </div>

      <div style="margin-top: 16px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #ffffff; border-bottom: 1px solid #334155; padding-bottom: 4px;">
          Detected Findings (${(auditReport.issues || []).length})
        </h3>
        ${issuesHtml}
      </div>

      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #334155; font-size: 9px; color: #64748b; text-align: center;">
        Generated by PR Code Auditor AI (Google ADK & FastMCP)
      </div>
    `;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `PR_Audit_Report_${repoNameSafe}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0b0f19' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    return html2pdf().set(opt).from(printWrapper).save();
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
