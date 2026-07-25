import argparse
import os
from mcp_server_github.server import mcp


def main():
    parser = argparse.ArgumentParser(description="GitHub FastMCP Server")
    parser.add_argument(
        "--transport",
        choices=["streamable-http", "sse", "stdio"],
        default=os.getenv("MCP_TRANSPORT", "streamable-http"),
        help="Transport protocol to use (default: streamable-http)",
    )
    parser.add_argument(
        "--host",
        default=os.getenv("MCP_HOST", "0.0.0.0"),
        help="Host address to bind HTTP server (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("MCP_PORT", "8085")),
        help="Port to listen for HTTP server (default: 8085)",
    )

    args = parser.parse_args()

    mcp.settings.host = args.host
    mcp.settings.port = args.port

    if args.transport != "stdio":
        print(f"Starting GitHub FastMCP Server using {args.transport} transport at http://{args.host}:{args.port}/mcp")

    mcp.run(transport=args.transport)


if __name__ == "__main__":
    main()
