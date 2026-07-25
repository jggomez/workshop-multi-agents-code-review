import json
import os
from typing import Optional
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from mcp_server_github.github_client import GitHubClient, GitHubAPIError

load_dotenv()

# Read host and port from environment variables
host = os.getenv("MCP_HOST", "0.0.0.0")
port = int(os.getenv("MCP_PORT", "8085"))

# Initialize FastMCP Server
mcp = FastMCP("GitHub MCP Server", host=host, port=port)


def get_github_client() -> GitHubClient:
    """Helper factory for GitHubClient."""
    return GitHubClient()


@mcp.tool(
    name="list_open_pull_requests",
    description="List open Pull Requests of a repository for review."
)
async def list_open_pull_requests(owner: str, repo: str) -> str:
    """List open pull requests of a GitHub repository.

    Args:
        owner: The account owner of the repository (e.g. 'octocat').
        repo: The name of the repository (e.g. 'Hello-World').

    Returns:
        JSON formatted string containing open pull requests details.
    """
    client = get_github_client()
    try:
        prs = await client.get_open_pull_requests(owner, repo)
        if not prs:
            return f"No open pull requests found for {owner}/{repo}."
        return json.dumps(prs, indent=2, ensure_ascii=False)
    except GitHubAPIError as e:
        return f"Error listing open pull requests: {e}"


@mcp.tool(
    name="get_file_content",
    description="Get the content of a specific file from a public/private GitHub repository. Use this to inspect source code, Dockerfiles, or workflow YAMLs."
)
async def get_file_content(owner: str, repo: str, path: str, ref: Optional[str] = None) -> str:
    """Get content of a specific file from a public or private GitHub repository.

    Args:
        owner: The account owner of the repository.
        repo: The name of the repository.
        path: Path to the file within the repository (e.g. 'src/main.py', 'Dockerfile', '.github/workflows/ci.yml').
        ref: Optional branch name, tag, or commit SHA. Defaults to repository default branch if omitted.

    Returns:
        The text content of the file or file details.
    """
    client = get_github_client()
    try:
        file_info = await client.get_file_content(owner, repo, path, ref=ref)
        content_header = (
            f"# File: {file_info.get('path', path)}\n"
            f"# Size: {file_info.get('size', 0)} bytes | SHA: {file_info.get('sha', 'N/A')}\n"
            f"# URL: {file_info.get('html_url', 'N/A')}\n"
            "--------------------------------------------------\n"
        )
        return content_header + file_info["content"]
    except GitHubAPIError as e:
        return f"Error reading file content: {e}"


def main() -> None:
    """Run the FastMCP server exposed as Streamable HTTP."""
    print(f"Starting GitHub FastMCP Server using streamable-http transport on {mcp.settings.host}:{mcp.settings.port}...")
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
