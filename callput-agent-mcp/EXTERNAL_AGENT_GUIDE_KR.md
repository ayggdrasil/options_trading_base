# 🚀 외부 에이전트 설치 및 연동 가이드

이 가이드는 OpenClaw, 커스텀 봇, 또는 기타 AI 프레임워크와 Callput MCP 서버를 연동하는 방법을 설명합니다.

---

## 📦 1단계: 클론 및 설치

```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
```

**연결 확인:**
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

### 방법 A: Claude Desktop (개인 사용 추천)

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

> **중요**: `/path/to/` 부분을 실제 로컬 경로로 변경하세요!
> 예: `/Users/username/options_trading_base/callput-agent-mcp/build/index.js`

설정 업데이트 후 **Claude Desktop을 재시작**하세요.

---

### 방법 B: Node.js 직접 연동

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

console.log(result); // 214개의 옵션 발견!
```

---

### 방법 C: Python 연동

```python
import subprocess
import json

# MCP 서버 시작
process = subprocess.Popen(
    ["node", "./options_trading_base/callput-agent-mcp/build/index.js"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE
)

# 툴 호출
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
print(f"Found options: {response}")
```

---

## 🧪 3단계: MCP Inspector로 테스트

개발 중 디버깅을 위해 강력히 추천합니다.

```bash
cd options_trading_base/callput-agent-mcp
npx @modelcontextprotocol/inspector node build/index.js
```

브라우저에서 http://localhost:6274 접속:
1. `get_option_chains` 툴 선택.
2. 인자로 `{"underlying_asset": "WETH"}` 입력.
3. **200개 이상의 옵션이 보이는지 확인!** ✅

---

## 📊 사용 가능한 툴 (Tools)

### `get_option_chains`

**입력:**
```json
{
  "underlying_asset": "WETH"  // 또는 "WBTC"
}
```

**출력 (계층 구조 데이터):**
```json
{
  "asset": "WETH",
  "expiries": {
    "14FEB26": {
      "days": 1,
      "call": [
        { "s": 3000, "id": "123...", "p": "0.0500", "l": "1.2" },
        { "s": 3100, "id": "124...", "p": "0.0200", "l": "0.8" }
      ],
      "put": [
        { "s": 2800, "id": "125...", "p": "0.0100", "l": "1.0" }
      ]
    }
  }
}
```

### `request_quote`

**스프레드 거래**를 강제합니다 (Callput.app 스타일). 안전을 위해 단일 레그(Naked) 거래는 비활성화되어 있습니다.

**입력:**
```json
{
  "strategy": "BuyCallSpread",  // 또는 "BuyPutSpread"
  "long_leg_id": "123...",      // 롱 포지션 토큰 ID
  "short_leg_id": "124...",     // 숏 포지션 토큰 ID
  "amount": 1,
  "slippage": 0.5
}
```

**출력:**
`PositionManager.createOpenPosition` 호출을 위한 트랜잭션 데이터를 생성합니다.

---

## ❓ 문제 해결 (Troubleshooting)

**"옵션이 0개로 보입니다"**
→ `node build/test_s3_fetch.js`를 실행하여 S3 연결을 확인하세요.

**"Error: Cannot find module"**
→ 올바른 디렉토리에서 `npm install` 및 `npm run build`를 실행했는지 확인하세요.

**"Connection failed"**
→ 인터넷 연결 및 RPC 엔드포인트(기본값: https://mainnet.base.org)를 확인하세요.

**"ERC20: transfer amount exceeds allowance"**
→ **중요:** 거래를 위해서는 **USDC** 승인이 필수입니다.
→ WBTC 옵션을 거래하더라도 결제는 **USDC**로 이루어집니다.
→ **조치:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC) 컨트랙트에서 아래 주소(Router)에 대해 승인(Approve)을 실행하세요.
→ **Spender 주소:** `0xfc61ba50AE7B9C4260C9f04631Ff28D5A2Fa4EB2`
→ `request_quote` 툴의 응답에도 이 주소들이 포함되어 있어 쉽게 확인할 수 있습니다.

---

## 📚 추가 리소스

- [README.md](./README.md) - 메인 문서
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 설계
- [MCP_SETUP.md](./MCP_SETUP.md) - 상세 설정 가이드

---

**200개 이상의 활성 옵션으로 거래를 시작하세요!** 🚀
