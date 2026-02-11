# MCP Server Update Guide (for OpenClaw)

## ✅ Current Status
- **Fix Complete**: Both `callput-agent-mcp` and `mcp-server` are updated.
- **Verification Successful**: 214 active options found.
- **Location**: `/Users/kang/Desktop/01_callput/80_callput_for_agent/`

---

## 🚀 Applying the New MCP Server to OpenClaw

### Method 1: Test with MCP Inspector First (Recommended)

```bash
cd /Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp
npx @modelcontextprotocol/inspector node build/index.js
```

Open http://localhost:6274 in your browser:
1. Click the `get_option_chains` tool.
2. Enter `{"underlying_asset": "WETH"}` as arguments.
3. **Verify you see 214 options!** ✅

---

### Method 2: Claude Desktop Configuration (If OpenClaw uses Claude Desktop)

**Create or Modify the Config File:**
```bash
mkdir -p ~/Library/Application\ Support/Claude
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Configuration Content:**
```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": [
        "/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js"
      ],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

**Restart Claude Desktop** is required!

---

### Method 3: Direct Programmatic Connection (Custom Agents)

If OpenClaw connects to MCP directly via Node.js/Python:

**Node.js Example:**
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js"]
});

const client = new Client({
  name: "openclaw",
  version: "1.0.0"
}, { capabilities: {} });

await client.connect(transport);

// Start using the new version!
const result = await client.callTool({
  name: "get_option_chains",
  arguments: { underlying_asset: "WETH" }
});

console.log(result); // 214 options! 🎉
```

**Python Example:**
```python
import subprocess
import json

# Start MCP server
process = subprocess.Popen(
    ["node", "/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE
)

# Call tool
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "get_option_chains",
        "arguments": {"underlying_asset": "WETH"}
    }
}

process.stdin.write(json.dumps(request).encode() + b'\n')
process.stdin.flush()

response = json.loads(process.stdout.readline())
print(f"Found {response['result']['content'][0]['text']}")  # 214 options!
```

---

## ⚡ Quick Check

**1. Verify the server is working correctly:**
```bash
cd /Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp
node build/test_s3_fetch.js
```

**Expected Output:**
```
✅ S3 fetch successful!
   Total active options available: 214
```

**2. Check OpenClaw Logs:**
OpenClaw should now receive 214 options when it calls MCP.

---

## 🔧 If OpenClaw is already using another version

**Identify the current path:**
```bash
# Check where OpenClaw is running MCP from
ps aux | grep "node.*index.js" | grep -v grep
```

**Update to the new path:**
In your OpenClaw configuration or startup script:
- **AS-IS**: `/old/path/to/mcp-server/build/index.js`
- **TO-BE**: `/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js`

---

## 📋 Checklist

- [x] Test MCP server (`test_s3_fetch.js`) ✅ Already Done
- [ ] Verify how OpenClaw connects to MCP
- [ ] Update path in config file or code
- [ ] Restart OpenClaw
- [ ] Confirm 214 options in `get_option_chains` output

---

## ❓ Not sure how OpenClaw connects to MCP?

Please provide the following information:
1. What is the OpenClaw startup command?
2. Where is the configuration file located?
3. Does OpenClaw documentation mention MCP settings?

Then I can provide more specific update instructions!
