---
name: kiro-service-client
description: Kiro 对接位于 AntiHub-plugin：路由在 kiro_routes.js，请求封装在 kiro_client.js，业务逻辑在 kiro.service.js；排查返回截断/上下文限制时重点看 truncation/config、token 计算日志，以及 hasConversationState/conversationState 的传递与落点。Use when: 需要调试或修改 Kiro 请求、超时、鉴权、上下文续聊与输出处理行为时。
usage:
  created_at: 2026-01-31T03:43:41.706Z
  last_updated: 2026-01-31T04:24:21.836Z
  access_count: 11
  last_accessed: 2026-02-06T03:55:34.489Z
---

## 入口位置

- Kiro 路由入口：`AntiHub-plugin/src/server/kiro_routes.js`
- Kiro 业务服务层：`AntiHub-plugin/src/services/kiro.service.js`
- Kiro API Client 封装：`AntiHub-plugin/src/api/kiro_client.js`

## 排查要点

- 输出被截断：优先定位“truncation”相关处理与触发条件（长度/Token/流式拼接）。
- 上下文限制：检查请求参数中的 context/limit/max_tokens 等配置与默认值来源。
- Token 计算日志：确认 token 计算是否在跑、是否有异常/短路；必要时加/开 debug logs 后重新部署并重启服务。
- 会话状态：核对 hasConversationState 的判断逻辑；确认 conversationState 实际从哪里收到、字段名/结构是否一致、在路由层是否被覆盖或丢弃。

## Related files

- `AntiHub-plugin/src/server/kiro_routes.js`
- `AntiHub-plugin/src/services/kiro.service.js`
- `AntiHub-plugin/src/api/kiro_client.js`

## Related files

- `AntiHub-plugin/src/server/kiro_routes.js`
- `AntiHub-plugin/src/services/kiro.service.js`
- `AntiHub-plugin/src/api/kiro_client.js`