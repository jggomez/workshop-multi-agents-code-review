/**
 * FilterIssuesUseCase (Use Cases Layer)
 */
export class FilterIssuesUseCase {
  execute(issues, severityFilter) {
    if (!issues || !Array.isArray(issues)) return [];
    const filter = (severityFilter || 'all').toLowerCase();
    if (filter === 'all') return issues;
    return issues.filter(issue => (issue.severity || '').toLowerCase() === filter);
  }
}
