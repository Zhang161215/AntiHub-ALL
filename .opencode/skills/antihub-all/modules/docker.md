---
name: plugin-compose-volume-override
description: 在 AntiHub-ALL 用 Docker Compose 调试 AntiHub-plugin 时，建议用 docker-compose.override.yml 给 plugin 服务加 volume 挂载本地代码并重启容器；排查启动失败要先核对 compose 里 plugin 的完整 service 配置（image/build、command、ports、env、depends_on）。Use when: 需要本地热改 plugin、或排查 plugin 容器启动/配置问题时。
usage:
  created_at: 2026-01-31T04:27:20.649Z
  last_updated: 2026-01-31T04:27:20.649Z
  access_count: 1
  last_accessed: 2026-02-04T00:44:38.171Z
---

## 本地开发挂载策略

优先用 `docker-compose.override.yml` 给 `plugin` 服务增加源码 volume 挂载（把宿主机的 `AntiHub-plugin/` 映射进容器工作目录），避免直接改主 `docker-compose.yml`。
改动后用 `docker compose up -d plugin` 重启生效；如果改了依赖/构建相关内容，用 `docker compose up -d --build plugin`。

## 排查 plugin 启动问题

先完整查看 `plugin` service 的配置：`build`/`image`、`command`/`entrypoint`、`environment`、`ports`、`volumes`、`depends_on`。
确认挂载路径与容器内工作目录一致，且不会把容器内 `node_modules` 误覆盖导致启动失败（必要时把 `node_modules` 留在容器里或单独 volume）。

## Related files

- `docker-compose.yml`
- `docker-compose.core.yml`
- `docker-compose.override.yml`
- `deploy.sh`
- `AntiHub-plugin/package.json`