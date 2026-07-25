import asyncio
import os
import pytest
import uvicorn
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client
from mcp_server_github.server import mcp


@pytest.fixture(scope="module")
def streamable_http_server():
    """Start streamable HTTP FastMCP server in a background thread for testing."""
    import threading
    
    app = mcp.streamable_http_app()
    config = uvicorn.Config(app, host="127.0.0.1", port=8901, log_level="warning")
    server = uvicorn.Server(config)
    
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    
    # Give uvicorn server time to bind and start listening
    import time
    time.sleep(1)
    
    yield "http://127.0.0.1:8901/mcp"
    
    server.should_exit = True
    thread.join(timeout=2)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_streamable_http_connection_and_list_tools(streamable_http_server):
    """Verify Streamable HTTP transport lists registered tools."""
    url = streamable_http_server
    
    async with streamable_http_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            response = await session.list_tools()
            tool_names = [tool.name for tool in response.tools]
            
            assert "list_open_pull_requests" in tool_names
            assert "get_file_content" in tool_names


@pytest.mark.integration
@pytest.mark.asyncio
async def test_streamable_http_call_get_file_content_tool(streamable_http_server):
    """Verify calling tool over Streamable HTTP transport."""
    url = streamable_http_server
    
    async with streamable_http_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            result = await session.call_tool(
                "get_file_content",
                arguments={"owner": "octocat", "repo": "Hello-World", "path": "README"}
            )
            
            assert len(result.content) > 0
            text_response = result.content[0].text
            assert "# File: README" in text_response
