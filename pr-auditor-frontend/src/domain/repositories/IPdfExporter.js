/**
 * IPdfExporter Interface (Domain Layer)
 */
export class IPdfExporter {
  async export(auditReport) {
    throw new Error('Method export must be implemented');
  }
}
