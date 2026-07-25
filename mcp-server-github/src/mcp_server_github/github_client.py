import base64
import os
from typing import Any, Dict, List, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()


class GitHubAPIError(Exception):
    """Exception raised for errors when communicating with the GitHub API."""
    pass


class GitHubClient:
    """Async client for interacting with the GitHub REST API."""

    BASE_URL = "https://api.github.com"

    def __init__(self, token: Optional[str] = None) -> None:
        self.token = token or os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN") or os.getenv("GITHUB_TOKEN")

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "mcp-server-github",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def get_open_pull_requests(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Fetch open pull requests for a given repository."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/pulls"
        headers = self._get_headers()
        params = {"state": "open"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code != 200:
                    raise GitHubAPIError(
                        f"Failed to fetch PRs: HTTP {response.status_code} - {response.text}"
                    )
                prs_data = response.json()
            except httpx.RequestError as exc:
                raise GitHubAPIError(f"HTTP request error: {exc}") from exc

        formatted_prs: List[Dict[str, Any]] = []
        for pr in prs_data:
            formatted_prs.append({
                "id": pr.get("id"),
                "number": pr.get("number"),
                "title": pr.get("title"),
                "author": pr.get("user", {}).get("login"),
                "html_url": pr.get("html_url"),
                "state": pr.get("state"),
                "created_at": pr.get("created_at"),
                "updated_at": pr.get("updated_at"),
                "draft": pr.get("draft", False),
                "head": pr.get("head", {}).get("ref"),
                "base": pr.get("base", {}).get("ref"),
                "labels": [label.get("name") for label in pr.get("labels", []) if isinstance(label, dict)],
                "reviewers": [rev.get("login") for rev in pr.get("requested_reviewers", []) if isinstance(rev, dict)],
            })
        return formatted_prs

    async def get_file_content(
        self, owner: str, repo: str, path: str, ref: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch content of a specific file from a GitHub repository."""
        clean_path = path.lstrip("/")
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{clean_path}"
        headers = self._get_headers()
        params = {}
        if ref:
            params["ref"] = ref

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code != 200:
                    raise GitHubAPIError(
                        f"Failed to fetch file content: HTTP {response.status_code} - {response.text}"
                    )
                data = response.json()
            except httpx.RequestError as exc:
                raise GitHubAPIError(f"HTTP request error: {exc}") from exc

        if isinstance(data, list):
            raise GitHubAPIError(f"The path '{path}' is a directory, not a regular file.")

        if data.get("type") != "file":
            raise GitHubAPIError(f"The item at '{path}' is not a regular file (type: {data.get('type')}).")

        encoding = data.get("encoding")
        raw_content = data.get("content", "")

        if encoding == "base64":
            decoded_bytes = base64.b64decode(raw_content)
            decoded_text = decoded_bytes.decode("utf-8", errors="replace")
        else:
            decoded_text = raw_content

        return {
            "name": data.get("name"),
            "path": data.get("path"),
            "sha": data.get("sha"),
            "size": data.get("size"),
            "content": decoded_text,
            "encoding": "utf-8",
            "html_url": data.get("html_url"),
        }
