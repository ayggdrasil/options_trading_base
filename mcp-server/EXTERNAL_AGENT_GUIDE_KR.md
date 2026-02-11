# 🚀 외부 에이전트용 설치 가이드 (한국어)

Callput MCP 서버를 외부 에이전트(OpenClaw, 커스텀 봇 등)에 연결하는 방법입니다.

---

## 📦 1단계: GitHub에서 Clone

```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
```

**테스트:**
```bash
node build/test_s3_fetch.js
```

**예상 출력:**
```
✅ S3 fetch successful!
   Total active options available: 214
```

---

## 🔌 2단계: 에이전트 연결

### 방법 A: Claude Desktop (가장 간단)

**설정 파일 위치:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

**설정 내용:**
```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": [
        "/path/to/options_trading_base/callput-agent-mcp/build/index.js"
      ],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

> **중요**: `/path/to/`를 실제 clone한 경로로 변경하세요!
> 예: `/Users/kang/options_trading_base/callput-agent-mcp/build/index.js`

**Claude Desktop 재시작** 후 사용 가능!

---

### 방법 B: Node.js 직접 연결

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./options_trading_base/callput-agent-mcp/build/index.js"]
});

const client = new Client({
  name: "my-agent",
  version: "1.0.0"
}, { capabilities: {} });

await client.connect(transport);

// 옵션 조회
const result = await client.callTool({
  name: "get_option_chains",
  arguments: { underlying_asset: "WETH" }
});

console.log(result); // 214 options!
```

---

### 방법 C: Python 연결

```python
import subprocess
import json

# MCP 서버 시작
process = subprocess.Popen(
    ["node", "./options_trading_base/callput-agent-mcp/build/index.js"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE
)

# 도구 호출
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "get_option_chains",
        "arguments": {"underlying_asset": "WETH"}
    }
}

process.stdin.write(json.dumps(request).encode() + b'\\n')
process.stdin.flush()

response = json.loads(process.stdout.readline())
print(f"Found options: {response}")  # 214 options!
```

---

## 🧪 3단계: 테스트

### MCP Inspector로 확인 (권장)

```bash
cd options_trading_base/callput-agent-mcp
npx @modelcontextprotocol/inspector node build/index.js
```

브라우저가 열리면 http://localhost:6274 접속:
1. `get_option_chains` 도구 선택
2. `{"underlying_asset": "WETH"}` 입력
3. **214개 옵션 확인!** ✅

---

## 📊 사용 가능한 도구

### `get_option_chains`

**입력:**
```json
{
  "underlying_asset": "WETH"  // 또는 "WBTC"
}
```

**출력:**
```json
{
  "total_options": 214,
  "data_source": "S3 Market Data (Updated Live)",
  "options": [
    {
      "instrument": "ETH-14FEB26-3200-C",
      "strike_price": 3200,
      "mark_price": 0.125,
      "mark_iv": 0.65,
      "delta": 0.48,
      "gamma": 0.0012,
      "display": {
        "description": "Call @ 3200 expiring 14FEB26",
        "days_to_expiry": 3
      }
    }
  ]
}
```

### `request_quote`

거래 실행을 위한 트랜잭션 생성

---

## ❓ 문제 해결

**"214 옵션이 안 보여요"**
→ `node build/test_s3_fetch.js` 실행해서 S3 연결 확인

**"Error: Cannot find module"**
→ `npm install`과 `npm run build` 다시 실행

**"Connection failed"**
→ RPC_URL이 정상인지 확인 (https://mainnet.base.org)

---

## 📚 추가 문서

- [README.md](./README.md) - 전체 문서 (영문)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 구조
- [MCP_SETUP.md](./MCP_SETUP.md) - 상세 설정 가이드

---

## 💬 지원

- GitHub Issues: https://github.com/ayggdrasil/options_trading_base/issues
- Callput 앱: https://callput.app

---

**214개 옵션으로 시작하세요!** 🚀
