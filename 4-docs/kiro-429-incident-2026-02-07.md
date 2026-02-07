# Kiro 429 Incident (2026-02-07)

## Symptom

- Server (`http://142.93.94.219:3001`) returned `429` for nearly all Kiro model tests.
- Error surface in API:
  - `消息创建失败: 上游API返回错误: 429`
  - Upstream reason: `INSUFFICIENT_MODEL_CAPACITY`

## Confirmed Root Cause

- The server-side `kiro_model_mappings` values were switched to dashed model IDs (for example `claude-haiku-4-5-20251001`).
- Under this server path, these mapped IDs consistently hit upstream capacity limits.
- Using dotted mapped IDs (for example `claude-haiku-4.5`, `claude-sonnet-4.5`, `claude-opus-4.6`) immediately restored successful responses.

In short: this was a model-mapping/routing issue, not account disablement and not dual-stack container conflict.

## Verification Performed

- Stopped `antihub-web-new` and `antihub-backend-new` to rule out stack conflict.
- Retested and still reproduced `429`.
- A/B mapping test on server:
  - `claude-haiku-4-5-20251001 -> claude-haiku-4-5-20251001` => frequent `429`
  - `claude-haiku-4-5-20251001 -> claude-haiku-4.5` => `200 OK`
- Plugin logs showed direct upstream response:
  - `{"message":"I am experiencing high traffic, please try again shortly.","reason":"INSUFFICIENT_MODEL_CAPACITY"}`

## Final Mapping Baseline (Server)

- `claude-haiku-4-5-20251001` -> `claude-haiku-4.5`
- `claude-haiku-4-5-20251001-thinking` -> `claude-haiku-4.5`
- `claude-sonnet-4-5` -> `claude-sonnet-4.5`
- `claude-sonnet-4-5-20250929` -> `claude-sonnet-4.5`
- `claude-sonnet-4-5-20250929-thinking` -> `claude-sonnet-4.5`
- `claude-sonnet-4-5-thinking` -> `claude-sonnet-4.5`
- `claude-sonnet-4-20250514` -> `claude-sonnet-4`
- `claude-opus-4-5-20251101` -> `claude-opus-4.5`
- `claude-opus-4-5-20251101-thinking` -> `claude-opus-4.5`
- `claude-opus-4-6` -> `claude-opus-4.6`
- `claude-opus-4-6-20260205` -> `claude-opus-4.6`
- `claude-opus-4-6-20260205-thinking` -> `claude-opus-4.6`
- `claude-opus-4-6-thinking` -> `claude-opus-4.6`

## Preventive Action

- Keep server mapping in dotted Kiro IDs unless upstream routing behavior changes.
- Avoid blindly syncing mapping values from environments with different upstream behavior.
- Keep backend/plugin status propagation as `429` (not wrapped as `500`) for faster diagnosis.
