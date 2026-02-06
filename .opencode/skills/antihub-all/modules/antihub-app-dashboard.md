---
name: kiro-model-mapping-management
description: Kiro 模型映射管理功能：前端模型名映射到 Kiro 真实模型名，支持增删改查和重置默认。映射存储在 kiro_model_mappings 表，带 60s 缓存。Use when: 需要修改 Kiro 模型映射、添加新模型支持、或调试模型名转换问题时。
usage:
  created_at: 2026-02-06T02:48:05.881Z
  last_updated: 2026-02-06T02:48:05.881Z
  access_count: 11
  last_accessed: 2026-02-06T06:15:50.106Z
---

## 模型映射架构

前端模型名（如 `claude-sonnet-4-5`）→ Kiro 真实模型名（如 `claude-sonnet-4.5`）

数据流：
- 前端 `lib/api.ts` → 后端 `kiro.py` → 插件 `kiro_routes.js` → `kiro_model_mapping.service.js`
- 映射存储在 PostgreSQL 表 `kiro_model_mappings`
- 服务层带 60s 内存缓存

## 默认模型映射

js
DEFAULT_MODEL_MAPPINGS = {
  'claude-sonnet-4-5': 'claude-sonnet-4.5',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4.5',
  'claude-sonnet-4-20250514': 'claude-sonnet-4',
  'claude-opus-4-5-20251101': 'claude-opus-4.5',
  'claude-haiku-4-5-20251001': 'claude-haiku-4.5'
}


## API 端点

- `GET /api/kiro/model-mappings` - 获取所有映射
- `POST /api/kiro/model-mappings` - 添加/更新映射 `{frontend_model, kiro_model}`
- `DELETE /api/kiro/model-mappings/{frontend_model}` - 删除映射
- `POST /api/kiro/model-mappings/reset` - 重置为默认

## 前端 UI 位置

用量统计页面 `analytics/page.tsx`：
- 可用模型卡片：显示 `kiroModels` 列表
- 模型映射卡片：显示映射关系，支持添加/删除/重置
- Kiro 真实模型名使用下拉选择框（硬编码选项）

## 已知限制

Kiro 没有公开 API 获取真实可用模型列表，当前显示的模型列表是系统硬编码的映射表，不是从 Kiro 服务器实时获取。

下拉选项硬编码在前端：`claude-sonnet-4.5`, `claude-sonnet-4`, `claude-opus-4.5`, `claude-haiku-4.5`

## UI 简化记录

账号管理和用量统计页面已简化为只显示 Kiro：
- `accounts/page.tsx:126` - `activeTab` 默认值改为 `'kiro'`
- `analytics/page.tsx:66` - `activeTab` 默认值改为 `'kiro'`
- 添加账号向导跳过平台选择，直接进入 Kiro 流程
- 下拉菜单只保留 Kiro 选项

## Related files

- `AntiHub/app/dashboard/analytics/page.tsx`
- `AntiHub/app/dashboard/accounts/page.tsx`
- `AntiHub/components/accounts/add-account-drawer.tsx`
- `AntiHub/lib/api.ts`
- `AntiHub-Backend/app/api/routes/kiro.py`
- `AntiHub-Backend/app/services/kiro_service.py`
- `AntiHub-plugin/src/server/kiro_routes.js`
- `AntiHub-plugin/src/services/kiro_model_mapping.service.js`
- `AntiHub-plugin/src/services/kiro.service.js`