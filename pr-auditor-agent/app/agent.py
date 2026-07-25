import os
from typing import Any, Dict
from dotenv import load_dotenv

from google.adk.agents import Agent, LoopAgent, SequentialAgent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.plugins import ReflectAndRetryToolPlugin
from google.adk.tools import ToolContext
from google.adk.tools.mcp_tool import McpToolset, StreamableHTTPConnectionParams
from google.genai import types

from app.schemas import PRCodeAuditReport

load_dotenv()

# Model configuration
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
CRITIC_MODEL_NAME = os.getenv("GEMINI_CRITIC_MODEL", "gemini-2.5-flash")
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8085/mcp")


def get_mcp_toolset() -> McpToolset:
    """Initialize McpToolset using Streamable HTTP connection params."""
    return McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url=MCP_SERVER_URL,
            timeout=10.0,
        )
    )


def approve_audit(tool_context: ToolContext) -> Dict[str, Any]:
    """Approve the code audit findings when thorough and complete, exiting the refinement loop.

    Call this tool when you have verified that all files, pull requests, security risks,
    SOLID principles, and code smells have been thoroughly analyzed without any missing details.
    """
    tool_context.actions.escalate = True
    return {
        "status": "approved",
        "message": "Code audit validated and approved by Critical Reviewer.",
    }


INVESTIGATOR_INSTRUCTION = """
# ROLE: Senior Code Security & Quality Auditor

## RESPONSIBILITIES:
1. You analyze GitHub repository pull requests and perform in-depth code reviews.
2. You retrieve open Pull Requests using the `list_open_pull_requests` tool.
3. You fetch and inspect source code, Dockerfiles, configuration files, and GitHub Actions workflow YAMLs using the `get_file_content` tool.
4. If previous reviewer feedback or critique is present in the conversation context, address all specific gaps, missing files, or unaddressed code smells highlighted by the critic.
5. Evaluate the code for:
   - Security Vulnerabilities (OWASP Top 10, hardcoded credentials, secret leaks, injection risks).
   - SOLID Principles Compliance (SRP, OCP, LSP, ISP, DIP).
   - Code Smells & Anti-patterns (God classes, long functions, magic numbers, primitive obsession).
   - Bug Risks & Exception Handling flaws.
   - Performance and scalability bottlenecks.

## OBJECTIVE:
Given a repository (owner and repo name), retrieve pull requests and file contents, analyze code files thoroughly, and produce comprehensive audit text findings.

## GUARDRAILS:
- NEVER guess or invent code snippets. Always use `get_file_content` to read actual file content.
- Do NOT perform code modifications directly.
- Justify every detected severity rating (critical, high, medium, low, info) with explicit code references.
- Protect secrets: redact secret tokens or keys in output notes.

## AVAILABLE TOOLS:
- `list_open_pull_requests(owner: str, repo: str)`: Fetches open pull requests.
- `get_file_content(owner: str, repo: str, path: str, ref: Optional[str])`: Retrieves raw content of source code or config files.
"""

CRITICAL_REVIEWER_INSTRUCTION = """
# ROLE: Principal Code Audit Critic & Quality Assurance Lead

## RESPONSIBILITIES:
1. Review the investigator's raw audit findings in the preceding conversation history.
2. Use the repository inspection tools (`list_open_pull_requests` and `get_file_content`) to independently inspect the repository files.
3. Cross-check whether the investigator:
   - Missed key source files, configuration files, Dockerfiles, or workflow YAMLs.
   - Overlooked critical security vulnerabilities (e.g. secret leaks, injection points).
   - Missed SOLID principles violations or architectural code smells.
   - Misclassified issue severities.
4. DECISION RULE:
   - If the audit is THOROUGH, ACCURATE, and COMPLETE: Call the `approve_audit` tool to approve the audit and end the refinement loop.
   - If the audit is INCOMPLETE or HAS GAPS: Provide detailed, actionable feedback listing the specific files or vulnerability types that must be re-audited.

## GUARDRAILS:
- Be rigorous and uncompromising on code quality and security.
- Call `approve_audit` ONLY when you have verified that no critical gaps remain.
- If gaps exist, do NOT call `approve_audit`; instead output clear, constructive feedback.

## AVAILABLE TOOLS:
- `approve_audit()`: Call this tool ONLY when audit findings are 100% complete and validated to exit the loop.
- `list_open_pull_requests(owner: str, repo: str)`: Inspect open pull requests.
- `get_file_content(owner: str, repo: str, path: str, ref: Optional[str])`: Read repository files.
"""

from a2ui.schema.manager import A2uiSchemaManager
from a2ui.schema.constants import VERSION_0_9
from a2ui.basic_catalog.provider import BasicCatalog

a2ui_schema_manager = A2uiSchemaManager(
    version=VERSION_0_9,
    catalogs=[BasicCatalog.get_config(VERSION_0_9)],
)

BASE_REPORT_INSTRUCTION = """
# ROLE: Technical Audit Report Generator & A2UI Protocol Builder

## RESPONSIBILITIES:
1. Synthesize the validated code audit findings from the preceding conversation history into a structured `PRCodeAuditReport`.
2. Generate an interactive A2UI surface JSON payload inside `<a2ui-json>` ... `</a2ui-json>` and populate the `a2ui_json` field.
3. The A2UI payload MUST follow the A2UI protocol v0.9 specification:
   - A `createSurface` message for `surfaceId: "pr_audit_surface"`.
   - An `updateComponents` message with components:
     - `Card` root component titled with repository name and quality score.
     - `Text` components for Executive Summary, OWASP Security Risks, and SOLID notes.

## OBJECTIVE:
Produce a final structured report containing an executive summary, overall quality score (0-100), categorized issue list, SOLID compliance notes, security assessment, conclusion, and valid A2UI JSON payload.
"""

REPORT_GENERATOR_INSTRUCTION = a2ui_schema_manager.generate_system_prompt(BASE_REPORT_INSTRUCTION)


# Agent definitions
pr_investigator_agent = Agent(
    name="pr_investigator_agent",
    model=Gemini(
        model=MODEL_NAME,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=INVESTIGATOR_INSTRUCTION,
    description="Inspects open pull requests and reads source code files via GitHub MCP server tools.",
    tools=[get_mcp_toolset()],
    output_key="raw_audit_findings",
)

critical_reviewer_agent = Agent(
    name="critical_reviewer_agent",
    model=Gemini(
        model=CRITIC_MODEL_NAME,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=CRITICAL_REVIEWER_INSTRUCTION,
    description="Critically evaluates code audit findings and repository files, providing feedback or approving via approve_audit.",
    tools=[get_mcp_toolset(), approve_audit],
    output_key="reviewer_feedback",
)

pr_report_agent = Agent(
    name="pr_report_agent",
    model=Gemini(
        model=MODEL_NAME,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=REPORT_GENERATOR_INSTRUCTION,
    description="Generates structured PR code audit reports.",
    output_schema=PRCodeAuditReport,
    output_key="audit_report",
)

# LoopAgent for iterative refinement loop
refinement_loop = LoopAgent(
    name="refinement_loop",
    sub_agents=[pr_investigator_agent, critical_reviewer_agent],
    max_iterations=3,
    description="Iterative refinement loop between code investigator and critical reviewer.",
)

# Root SequentialAgent pipeline
root_agent = SequentialAgent(
    name="pr_auditor_pipeline",
    sub_agents=[refinement_loop, pr_report_agent],
    description="End-to-end PR inspection, iterative critical audit review, and structured reporting pipeline.",
)

# App configuration with retry plugin
app = App(
    root_agent=root_agent,
    name="app",
    plugins=[ReflectAndRetryToolPlugin(max_retries=3)],
)
