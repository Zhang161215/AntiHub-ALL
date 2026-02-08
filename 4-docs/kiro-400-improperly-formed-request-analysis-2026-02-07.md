# Kiro 400 "Improperly formed request" Analysis (2026-02-07)

## Symptom

Some Kiro requests fail with upstream HTTP 400 and body:

```json
{"message":"Improperly formed request.","reason":null}
```

Observed in AntiHub plugin logs as:

- `API错误: 400 - {"message":"Improperly formed request.","reason":null}`
- `Kiro生成响应失败: 错误: 400 {"message":"Improperly formed request.","reason":null}`

## Where It Happens

- Failing call path: `AntiHub-plugin/src/api/kiro_client.js` -> `generateResponseWithCwRequest()` -> upstream `POST /generateAssistantResponse`.
- The backend (`AntiHub-Backend`) calls the plugin endpoint `/v1/kiro/chat/completions`; backend logs can still show `200` for requests that succeed and will show the upstream status for failures.

## Evidence Collected

### 1) Upstream 400 is real (not synthesized)

The plugin logs the upstream HTTP status and raw error body for non-200 responses. For failing requests, it logs status `400` plus the exact error JSON.

### 2) Request dump files exist for failures

The plugin dumps each outgoing payload to:

- `/tmp/kiro_request_<requestId>.json`

For example, failing request IDs include:

- `a4c62ff1`, `e09f429c`, `c828df39`, `0f93c4d3` (and others)

### 3) Failures correlate with heavier `conversationState`

By correlating plugin log lines `DEBUG payload: modelId=..., tools_count=..., history_count=..., content_len=...` with `收到响应: status=...`, the 400 cases show a clear pattern:

- Model involved: almost always `modelId=claude-opus-4.6` (after model mapping)
- `history_count` for 400 cases: typically **174 ~ 532**, average ~ **415.8**
- `tools_count` for 400 cases: typically **34 ~ 48**, average ~ **43.8**
- Dumped JSON file sizes for 400 cases: typically **~730KB to ~860KB**

Compared to successful (`200`) requests for the same model, the successful set has a much lower average `history_count` (~150), although high-history successes do exist.

### 4) Not a simple token hard-limit

Token calculation logs show that there are successful requests with very high `promptTokens` (higher than some failing ones). Therefore, this is unlikely to be a strict, deterministic token limit error.

### 5) Large tool results contribute significant payload bloat

Inspection of some failing dumps shows large `toolResults` content embedded in history (and sometimes currentMessage), e.g. multi-KB tool outputs like test logs.

## Conclusion (Most Likely Root Cause)

This is primarily a **request shape / payload complexity** issue:

- The outgoing `conversationState` becomes very large/complex in long-running conversations (many history entries) and tool-heavy sessions (large tool schema + accumulated tool results).
- The upstream Kiro endpoint responds with a generic validation error (`Improperly formed request`) when the request body is too large, too complex, or contains combinations of fields that fail its internal schema/limits.

This is **not best explained** by:

- Account disablement (accounts still succeed frequently)
- Dual-stack container conflict (not correlated)
- Missing JSON serialization (payload JSON dumps parse correctly)
- A strict token threshold (counterexamples exist)

## Proposed Solutions (Feasible + High Impact)

### Option A (Recommended): Request Budget + Progressive Degradation

Implement a "budgeter" before sending to `/generateAssistantResponse`:

- **Hard cap on request body bytes** (e.g. 650KB)
- **Cap history length** (keep latest N entries, e.g. 120~160)
- **Cap per-tool-result size** (truncate long tool outputs to e.g. 4~8KB + add a short suffix like "[truncated]")
- Optionally **cap total toolResults bytes** in history

If upstream returns 400 `Improperly formed request`, automatically retry with increasing degradation:

1. Retry after truncating toolResults
2. Retry after reducing history window
3. Retry with minimal context (latest user + assistant + a short summary) if supported

Where to implement:

- `AntiHub-plugin/src/api/kiro_client.js` in `generateResponseWithCwRequest()` (right before `JSON.stringify(payload)`)

Why this works:

- Makes request shape stable under long sessions
- Converts hard failures into recoverable retries

### Option B: Tool Schema Load Shedding

Reduce size of `currentMessage.userInputMessageContext.tools`:

- Send only tools that are actually needed for the current request
- Or limit tool list to a small allowlist per task type

Where to implement:

- Same location as Option A; filter the tools array in `conversationState.currentMessage.userInputMessage.userInputMessageContext.tools`

### Option C: Persisted Summary / Context Compaction

Instead of sending the entire conversation history, maintain a compact summary and send:

- Summary + last K turns

This requires more logic and careful correctness testing but yields best long-run stability.

## Verification Plan

After implementing a mitigation:

1. Reproduce the failing scenario (long history + tool-heavy)
2. Confirm upstream no longer returns 400
3. Confirm output quality remains acceptable
4. Confirm request dump file sizes remain under the configured byte budget

## Notes

- The plugin already patches one known 400 cause: `toolSpecification.description` must be non-empty.
- This incident suggests there are additional upstream constraints beyond that single field requirement.
