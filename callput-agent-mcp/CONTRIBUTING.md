# Contributing to Callput Agent MCP

Thanks for contributing.

## Development Setup

```bash
npm install
npm run build
node build/test_s3_fetch.js
```

Optional connectivity check:
```bash
node build/test_connection.js
```

`test_connection` is for RPC/contract connectivity only. Do not use it as tradability validation.

## Core Contribution Rules

1. Keep documentation aligned with `src/index.ts` tool schema.
2. Preserve spread-only execution semantics in docs and examples.
3. Do not introduce examples that imply direct vanilla single-leg execution.
4. Keep close vs settle behavior accurate:
   - pre-expiry close
   - post-expiry settle

## Before Opening PR

- [ ] Build passes: `npm run build`
- [ ] S3 fetch test passes: `node build/test_s3_fetch.js`
- [ ] If tool schema changed, update these docs:
  - `README.md`
  - `SKILL.md`
  - `MCP_SETUP.md`
  - `EXTERNAL_AGENT_GUIDE.md`
  - `EXTERNAL_AGENT_GUIDE_KR.md`
  - `ARCHITECTURE.md`
  - `EXAMPLE_OUTPUT.md`
- [ ] Confirm no stale references to deprecated legacy flow remain

## Branch and PR Notes

- Use clear branch and PR titles.
- Include behavior changes, migration notes, and sample request/response when tool output changes.

