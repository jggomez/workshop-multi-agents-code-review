/**
 * ExportPdfUseCase (Use Cases Layer)
 */
export class ExportPdfUseCase {
  constructor(pdfExporter) {
    this.pdfExporter = pdfExporter;
  }

  async execute(auditReport) {
    if (!auditReport) {
      throw new Error('No audit report available to export');
    }
    return this.pdfExporter.export(auditReport);
  }
}
