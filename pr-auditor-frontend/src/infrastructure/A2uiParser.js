/**
 * A2uiParser (Infrastructure Layer)
 * Extracts <a2ui-json> ... </a2ui-json> blocks and builds A2uiSurface domain objects
 */
import { A2uiSurface } from '../domain/entities/A2uiSurface.js';

export class A2uiParser {
  extractA2uiBlocks(text) {
    if (!text) return { cleanText: '', surfaces: [] };

    const a2uiRegex = /<a2ui-json>([\s\S]*?)<\/a2ui-json>/g;
    const surfaces = [];
    let match;

    while ((match = a2uiRegex.exec(text)) !== null) {
      try {
        const rawJson = match[1].trim();
        const parsed = JSON.parse(rawJson);

        const surface = this.parseA2uiOperations(parsed);
        if (surface) {
          surfaces.push(surface);
        }
      } catch (err) {
        console.warn('Failed to parse <a2ui-json> block:', err);
      }
    }

    const cleanText = text.replace(a2uiRegex, '').trim();
    return { cleanText, surfaces };
  }

  parseA2uiOperations(operations) {
    if (!Array.isArray(operations)) {
      if (typeof operations === 'object' && operations.components) {
        return new A2uiSurface(operations);
      }
      return null;
    }

    let surfaceId = `surface_${Date.now()}`;
    let catalogId = 'basic_catalog_v0.9';
    let components = [];

    operations.forEach((op) => {
      if (op.createSurface) {
        surfaceId = op.createSurface.surfaceId || surfaceId;
        catalogId = op.createSurface.catalogId || catalogId;
      }
      if (op.updateComponents) {
        surfaceId = op.updateComponents.surfaceId || surfaceId;
        components = op.updateComponents.components || components;
      }
    });

    if (components.length === 0) return null;

    return new A2uiSurface({ surfaceId, catalogId, components });
  }

  /**
   * Helper to build a standard A2UI payload for PR Audit Report
   */
  createAuditReportA2ui(reportData) {
    const repo = reportData.repository || 'Repository';
    const score = reportData.overall_quality_score || 75;
    const verdict = score >= 80 ? 'APPROVED' : score >= 60 ? 'REVIEW REQUIRED' : 'REJECT MERGE';

    const components = [
      {
        id: 'root',
        component: 'Card',
        title: `PR Code Audit Surface - ${repo}`,
        children: ['score_badge', 'summary_box', 'security_box', 'solid_box', 'issues_header', 'issues_list']
      },
      {
        id: 'score_badge',
        component: 'Text',
        text: `🎯 Quality Score: ${score}/100 [Verdict: ${verdict}]`,
        style: 'heading'
      },
      {
        id: 'summary_box',
        component: 'Text',
        text: `📋 Executive Summary:\n${reportData.audit_summary || ''}`,
        style: 'body'
      },
      {
        id: 'security_box',
        component: 'Text',
        text: `🛡️ Security Assessment (OWASP):\n${reportData.security_assessment || ''}`,
        style: 'body'
      },
      {
        id: 'solid_box',
        component: 'Text',
        text: `🧩 SOLID Compliance:\n${reportData.solid_compliance_notes || ''}`,
        style: 'body'
      },
      {
        id: 'issues_header',
        component: 'Text',
        text: `🚨 Findings & Defects (${(reportData.issues || []).length} detected):`,
        style: 'subheading'
      }
    ];

    (reportData.issues || []).forEach((issue, idx) => {
      components.push({
        id: `issue_${idx}`,
        component: 'Text',
        text: `• [${(issue.severity || 'MEDIUM').toUpperCase()}] ${issue.file_path}:${issue.line_number || 'N/A'} - ${issue.summary}\n  Recomendación: ${issue.recommendation}`,
        style: 'caption'
      });
      components[0].children.push(`issue_${idx}`);
    });

    const operations = [
      { createSurface: { surfaceId: `pr_audit_${Date.now()}`, catalogId: 'basic_catalog_v0.9' } },
      { updateComponents: { surfaceId: `pr_audit_${Date.now()}`, components } }
    ];

    return `<a2ui-json>\n${JSON.stringify(operations, null, 2)}\n</a2ui-json>`;
  }
}
