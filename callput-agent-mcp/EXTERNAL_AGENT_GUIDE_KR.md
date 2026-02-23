# 외부 에이전트 연동 가이드 (Callput MCP)

이 문서는 OpenClaw 및 외부 에이전트가 `callput-agent-mcp`를 연동할 때 발생하는 핵심 오류를 방지하기 위한 운영 가이드입니다.

## 목적

아래 실패를 사전에 차단합니다.
- 바닐라 단일 레그를 직접 거래하려는 시도
- 검증(`validate`) 없이 바로 `quote` 호출
- 유동성이 없는 레그를 반복 재시도

## 빠른 설치

```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
node build/test_s3_fetch.js
```

예상 결과: 활성 옵션 개수 출력.

## 클라이언트 연결

### Claude Desktop

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": ["/path/to/options_trading_base/callput-agent-mcp/build/index.js"],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

### Node SDK

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./options_trading_base/callput-agent-mcp/build/index.js"],
  env: { RPC_URL: "https://mainnet.base.org" }
});

const client = new Client({ name: "external-agent", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);
```

---

## 표준 툴 세트

### 탐색
- `callput_get_available_assets`
- `callput_get_market_trends`
- `callput_get_option_chains`
- `callput_get_greeks`

### 실행
- `callput_validate_spread`
- `callput_approve_usdc`
- `callput_request_quote`
- `callput_check_tx_status`

### 포지션 관리
- `callput_get_my_positions`
- `callput_close_position`
- `callput_settle_position`

레거시 alias는 호환용입니다. 신규 에이전트는 표준(`callput_*`)만 사용하십시오.

---

## 필수 실행 계약 (강제 규칙)

에이전트 오케스트레이터에서 아래를 반드시 강제하세요.

1. `callput_get_option_chains` 결과는 레그 탐색용입니다.
2. 바닐라 단일 레그 직접 체결은 금지입니다.
3. `callput_request_quote` 전에 `callput_validate_spread`를 반드시 호출합니다.
4. 아래 조건을 동시에 만족해야만 진행합니다.
   - `status = "Valid"`
   - `details.maxTradableQuantity > 0`
5. 브로드캐스트 후 `callput_check_tx_status`를 반드시 수행합니다.
6. `cancelled`면 기존 calldata 재전송 금지, 레그 재탐색부터 재시작합니다.
7. 종료는 만기 기준으로 분기합니다.
   - 만기 전: `callput_close_position`
   - 만기 후: `callput_settle_position`

---

## 컨텍스트 예산 계약 (필수)

장시간 세션에서 context overflow를 줄이기 위해 아래를 강제하세요.

1. MCP 원본 응답은 즉시 요약하고 폐기합니다.
   - `expiries` 전체 맵을 장기 메모리에 보관하지 않습니다.
2. 유지 상태는 최소 필드만 저장합니다.
   - `asset`, `bias`, `target_expiry`
   - `candidate_spreads` (최대 5개)
   - `selected_long_leg_id`, `selected_short_leg_id`
   - `validation_status`, `maxTradableQuantity`
   - `tx_hash`, `tx_status`
3. 사이클당 호출 수를 제한합니다.
   - 체인 조회 최대 1회
   - Greeks 조회 최대 6회
   - Validate 최대 5회
   - Quote 최대 1회
4. 입력 범위를 초기에 좁힙니다.
   - 가능하면 `option_type`, `expiry_date`를 반드시 사용
   - 전 만기를 반복 조회하는 루프 금지
5. 상태 폴링은 최신 스냅샷만 유지합니다.
   - 이전 `check_tx_status` 응답 누적 금지
6. 로깅은 압축 형태만 사용합니다.
   - calldata 전체 반복 저장 금지
   - 해시/레그 ID/최종 상태 중심으로 기록
7. 컨텍스트가 커지면 압축 상태만 남기고 재부팅합니다.
   - 필요 시 시장 데이터는 fresh query로 재조회

---

## 권장 운영 플로우 (실서비스)

### 1단계: 탐색
1. `callput_get_available_assets`
2. `callput_get_market_trends`
3. `callput_get_option_chains(underlying_asset, expiry_date?, option_type?)`

참고:
- 체인 출력 포맷: `[Strike, Price, Liquidity, MaxQty, OptionID]`
- Spot 주변 스트라이크 위주로 반환됩니다.

### 2단계: 후보 선정
- Long/Short 레그를 조합해 스프레드 후보를 만듭니다.
- 유동성 구간 근처 스트라이크를 우선 선택합니다.

### 3단계: 검증 (필수)

```json
{
  "name": "callput_validate_spread",
  "arguments": {
    "strategy": "BuyCallSpread",
    "long_leg_id": "...",
    "short_leg_id": "..."
  }
}
```

통과 조건:
- `status = Valid`
- `details.maxTradableQuantity > 0`

검증 항목:
- 동일 기초자산/만기
- 전략별 행사가 방향 일치
- 최소 스프레드 가격
  - BTC >= 60
  - ETH >= 3

### 4단계: 승인
- allowance 부족 시 `callput_approve_usdc(amount)` 호출
- 승인 트랜잭션 서명/전송

### 5단계: 견적 및 전송
- `callput_request_quote(...)` 호출
- unsigned tx 서명/전송
- `tx_hash` 저장

### 6단계: 키퍼 상태 확인 루프
- `callput_check_tx_status(tx_hash, is_open=true)`
- 15~30초 간격으로 poll

종료 상태:
- `executed`: 오픈 성공
- `cancelled`: 1~2단계로 돌아가 레그 재선정 후 재검증
- `reverted`: 승인/파라미터 점검 후 복구

### 7단계: 포지션 라이프사이클
- `callput_get_my_positions(address)`로 모니터링
- 만기 전 청산: `callput_close_position` + `callput_check_tx_status(..., false)`
- 만기 후 정산: `callput_settle_position`

---

## 자주 발생하는 실패와 대응

### 증상: "Option is not available"
원인:
- 레그가 오래되어 체결 시점에 비가용/저유동성

대응:
- 체인 재조회
- 레그 재선정
- 검증 재수행
- 새 quote 생성

### 증상: `cancelled`
원인:
- 요청 이후 가격/유동성 변화로 키퍼 실행 실패

대응:
- 이전 calldata 재사용 금지
- 후보 탐색부터 재시작

### 증상: 바닐라 단일 거래 시도
원인:
- 체인 출력을 "직접 체결 가능"으로 오해

대응:
- 정책 레이어에 "스프레드만 체결" 규칙 하드코딩

### 증상: allowance 에러
원인:
- 승인 누락 또는 잘못된 spender

대응:
- `callput_approve_usdc` 실행
- quote 응답의 approval 정보 재확인

---

## OpenClaw 시스템 프롬프트 블록

OpenClaw 시스템 프롬프트에는 `/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/OPENCLAW_SYSTEM_PROMPT.md` 내용을 정책 블록으로 포함하세요.

최소 포함 항목:
- 스프레드 전용 실행
- validate 선행 후 quote
- 브로드캐스트 후 status polling
- 만기 기준 close/settle 분기
- 컨텍스트 예산 계약

---

## Inspector 디버깅

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

권장 테스트 순서:
1. `callput_get_option_chains`
2. `callput_validate_spread`
3. `callput_request_quote`
4. `callput_check_tx_status`

---

## 보안

- 개인키를 MCP 입력/로그로 전달하지 마십시오.
- 키 보관/서명은 에이전트 런타임에서 처리하십시오.
- MCP 응답은 unsigned tx 지시로만 취급하십시오.
