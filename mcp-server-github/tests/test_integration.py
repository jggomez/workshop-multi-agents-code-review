import os
import pytest
from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters


@pytest.fixture
def stdio_server_params():
    """Server parameters to launch mcp-server-github via uv in subprocess using stdio transport."""
    return StdioServerParameters(
        command="uv",
        args=["run", "mcp-server-github", "--transport", "stdio"],
        env=dict(os.environ),
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_mcp_server_stdio_connection_and_list_tools(stdio_server_params):
    """Integration test: Verify MCP server starts via stdio and lists registered tools."""
    async with stdio_client(stdio_server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            response = await session.list_tools()
            tool_names = [tool.name for tool in response.tools]
            
            assert "list_open_pull_requests" in tool_names
            assert "get_file_content" in tool_names

            tools_map = {t.name: t for t in response.tools}
            assert tools_map["list_open_pull_requests"].description == "List open Pull Requests of a repository for review."
            assert "Get the content of a specific file" in tools_map["get_file_content"].description


@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_list_open_pull_requests_tool(stdio_server_params):
    """Integration test: Execute list_open_pull_requests tool through actual MCP session."""
    async with stdio_client(stdio_server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            result = await session.call_tool(
                "list_open_pull_requests",
                arguments={"owner": "octocat", "repo": "Hello-World"}
            )
            
            assert len(result.content) > 0
            text_response = result.content[0].text
            assert "No open pull requests found" in text_response or "[" in text_response


@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_get_file_content_tool(stdio_server_params):
    """Integration test: Execute get_file_content tool through actual MCP session for a public file."""
    async with stdio_client(stdio_server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            result = await session.call_tool(
                "get_file_content",
                arguments={"owner": "octocat", "repo": "Hello-World", "path": "README"}
            )
            
            assert len(result.content) > 0
            text_response = result.content[0].text
            assert "# File: README" in text_response
            assert "Hello World" in text_response or "Hello-World" in text_response


@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_get_file_content_not_found_handling(stdio_server_params):
    """Integration test: Verify graceful error handling when file does not exist."""
    async with stdio_client(stdio_server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            result = await session.call_tool(
                "get_file_content",
                arguments={"owner": "octocat", "repo": "Hello-World", "path": "non_existent_file_99999.txt"}
            )
            
            assert len(result.content) > 0
            text_response = result.content[0].text
            assert "Error reading file content" in text_response
            assert "404" in text_response
