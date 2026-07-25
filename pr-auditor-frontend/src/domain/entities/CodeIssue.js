/**
 * CodeIssue Entity (Domain Layer)
 */
export class CodeIssue {
  constructor({ file_path, line_number, issue_type, severity, summary, description, recommendation }) {
    this.filePath = file_path || 'N/A';
    this.lineNumber = line_number || null;
    this.issueType = issue_type || 'code_smell';
    this.severity = (severity || 'medium').toLowerCase();
    this.summary = summary || '';
    this.description = description || '';
    this.recommendation = recommendation || '';
  }
}
