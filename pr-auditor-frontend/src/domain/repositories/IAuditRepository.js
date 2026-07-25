/**
 * IAuditRepository Interface (Domain Layer)
 */
export class IAuditRepository {
  async streamAudit({ owner, repo }, { onEvent, onComplete, onError }) {
    throw new Error('Method streamAudit must be implemented');
  }

  async checkHealth() {
    throw new Error('Method checkHealth must be implemented');
  }
}
