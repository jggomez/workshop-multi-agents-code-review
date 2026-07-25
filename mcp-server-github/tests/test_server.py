import pytest
from unittest.mock import AsyncMock, patch
from mcp_server_github.server import list_open_pull_requests, get_file_content


@pytest.mark.asyncio
async def test_list_open_pull_requests_tool():
    mock_prs = [
        {
            "id": 1,
            "number": 42,
            "title": "Fix bug in parser",
            "author": "dev1",
            "html_url": "https://github.com/org/repo/pull/42",
            "state": "open",
            "created_at": "2026-01-01T00:00:00Z",
            "draft": False,
            "head": "bugfix/parser",
            "base": "main",
            "labels": ["bug"],
            "reviewers": ["lead_dev"],
        }
    ]

    with patch("mcp_server_github.server.get_github_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.get_open_pull_requests.return_value = mock_prs
        mock_get_client.return_value = mock_client

        result = await list_open_pull_requests("org", "repo")

        assert "42" in result
        assert "Fix bug in parser" in result
        assert "dev1" in result
        mock_client.get_open_pull_requests.assert_called_once_with("org", "repo")


@pytest.mark.asyncio
async def test_get_file_content_tool():
    mock_file_res = {
        "name": "Dockerfile",
        "path": "Dockerfile",
        "size": 150,
        "content": "FROM python:3.12-slim\nCMD ['python']",
        "encoding": "utf-8",
        "html_url": "https://github.com/org/repo/blob/main/Dockerfile",
    }

    with patch("mcp_server_github.server.get_github_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.get_file_content.return_value = mock_file_res
        mock_get_client.return_value = mock_client

        result = await get_file_content("org", "repo", "Dockerfile", ref="main")

        assert "FROM python:3.12-slim" in result
        mock_client.get_file_content.assert_called_once_with("org", "repo", "Dockerfile", ref="main")


def test_tool_descriptions_in_english():
    from mcp_server_github.server import mcp

    tools = mcp._tool_manager.list_tools()
    tools_dict = {tool.name: tool.description for tool in tools}

    assert tools_dict["list_open_pull_requests"] == "List open Pull Requests of a repository for review."
    assert tools_dict["get_file_content"] == "Get the content of a specific file from a public/private GitHub repository. Use this to inspect source code, Dockerfiles, or workflow YAMLs."


def test_server_main_function():
    from mcp_server_github.server import main, mcp

    with patch.object(mcp, "run") as mock_run:
        main()
        mock_run.assert_called_once_with(transport="streamable-http")


def test_server_port_default_8085():
    from mcp_server_github.server import mcp

    assert mcp.settings.port == 8085


