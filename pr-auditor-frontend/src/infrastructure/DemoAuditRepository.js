/**
 * DemoAuditRepository (Infrastructure Layer)
 * Implements IAuditRepository with realistic simulated multi-agent LoopAgent events
 */
import { IAuditRepository } from '../domain/repositories/IAuditRepository.js';

export class DemoAuditRepository extends IAuditRepository {
  async checkHealth() {
    return true;
  }

  async streamAudit({ owner, repo }, { onEvent, onComplete }) {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const fullRepo = `${owner}/${repo}`;

    // Step 1: Investigator Agent
    onEvent({ author: 'pr_investigator_agent', message: `Connecting to FastMCP Server at http://127.0.0.1:8085/mcp...`, type: 'info' });
    await sleep(900);

    onEvent({ author: 'pr_investigator_agent', message: `🔧 Calling MCP tool: list_open_pull_requests(owner='${owner}', repo='${repo}')`, type: 'tool_call' });
    await sleep(1100);
    onEvent({ author: 'pr_investigator_agent', message: `✅ MCP returned 2 open Pull Requests for review: PR #10 (Feature: Auth update) and PR #12 (Fix: Refactor utils).`, type: 'tool_response' });
    await sleep(900);

    onEvent({ author: 'pr_investigator_agent', message: `🔧 Calling MCP tool: get_file_content(owner='${owner}', repo='${repo}', path='src/auth_service.py')`, type: 'tool_call' });
    await sleep(1200);
    onEvent({ author: 'pr_investigator_agent', message: `Initial findings: Exposed credential vulnerability detected in src/auth_service.py line 42 and Single Responsibility violation in src/main.py.`, type: 'text' });
    await sleep(1000);

    // Step 2: Critic Reviewer Agent (LoopAgent)
    onEvent({ author: 'critical_reviewer_agent', message: `Starting independent critical review of findings for '${fullRepo}' (gemini-2.5-flash)...`, type: 'info' });
    await sleep(1100);

    onEvent({ author: 'critical_reviewer_agent', message: `🔧 Calling MCP tool: get_file_content(owner='${owner}', repo='${repo}', path='Dockerfile')`, type: 'tool_call' });
    await sleep(1300);
    onEvent({ author: 'critical_reviewer_agent', message: `Critical Reviewer Feedback: Initial investigation overlooked root user execution in Dockerfile. Requesting inclusion of container security risk in audit report.`, type: 'text' });
    await sleep(1400);

    onEvent({ author: 'pr_investigator_agent', message: `Addressing critic feedback: Added security finding for Dockerfile (root execution).`, type: 'text' });
    await sleep(900);

    onEvent({ author: 'critical_reviewer_agent', message: `🔧 Calling escalation tool: approve_audit()`, type: 'tool_call' });
    await sleep(900);
    onEvent({ author: 'critical_reviewer_agent', message: `✅ Code audit validated and approved without omissions. Escalating to report generator.`, type: 'tool_response' });
    await sleep(900);

    // Step 3: Report Generator Agent
    onEvent({ author: 'pr_report_agent', message: `Synthesizing validated findings into Pydantic schema PRCodeAuditReport...`, type: 'info' });
    await sleep(1000);

    const mockReport = {
      repository: fullRepo,
      pr_number: 10,
      audit_summary: `A thorough code audit was performed for repository '${fullRepo}'. Core source files, security settings, and Dockerfiles were evaluated. Detected 1 critical hardcoded credential vulnerability, 1 container security risk, and 1 SOLID principle violation.`,
      overall_quality_score: 72,
      issues: [
        {
          file_path: "src/auth_service.py",
          line_number: 42,
          issue_type: "security_vulnerability",
          severity: "critical",
          summary: "API Key / Secret hardcoded directly in source code",
          description: "Static test JWT token detected assigned directly to `JWT_SECRET_KEY` constant.",
          recommendation: "Move secret immediately to environment variables (.env) or GCP Secret Manager."
        },
        {
          file_path: "Dockerfile",
          line_number: 14,
          issue_type: "security_vulnerability",
          severity: "high",
          summary: "Container execution as root user",
          description: "Dockerfile does not specify `USER nonroot`, allowing the process to execute with root privileges.",
          recommendation: "Add non-privileged user: `RUN useradd -m appuser && USER appuser`."
        },
        {
          file_path: "src/main.py",
          line_number: 88,
          issue_type: "solid_violation",
          severity: "medium",
          summary: "Single Responsibility Principle (SRP) Violation",
          description: "`MainController` class handles HTTP routing, database persistence, and log formatting simultaneously.",
          recommendation: "Refactor and decouple persistence logic into a dedicated repository layer."
        },
        {
          file_path: "src/utils.py",
          line_number: 105,
          issue_type: "code_smell",
          severity: "low",
          summary: "Excessively long function and magic numbers",
          description: "`calculate_metrics()` function exceeds 90 lines with multiple nested blocks and hardcoded multipliers (`* 1.15`).",
          recommendation: "Extract descriptive helper functions and define intention-revealing constants."
        }
      ],
      solid_compliance_notes: "Strong coupling detected in primary controllers (SRP and DIP violations). Service interface injection recommended.",
      security_assessment: "Medium-High security risk due to static hardcoded key in auth_service.py and missing container user restrictions in Dockerfile.",
      conclusion: "REQUEST CHANGES: Do not merge this Pull Request until hardcoded keys and Dockerfile permissions are resolved."
    };

    onComplete(mockReport);
  }
}
