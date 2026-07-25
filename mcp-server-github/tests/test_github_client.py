import pytest
from unittest.mock import AsyncMock, patch
import httpx
from mcp_server_github.github_client import GitHubClient, GitHubAPIError


@pytest.fixture
def github_client():
    return GitHubClient(token="test-token")


@pytest.mark.asyncio
async def test_get_open_pull_requests_success(github_client):
    mock_prs_data = [
        {
            "id": 100,
            "number": 1,
            "title": "Feature PR",
            "state": "open",
            "user": {"login": "octocat"},
            "html_url": "https://github.com/octocat/Hello-World/pull/1",
            "created_at": "2026-01-01T00:00:00Z",
            "draft": False,
            "head": {"ref": "feature-branch"},
            "base": {"ref": "main"},
            "labels": [{"name": "enhancement"}],
            "requested_reviewers": [{"login": "reviewer1"}],
        }
    ]

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_response = httpx.Response(200, json=mock_prs_data)
        mock_get.return_value = mock_response

        result = await github_client.get_open_pull_requests("octocat", "Hello-World")

        assert len(result) == 1
        pr = result[0]
        assert pr["number"] == 1
        assert pr["title"] == "Feature PR"
        assert pr["author"] == "octocat"
        assert pr["html_url"] == "https://github.com/octocat/Hello-World/pull/1"
        assert pr["draft"] is False
        assert pr["labels"] == ["enhancement"]
        assert pr["reviewers"] == ["reviewer1"]

        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert "repos/octocat/Hello-World/pulls" in args[0]
        assert kwargs["params"] == {"state": "open"}


@pytest.mark.asyncio
async def test_get_open_pull_requests_error(github_client):
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_response = httpx.Response(404, json={"message": "Not Found"})
        mock_get.return_value = mock_response

        with pytest.raises(GitHubAPIError) as exc_info:
            await github_client.get_open_pull_requests("invalid-owner", "invalid-repo")

        assert "404" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_file_content_success(github_client):
    import base64

    content_str = "print('Hello World')"
    b64_content = base64.b64encode(content_str.encode("utf-8")).decode("utf-8")

    mock_file_data = {
        "name": "main.py",
        "path": "src/main.py",
        "sha": "abc12345",
        "size": len(content_str),
        "type": "file",
        "content": b64_content,
        "encoding": "base64",
        "html_url": "https://github.com/octocat/Hello-World/blob/main/src/main.py",
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_response = httpx.Response(200, json=mock_file_data)
        mock_get.return_value = mock_response

        result = await github_client.get_file_content("octocat", "Hello-World", "src/main.py", ref="main")

        assert result["name"] == "main.py"
        assert result["path"] == "src/main.py"
        assert result["content"] == content_str
        assert result["encoding"] == "utf-8"

        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert "repos/octocat/Hello-World/contents/src/main.py" in args[0]
        assert kwargs["params"] == {"ref": "main"}


@pytest.mark.asyncio
async def test_get_file_content_not_file_error(github_client):
    mock_dir_data = [
        {"name": "file1.txt", "type": "file"}
    ]

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_response = httpx.Response(200, json=mock_dir_data)
        mock_get.return_value = mock_response

        with pytest.raises(GitHubAPIError) as exc_info:
            await github_client.get_file_content("octocat", "Hello-World", "src")

        assert "not a regular file" in str(exc_info.value)
