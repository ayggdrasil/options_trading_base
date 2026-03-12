# Callput Lite MCP + Skill

Minimal documentation package for external agents (OpenClaw, Bankr, others) to trade on Callput.app on Base.

This package is designed for:
- minimal setup
- minimal context usage
- spread-only safe workflow
- no Python SDK dependency on the external agent side

## What You Get
- Minimal MCP server (`stdio`) with core tools only
- Ready-to-use `SKILL.md`
- OpenClaw/Bankr MCP config templates
- First-trade prompt templates
- Safe defaults (`dry_run=true`)

## Folder Contents
- `src/` : MCP server implementation
- `SKILL.md` : external agent skill policy
- `MCP_SETUP.md` : setup instructions
- `EXTERNAL_AGENT_PROMPT.md` : system prompt block
- `OPENCLAW_MCP_CONFIG.template.json` : OpenClaw config template
- `BANKR_MCP_CONFIG.template.json` : Bankr config template
- `FIRST_TRADE_PROMPTS.md` : copy-paste trading prompts

## MCP Tool Set
- `callput_bootstrap`
- `callput_get_option_chains`
- `callput_validate_spread`
- `callput_execute_spread`
- `callput_check_request_status`
- `callput_get_positions`
- `callput_close_position`
- `callput_settle_position`

## Quick Start

```bash
cd <repo_root>/callput-lite-mcp-skill
npm install
npm run build
npm run verify
npm run verify:mcp
```

## Runtime Environment
- `RPC_URL` (optional)
  - default: `https://mainnet.base.org`
- `CALLPUT_PRIVATE_KEY` (required only for real execution mode)

## Connect OpenClaw / Bankr
1. Copy template:
   - `OPENCLAW_MCP_CONFIG.template.json` or `BANKR_MCP_CONFIG.template.json`
2. Replace placeholders:
   - `<repo_root>`
   - `CALLPUT_PRIVATE_KEY`
3. Restart agent runtime.
4. Run first prompts from `FIRST_TRADE_PROMPTS.md`.

## Execution Modes
- Dry-run (default):
  - `callput_execute_spread(dry_run=true)`
  - `callput_close_position(dry_run=true)`
  - `callput_settle_position(dry_run=true)`
- Real execution:
  - set `dry_run=false`
  - ensure `CALLPUT_PRIVATE_KEY` is set in MCP env

## Mandatory Trading Rules
1. Spread-only execution.
2. Validate before execute.
3. Call spread: long lower strike, short higher strike.
4. Put spread: long higher strike, short lower strike.
5. Poll request status after broadcast.
6. Close pre-expiry, settle post-expiry.

## Notes
- The server fetches live market data from Callput S3 feed.
- Keep private keys out of logs and chat output.
- For production use, add your own notional/risk limits at orchestrator layer.
