/**
 * Html2PdfExporter (Infrastructure Layer)
 * Implements IPdfExporter using html2pdf.js with print-optimized A4 layout & page-break safeguards
 */
import { IPdfExporter } from '../domain/repositories/IPdfExporter.js';

export class Html2PdfExporter extends IPdfExporter {
  async export(auditReport) {
    if (!auditReport) {
      throw new Error('Audit report entity is null');
    }

    const repoNameSafe = (auditReport.repository || 'repo').replace(/[^a-zA-Z0-9_-]/g, '_');
    const score = typeof auditReport.overallQualityScore === 'number' ? auditReport.overallQualityScore : 75;
    
    let scoreColor = '#10b981'; // Emerald
    let scoreBg = '#ecfdf5';
    let scoreBorder = '#a7f3d0';
    if (score < 60) {
      scoreColor = '#e11d48'; // Rose
      scoreBg = '#fff1f2';
      scoreBorder = '#fecdd3';
    } else if (score < 80) {
      scoreColor = '#d97706'; // Amber
      scoreBg = '#fffbeb';
      scoreBorder = '#fde68a';
    }

    const verdict = auditReport.getVerdict();
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate Issue Cards HTML with strict page-break protection
    let issuesHtml = '';
    (auditReport.issues || []).forEach((issue, index) => {
      const sev = (issue.severity || 'medium').toLowerCase();
      let sevBg = '#f1f5f9';
      let sevColor = '#475569';
      let sevBorder = '#cbd5e1';

      if (sev === 'critical') {
        sevBg = '#fff1f2';
        sevColor = '#e11d48';
        sevBorder = '#fecdd3';
      } else if (sev === 'high') {
        sevBg = '#fff7ed';
        sevColor = '#ea580c';
        sevBorder = '#ffedd5';
      } else if (sev === 'medium') {
        sevBg = '#fffbeb';
        sevColor = '#d97706';
        sevBorder = '#fde68a';
      } else if (sev === 'low') {
        sevBg = '#f0f9ff';
        sevColor = '#0284c7';
        sevBorder = '#e0f2fe';
      }

      issuesHtml += `
        <div style="margin-bottom: 12px; padding: 12px 14px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
            <tr>
              <td style="text-align: left; vertical-align: middle;">
                <span style="display: inline-block; background-color: ${sevBg}; color: ${sevColor}; border: 1px solid ${sevBorder}; padding: 3px 9px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                  ${sev}
                </span>
                <span style="font-size: 10px; color: #64748b; font-weight: 600; margin-left: 8px; text-transform: uppercase;">
                  ${this.escapeHtml(issue.issueType || 'Finding')}
                </span>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <span style="font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; color: #4338ca; background-color: #e0e7ff; padding: 3px 8px; border-radius: 4px; font-weight: 600;">
                  ${this.escapeHtml(issue.filePath)}:${issue.lineNumber || 'N/A'}
                </span>
              </td>
            </tr>
          </table>

          <h4 style="margin: 4px 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            #${index + 1}. ${this.escapeHtml(issue.summary)}
          </h4>

          <p style="margin: 0 0 8px 0; font-size: 11px; color: #334155; line-height: 1.45;">
            ${this.escapeHtml(issue.description)}
          </p>

          <div style="background-color: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 11px; border-left: 3px solid #10b981; margin-top: 4px;">
            <strong style="color: #059669; font-weight: 700;">Recommendation:</strong> 
            <span style="color: #1e293b;">${this.escapeHtml(issue.recommendation)}</span>
          </div>
        </div>
      `;
    });

    // Printable Document Container
    const printWrapper = document.createElement('div');
    printWrapper.style.width = '100%';
    printWrapper.style.boxSizing = 'border-box';
    printWrapper.style.padding = '28px 24px';
    printWrapper.style.backgroundColor = '#ffffff';
    printWrapper.style.color = '#0f172a';
    printWrapper.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    printWrapper.innerHTML = `
      <!-- Header Bar -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top;">
              <span style="font-size: 10px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px;">
                PR Code Auditor AI • Technical Report
              </span>
              <h1 style="margin: 4px 0 0 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Pull Request Audit Analysis
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-family: monospace;">
                Repository: <strong>${this.escapeHtml(auditReport.repository)}</strong> | PR #${auditReport.prNumber || 'N/A'} | ${formattedDate}
              </p>
            </td>
            <td style="text-align: right; vertical-align: top; width: 140px;">
              <div style="background-color: ${scoreBg}; border: 1px solid ${scoreBorder}; padding: 8px 12px; border-radius: 10px; text-align: center;">
                <div style="font-size: 22px; font-weight: 900; color: ${scoreColor}; line-height: 1;">${score}<span style="font-size: 12px; font-weight: 600; color: #64748b;">/100</span></div>
                <div style="font-size: 10px; font-weight: 800; color: ${scoreColor}; text-transform: uppercase; margin-top: 4px;">${this.escapeHtml(verdict.label)}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Executive Summary Block -->
      <div style="margin-bottom: 14px; background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
        <h3 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px;">
          Executive Summary
        </h3>
        <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.5; text-align: justify;">
          ${this.escapeHtml(auditReport.auditSummary)}
        </p>
      </div>

      <!-- 2 Column Assessment Table for html2canvas compatibility -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
        <tr>
          <td style="width: 49%; vertical-align: top; padding-right: 1%;">
            <div style="background-color: #fff1f2; padding: 12px; border-radius: 8px; border: 1px solid #fecdd3; height: 100%; box-sizing: border-box;">
              <h3 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 0.5px;">
                Security & OWASP Assessment
              </h3>
              <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.45;">
                ${this.escapeHtml(auditReport.securityAssessment)}
              </p>
            </div>
          </td>
          <td style="width: 49%; vertical-align: top; padding-left: 1%;">
            <div style="background-color: #f5f3ff; padding: 12px; border-radius: 8px; border: 1px solid #ddd6fe; height: 100%; box-sizing: border-box;">
              <h3 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px;">
                SOLID Principles Compliance
              </h3>
              <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.45;">
                ${this.escapeHtml(auditReport.solidComplianceNotes)}
              </p>
            </div>
          </td>
        </tr>
      </table>

      <!-- Findings List -->
      <div style="margin-top: 14px;">
        <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">
            Detected Findings and Vulnerabilities (${(auditReport.issues || []).length})
          </h3>
        </div>
        ${issuesHtml}
      </div>

      <!-- Footer -->
      <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; page-break-inside: avoid;">
        Generated by PR Code Auditor AI (Google ADK & FastMCP Server) • Confidential Engineering Report
      </div>
    `;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `PR_Audit_Report_${repoNameSafe}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' },
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
