/**
 * AuditReport Entity (Domain Layer)
 */
import { CodeIssue } from './CodeIssue.js';

export class AuditReport {
  constructor({ repository, pr_number, audit_summary, overall_quality_score, issues, solid_compliance_notes, security_assessment, conclusion }) {
    this.repository = repository || '';
    this.prNumber = pr_number || null;
    this.auditSummary = audit_summary || '';
    this.overallQualityScore = typeof overall_quality_score === 'number' ? overall_quality_score : 75;
    this.issues = (issues || []).map(i => i instanceof CodeIssue ? i : new CodeIssue(i));
    this.solidComplianceNotes = solid_compliance_notes || '';
    this.securityAssessment = security_assessment || '';
    this.conclusion = conclusion || '';
  }

  getVerdict() {
    if (this.overallQualityScore >= 80) return { label: 'PR APPROVED', code: 'approved', color: 'emerald' };
    if (this.overallQualityScore >= 60) return { label: 'REVIEW REQUIRED', code: 'review_required', color: 'amber' };
    return { label: 'REJECT MERGE', code: 'rejected', color: 'rose' };
  }
}
