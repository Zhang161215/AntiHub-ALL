---
name: kiro-edit-tool-param-mapping
description: Kiro Edit 工具参数名映射问题及解决方案：上游返回 old_str/new_str/file_path，Claude Code 期望 old_string/new_string/filePath。流式传输时参数名可能被分割到不同 chunk，需用智能边界缓冲策略处理。Use when: 调试 Kiro 工具调用参数不匹配、流式响应参数截断问题时。
usage:
  created_at: 2026-02-06T01:13:15.474Z
  last_updated: 2026-02-06T01:13:15.474Z
  access_count: 19
  last_accessed: 2026-02-06T06:15:50.105Z
---

## 问题描述

Kiro 上游模型返回的 Edit 工具参数名与 Claude Code 期望的不匹配：
- Kiro 返回: `old_str`, `new_str`, `file_path`
- Claude Code 期望: `old_string`, `new_string`, `filePath`

## 根本原因

流式传输时参数名可能被分割到不同的 chunk（如 `"old_st` + `r"`），导致简单的正则替换无法匹配完整键名。

## 解决方案：智能边界缓冲

在 `kiro_routes.js` 中实现：
1. 检测可能被截断的键名前缀（如 `"old_s`, `"new_`）
2. 暂存可能截断的末尾内容到 `toolCallPendingBuffer`
3. 下一个 chunk 到达时拼接后再做替换
4. 流结束时 `flushPendingBuffers()` 发送剩余内容

关键数据结构：
- `toolCallArgsBuffer`: Map<toolUseId, accumulated args>
- `toolCallPendingBuffer`: Map<toolUseId, pending string>
- `TRUNCATION_PREFIXES`: 所有可能的截断前缀列表

## kiro_client.js 中的对象级映射

当 `message.input` 是完整对象时，在序列化前直接做属性名映射：
javascript
if ('old_str' in normalizedInput) {
  normalizedInput.old_string = normalizedInput.old_str;
  delete normalizedInput.old_str;
}


## 余额更新节流

KiroClient 新增余额更新节流机制：同一账号 60 秒内只更新一次余额，避免频繁 API 调用。使用 `_balanceUpdateTimestamps` Map 记录每个账号的最后更新时间。

## Token 计算改进

`calculateConversationStateTokens()` 函数计算完整 conversationState 结构的 token，包括：
- history 中的 userInputMessage/assistantResponseMessage
- toolResults 内容
- tools 定义（name, description, inputSchema）

## History 消息合并

Kiro 要求 history 必须 user/assistant 交替。在 `kiro_client.js` 中实现连续同角色消息合并：
- 合并连续 user 消息的 content 和 toolResults
- 合并连续 assistant 消息的 content

## Related files

- `AntiHub-plugin/src/server/kiro_routes.js`
- `AntiHub-plugin/src/api/kiro_client.js`
- `AntiHub-plugin/src/services/kiro.service.js`
- `AGENTS.md`