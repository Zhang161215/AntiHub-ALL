---
name: antihub-all-conventions
description: Development conventions and patterns for AntiHub-ALL project
---

# Project Knowledge

> Project knowledge index. Read this first to understand available domain knowledge, then read relevant module SKILLs as needed.

### antihub-monorepo-dev-flow
AntiHub Docker Compose 单仓栈的结构与本地开发/验证流程：优先用 docker compose 启动；Web/Backend/Plugin/Go 各自有独立命令；新第三方服务对接统一进 AntiHub-Backend（CodexCLI 已对接），不要再往 AntiHub-plugin 新增对接。Use when: 需要启动/调试整套栈、选择 compose 文件、或新增服务对接位置时。
- **Location**: `.opencode/skills/antihub-all/SKILL.md`

### kiro-service-client
Kiro 对接位于 AntiHub-plugin：路由在 kiro_routes.js，请求封装在 kiro_client.js，业务逻辑在 kiro.service.js；排查返回截断/上下文限制时重点看 truncation/config、token 计算日志，以及 hasConversationState/conversationState 的传递与落点。Use when: 需要调试或修改 Kiro 请求、超时、鉴权、上下文续聊与输出处理行为时。
- **Location**: `modules/antihub-plugin.md`

### antihub-all-conventions
AntiHub-ALL 单仓栈的结构/启动/验证与服务对接边界：优先用 Docker Compose 跑全栈；Web/Backend/Plugin/Go 各自独立开发命令；新增第三方服务统一对接到 AntiHub-Backend，AntiHub-plugin 不再新增对接。Use when: 需要启动调试整栈、选择 compose 文件、或定位/修改服务对接代码时。
- **Location**: `.opencode/skills/antihub-all/SKILL.md`

### plugin-compose-volume-override
在 AntiHub-ALL 用 Docker Compose 调试 AntiHub-plugin 时，建议用 docker-compose.override.yml 给 plugin 服务加 volume 挂载本地代码并重启容器；排查启动失败要先核对 compose 里 plugin 的完整 service 配置（image/build、command、ports、env、depends_on）。Use when: 需要本地热改 plugin、或排查 plugin 容器启动/配置问题时。
- **Location**: `modules/docker.md`

### kiro-edit-tool-param-mapping
Kiro Edit 工具参数名映射问题及解决方案：上游返回 old_str/new_str/file_path，Claude Code 期望 old_string/new_string/filePath。流式传输时参数名可能被分割到不同 chunk，需用智能边界缓冲策略处理。Use when: 调试 Kiro 工具调用参数不匹配、流式响应参数截断问题时。
- **Location**: `modules/antihub-plugin-src.md`

### kiro-model-mapping-management
Kiro 模型映射管理功能：前端模型名映射到 Kiro 真实模型名，支持增删改查和重置默认。映射存储在 kiro_model_mappings 表，带 60s 缓存。Use when: 需要修改 Kiro 模型映射、添加新模型支持、或调试模型名转换问题时。
- **Location**: `modules/antihub-app-dashboard.md`

### antihub-kiro-integration
Kiro 账号管理和模型映射功能。包含账号导入、用量统计、模型映射管理。修改 Kiro 相关功能时使用。
- **Location**: `modules/opencode-skills-antihub-all.md`
