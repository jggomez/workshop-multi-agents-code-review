/**
 * StartAuditUseCase (Use Cases Layer)
 */
import { AuditReport } from '../domain/entities/AuditReport.js';

export class StartAuditUseCase {
  constructor(auditRepository) {
    this.auditRepository = auditRepository;
  }

  parseRepoInput(inputVal) {
    let cleaned = (inputVal || '').trim();
    if (cleaned.startsWith('https://github.com/')) {
      cleaned = cleaned.replace('https://github.com/', '');
    }
    if (cleaned.startsWith('github.com/')) {
      cleaned = cleaned.replace('github.com/', '');
    }
    if (cleaned.endsWith('.git')) {
      cleaned = cleaned.slice(0, -4);
    }
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1], full: `${parts[0]}/${parts[1]}` };
    }
    return { owner: 'octocat', repo: 'Hello-World', full: 'octocat/Hello-World' };
  }

  async execute(repoInput, { onEvent, onComplete, onError }) {
    const target = this.parseRepoInput(repoInput);

    return this.auditRepository.streamAudit(target, {
      onEvent,
      onComplete: (rawReportData) => {
        const reportEntity = new AuditReport(rawReportData);
        onComplete(reportEntity);
      },
      onError,
    });
  }
}
