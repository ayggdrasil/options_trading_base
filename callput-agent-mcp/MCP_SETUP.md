# MCP Server Configuration Guide

## For Claude Desktop / MCP Clients

1. Find your MCP configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add this server to the `mcpServers` section:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": [
        "/Users/kang/Desktop/01_callput/80_callput_for_agent/mcp-server/build/index.js"
      ],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

3. Restart Claude Desktop

4. The agent should now see two new tools:
   - `get_option_chains`
   - `request_quote`

## For Custom AI Agents

If your OpenClaw bot is custom-built, you need to:

1. **Install MCP SDK** in your agent:
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. **Connect via stdio**:
   ```typescript
   import { Client } from "@modelcontextprotocol/sdk/client/index.js";
   import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
   
   const transport = new StdioClientTransport({
     command: "node",
     args: ["/Users/kang/Desktop/01_callput/80_callput_for_agent/mcp-server/build/index.js"],
     env: { RPC_URL: "https://mainnet.base.org" }
   });
   
   const client = new Client({
     name: "openclaw-bot",
     version: "1.0.0",
   }, {
     capabilities: {}
   });
   
   await client.connect(transport);
   
   // Now you can call tools
   const result = await client.callTool({
     name: "get_option_chains",
     arguments: { underlying_asset: "WETH" }
   });
   ```

## Quick Test (Manual)

To test without an agent, you can use the MCP Inspector:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector
npx @modelcontextprotocol/inspector node /Users/kang/Desktop/01_callput/80_callput_for_agent/mcp-server/build/index.js
```

This will open a web UI where you can manually test the tools.

## Environment Variables

Optional configuration:

```bash
# Custom RPC endpoint (default: https://mainnet.base.org)
export RPC_URL="https://your-custom-base-rpc.com"
```

## Verification

After connecting, ask your agent to:

1. **Test option query**:
   ```
   "Can you show me available WETH options on Callput?"
   ```

2. **Test quote generation**:
   ```
   "Generate a transaction to buy a WETH Call option at strike 3000"
   ```

The agent should return real data from Base L2!
