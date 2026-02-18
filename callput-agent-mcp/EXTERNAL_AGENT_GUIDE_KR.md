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

설정과 업데이트 후 **Claude Desktop을 재시작**하세요.

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
  name: "callput_get_option_chains",
  arguments: { underlying_asset: "ETH" }
});

console.log(result);
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
        "name": "callput_get_option_chains",
        "arguments": {"underlying_asset": "ETH"}
    }
}

process.stdin.write(json.dumps(request).encode() + b'\n')
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
1. `callput_get_option_chains` 툴 선택.
2. 인자로 `{"underlying_asset": "ETH"}` 입력.
3. **200개 이상의 옵션이 보이는지 확인!** ✅

---

## 📊 사용 가능한 툴 및 워크플로우

성공적인 거래를 위해 반드시 아래의 **6단계 워크플로우**를 준수해야 합니다. 승인(Approval)이나 검증(Verification) 단계를 건너뛰면 거래가 실패합니다.

### 1단계: 분석 및 탐색 (Analysis & Discovery)
1.  **자산 확인**: `callput_get_available_assets`로 지원 자산(BTC/ETH) 확인.
2.  **시장 동향**: `callput_get_market_trends`로 현재가, IV, 감성 분석 확인.
3.  **옵션 조회**: `callput_get_option_chains(underlying_asset)`.
    - 반환 형식: `[Strike, Price, Liquidity, MaxQty, OptionID]`.

### 2단계: 전략 수립 및 검증 (Strategy & Validation)
1.  **전략 선택**: `BuyCallSpread` (강세) 또는 `BuyPutSpread` (약세).
2.  **검증**: `callput_validate_spread(strategy, long_leg_id, short_leg_id)`.
    - **반드시** `status: "Valid"`이고 `maxTradableQuantity > 0`인지 확인하십시오.

### 3단계: USDC 승인 (Approval - 필수)
1.  **승인 생성**: `callput_approve_usdc(amount)`.
    - **Router** 컨트랙트가 사용자의 USDC를 사용할 수 있도록 허용하는 트랜잭션을 생성합니다.
2.  **실행**: 생성된 트랜잭션을 전송하고 채굴될 때까지 기다립니다.

### 4단계: 거래 실행 (Execution)
1.  **거래 생성**: `callput_request_quote(strategy, long_leg_id, short_leg_id, amount)`.
2.  **실행**: 생성된 트랜잭션을 전송합니다. **트랜잭션 해시를 반드시 저장하십시오.**

### 5단계: 거래 결과 검증 (Verification - 필수)
1.  **상태 확인**: `callput_check_tx_status(tx_hash, is_open=true)`.
2.  **대기**: 온체인 실행은 비동기 키퍼(Keeper)에 의해 처리됩니다.
    - 상태가 `pending`이면 15-30초 후 다시 확인하십시오.
    - 상태가 `executed`이면 포지션 오픈 성공!

### 6단계: 모니터링 및 종료 (Monitoring & Exit)
1.  **모니터링**: `callput_get_my_positions(address)`로 실시간 PnL 확인.
2.  **조기 종료**: `callput_close_position(...)` -> `callput_check_tx_status(tx_hash, is_open=false)`로 검증.
3.  **만기 정산**: 만기 시까지 보유했다면 `callput_settle_position` 사용.

---

## 🛠 툴 레퍼런스 (Tool Reference)

### `callput_approve_usdc`
Router 컨트랙트가 사용자의 USDC를 사용할 수 있도록 승인 트랜잭션을 생성합니다.
- **입력**: `amount` (예: $100 승인 시 "100")

### `callput_request_quote`
실제 옵션 거래 트랜잭션 데이터를 생성합니다.
- **입력**: `strategy`, `long_leg_id`, `short_leg_id`, `amount`, `slippage`
- **중요**: 생성된 calldata에는 `isBuys`, `isCalls`, `optionIds` 등 온체인 실행에 필요한 모든 데이터가 정확히 포함되어 있습니다.

### `callput_check_tx_status`
`GenerateRequestKey` 이벤트를 파싱하고 컨트랙트를 조회하여 거래가 **성공(Executed)**, **취소(Cancelled)**, 또는 **대기(Pending)** 중인지 확인합니다.
- **입력**: `tx_hash`, `is_open` (오픈 시 true, 종료 시 false)

### `callput_get_my_positions`
활성 포지션 목록과 실시간 mark price 기반 PnL을 가져옵니다.

---

## ❓ 문제 해결 (Troubleshooting)

**"옵션이 0개로 보입니다"**
→ `node build/test_s3_fetch.js`를 실행하여 S3 연결을 확인하세요.

**"ERC20: transfer amount exceeds allowance"**
→ **중요:** 거래를 위해서는 **USDC 승인**이 필수입니다. `callput_approve_usdc` 툴을 사용하십시오.

---

## 📚 추가 리소스

- [README.md](./README.md) - 메인 문서
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 설계

---

## 💬 고객 지원

- GitHub Issues: https://github.com/ayggdrasil/options_trading_base/issues
- 공식 웹사이트: https://callput.app

---

**200개 이상의 활성 옵션으로 거래를 시작하세요!** 🚀
