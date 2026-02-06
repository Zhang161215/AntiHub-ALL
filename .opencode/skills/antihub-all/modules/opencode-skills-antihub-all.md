---
name: antihub-kiro-integration
description: Kiro 账号管理和模型映射功能。包含账号导入、用量统计、模型映射管理。修改 Kiro 相关功能时使用。
usage:
  created_at: 2026-02-06T02:53:32.334Z
  last_updated: 2026-02-06T02:53:32.334Z
  access_count: 16
  last_accessed: 2026-02-06T12:03:08.419Z
---

## 项目架构

- AntiHub/ — Next.js 前端 (TypeScript)
- AntiHub-Backend/ — FastAPI 后端 (Python)
- AntiHub-plugin/ — Node.js 插件服务
- 新服务统一对接到 AntiHub-Backend，不再在 AntiHub-plugin 新增对接

## Kiro 账号管理

- 账号管理页面: `AntiHub/app/dashboard/accounts/page.tsx`
- 添加账号向导: `AntiHub/components/add-account-drawer.tsx`
- 默认 activeTab 设为 'kiro'
- Enterprise/IdC 账号需要 refreshToken, clientId, clientSecret, region

## 模型映射系统

- 映射服务: `AntiHub-plugin/src/services/kiro_model_mapping.service.js`
- 数据库表: `kiro_model_mappings`
- 默认映射存储在 `KIRO_MODEL_MAP` (kiro.service.js)
- Kiro 真实模型: claude-sonnet-4.5, claude-opus-4.5, claude-haiku-4.5

## API 路由

- 获取映射: GET `/api/kiro/model-mappings`
- 更新映射: PUT `/api/kiro/model-mappings`
- 删除映射: DELETE `/api/kiro/model-mappings/:frontendModel`
- 重置默认: POST `/api/kiro/model-mappings/reset`
- 后端透传到插件的 `/v1/kiro/*` 路由

## 用量统计页面

- 文件: `AntiHub/app/dashboard/analytics/page.tsx`
- 显示: 消费统计、可用模型、模型映射管理
- API 函数在 `AntiHub/lib/api.ts`: getKiroModels(), getKiroModelMappings()

## 权限要求

- Kiro 功能需要用户 beta=1 权限
- 数据库设置: UPDATE users SET beta=1 WHERE username='admin'

## 已知问题

- Kiro Edit 工具参数名映射问题: old_str→old_string, new_str→new_string, file_path→filePath
- 流式传输时参数名可能被分割到不同 chunk 导致正则替换失败
- 建议在工具调用完成时对完整参数做替换

## Related files

- `AntiHub/app/dashboard/accounts/page.tsx`
- `AntiHub/app/dashboard/analytics/page.tsx`
- `AntiHub/components/add-account-drawer.tsx`
- `AntiHub/lib/api.ts`
- `AntiHub-Backend/app/routers/kiro_routes.py`
- `AntiHub-Backend/app/services/kiro_service.py`
- `AntiHub-plugin/src/server/kiro_routes.js`
- `AntiHub-plugin/src/api/kiro_client.js`
- `AntiHub-plugin/src/services/kiro.service.js`
- `AntiHub-plugin/src/services/kiro_model_mapping.service.js`