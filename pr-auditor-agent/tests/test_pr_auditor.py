import pytest
from app.schemas import CodeIssue, PRCodeAuditReport
from app.agent import root_agent, app, get_mcp_toolset


def test_schema_pr_code_audit_report():
    """Verify PRCodeAuditReport structure and serialization."""
    issue = CodeIssue(
        file_path="src/main.py",
        line_number=42,
        issue_type="security_vulnerability",
        severity="high",
        summary="Hardcoded credential in code",
        description="Found hardcoded secret key in src/main.py",
        recommendation="Move secret to environment variables or GCP Secret Manager.",
    )
    report = PRCodeAuditReport(
        repository="octocat/Hello-World",
        pr_number=10,
        audit_summary="Found 1 high severity security issue.",
        overall_quality_score=75,
        issues=[issue],
        solid_compliance_notes="Single Responsibility Principle violated in main class.",
        security_assessment="Contains 1 credential leak risk.",
        conclusion="Request changes before merging.",
    )

    assert report.repository == "octocat/Hello-World"
    assert report.pr_number == 10
    assert len(report.issues) == 1
    assert report.issues[0].severity == "high"


def test_mcp_toolset_initialization():
    """Verify McpToolset is initialized with StreamableHTTPConnectionParams."""
    toolset = get_mcp_toolset()
    assert toolset is not None


def test_root_agent_configuration():
    """Verify ADK root agent configuration with LoopAgent and sub-agents."""
    assert root_agent.name == "pr_auditor_pipeline"
    assert len(root_agent.sub_agents) == 2

    refinement_loop = root_agent.sub_agents[0]
    report_gen = root_agent.sub_agents[1]

    assert refinement_loop.name == "refinement_loop"
    assert len(refinement_loop.sub_agents) == 2

    investigator = refinement_loop.sub_agents[0]
    reviewer = refinement_loop.sub_agents[1]

    assert investigator.name == "pr_investigator_agent"
    assert reviewer.name == "critical_reviewer_agent"
    assert report_gen.name == "pr_report_agent"
    assert report_gen.output_schema == PRCodeAuditReport


def test_critical_reviewer_agent_configuration():
    """Verify critical reviewer agent model and tools."""
    from app.agent import critical_reviewer_agent, CRITIC_MODEL_NAME

    assert critical_reviewer_agent.name == "critical_reviewer_agent"
    assert critical_reviewer_agent.model.model == CRITIC_MODEL_NAME
    assert len(critical_reviewer_agent.tools) >= 2


def test_app_configuration():
    """Verify ADK App instance configuration and plugins."""
    assert app.name == "app"
    assert app.root_agent == root_agent
    assert len(app.plugins) > 0


def test_gemini_model_env_configuration():
    """Verify GEMINI_MODEL and GEMINI_CRITIC_MODEL are read from environment."""
    from app.agent import MODEL_NAME, CRITIC_MODEL_NAME, pr_investigator_agent, pr_report_agent, critical_reviewer_agent
    import os

    expected_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    expected_critic_model = os.getenv("GEMINI_CRITIC_MODEL", "gemini-3.6-flash")

    assert MODEL_NAME == expected_model
    assert CRITIC_MODEL_NAME == expected_critic_model
    assert pr_investigator_agent.model.model == expected_model
    assert critical_reviewer_agent.model.model == expected_critic_model
    assert pr_report_agent.model.model == expected_model
