from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class CodeIssue(BaseModel):
    """Detailed information about an identified code quality or security issue."""
    file_path: str = Field(description="Relative path to the file where the issue was detected.")
    line_number: Optional[int] = Field(default=None, description="Line number if applicable, or None.")
    issue_type: Literal["code_smell", "security_vulnerability", "solid_violation", "bug_risk", "performance"] = Field(
        description="Category of the detected issue."
    )
    severity: Literal["critical", "high", "medium", "low", "info"] = Field(
        description="Severity level of the issue."
    )
    summary: str = Field(description="Brief summary title of the issue.")
    description: str = Field(description="Detailed technical explanation of the issue.")
    recommendation: str = Field(description="Actionable fix or improvement recommendation.")


class PRCodeAuditReport(BaseModel):
    """Structured technical audit report for GitHub repository Pull Requests."""
    repository: str = Field(description="GitHub repository in owner/repo format.")
    pr_number: Optional[int] = Field(default=None, description="Pull request number evaluated, or None if overall repo audit.")
    audit_summary: str = Field(description="Executive summary of the code audit findings.")
    overall_quality_score: int = Field(description="Quality score from 0 to 100 based on audit findings.")
    issues: List[CodeIssue] = Field(default_factory=list, description="List of identified issues during the code audit.")
    solid_compliance_notes: str = Field(description="Assessment of adherence to SOLID principles.")
    security_assessment: str = Field(description="Assessment of security vulnerabilities, OWASP compliance, and secrets exposure.")
    conclusion: str = Field(description="Final verdict and next steps for PR approval or revision.")
    a2ui_json: Optional[str] = Field(
        default=None,
        description="A2UI protocol surface payload wrapped in <a2ui-json> ... </a2ui-json> tags for interactive client rendering."
    )

