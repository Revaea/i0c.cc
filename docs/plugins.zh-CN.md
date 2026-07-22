# 编译期插件架构

## 范围

i0c.cc 使用轻量的静态注册插件架构，让重定向核心不直接绑定某个边缘平台、Git 传输方式、统计投递路径或统计数据库，同时避免把个人项目扩展成动态插件平台。

插件是构建时选定的 workspace 包。远程 `config.json` 可以配置或关闭已经安装的可选插件，但不能发现、下载、安装或执行新代码。

## 包结构

| 层级 | 包或目录 | 职责 |
|------|----------|------|
| 领域 | `@i0c/analytics-domain` | 平台无关的统计事件、时间范围、分类和 Store 结果类型 |
| 协议 | `@i0c/plugin-api` | Manifest、宿主与插槽类型、插件契约、健康检查、迁移、Feature Hook 与 WebUI 插槽 |
| 契约 | `@i0c/plugin-testkit` | Manifest、适配器、仓库、Sink、Store、迁移、Feature 与依赖边界测试 |
| 目录 | `@i0c/plugin-catalog` | 静态安装清单和按宿主执行的配置校验 |
| Git 数据 | `@i0c/plugin-github-data` | GitHub Raw Runtime Source 与 GitHub Contents WebUI Repository |
| Runtime | `@i0c/plugin-runtime-cloudflare`、`@i0c/plugin-runtime-vercel`、`@i0c/plugin-runtime-netlify` | 平台请求、环境、缓存、国家信息与后台任务适配 |
| Sink | `@i0c/plugin-analytics-sink-http` | 带签名、尽力而为的 HTTP 统计投递 |
| Store | `@i0c/plugin-analytics-store-postgres`、`@i0c/plugin-analytics-store-d1` | 统计写入、查询、重算、保留、健康检查和自有迁移 |
| Feature | `@i0c/plugin-feature-bot-classifier` | 通过受限 Feature 管线完成 Runtime 统计分类 |

应用是宿主：`apps/runtime` 装配 Runtime 插件，`apps/webui` 装配 Repository 与 Analytics Store 插件。插件可以依赖协议和领域包，但不得导入应用内部模块。

## 数据文档与启动边界

`data` 分支继续作为可编辑的非敏感数据平面：

- `config.json` 存放版本化实例设置和已安装插件声明。
- `redirects.json` 存放重定向规则。

Runtime 分别读取和缓存两个文档，合并并发刷新，使用 ETag，并在刷新失败时保留最后一次有效值。WebUI 通过版本化 Repository 契约分别读写这两个文件。

有些值必须在读取远程文档之前存在。GitHub 所有者、仓库、分支、路径、OAuth scope、初始 Raw URL 和平台适配器参数因此属于**启动配置**，不是远程插件配置。它们位于 `@i0c/config` 或平台入口，修改后需要重新构建。Git 与 Runtime Manifest 会明确拒绝在 `plugins.*.config` 中填写这些启动字段，避免出现“能通过校验，却无法初始化自身加载器”的假配置。

## Manifest 与配置模型

每个已安装插件都有 Manifest，包含唯一 ID、包版本、独立 Plugin API 版本、支持的宿主、类别、插槽、能力、配置版本与 Schema、Secret 声明，以及可选的健康检查或迁移能力。

远程声明格式如下：

```json
{
  "plugins": {
    "@i0c/analytics-sink-http": {
      "enabled": true,
      "version": 1,
      "config": {
        "maximumDeliveryAttempts": 2
      },
      "secrets": {
        "writeKey": "ANALYTICS_WRITE_KEY"
      }
    }
  }
}
```

- `config` 只存放 JSON 安全的公开值，并由所选插件自己的 Schema 校验。
- `secrets` 把插件内名称映射到环境变量或平台绑定名称；Secret 值不会进入 data 分支。
- 未安装插件、不兼容配置版本、未声明的 Secret 名称、不支持的宿主和单例插槽冲突都会被拒绝。
- Runtime 构建只选择一个平台适配器。共享文档可以同时声明其他受支持平台，但它们不会进入当前构建的装配结果。
- Git Runtime Source、Git WebUI Repository 与当前 Runtime 平台属于必需的启动能力；显式关闭会让对应宿主拒绝配置。
- HTTP Sink、机器人分类器和 Analytics Store 是可选能力；关闭后会分别移除投递、Feature 注册或统计存储。

第一阶段迁移中，缺少声明时会使用兼容默认值。发布显式声明后，`enabled`、插件配置和 Secret 映射会真实驱动工厂与 Feature 管线。

## Runtime Feature 与 WebUI 扩展

第一版 Runtime Feature API 只开放已经真实接入的 `onAnalyticsEvent` Hook。注册项具有确定顺序、有限超时和明确错误策略。非关键的统计、日志与自动化分类插件默认 fail-open，不能替换已经有效的重定向响应。匹配和响应变更 Hook 暂缓，因为插件不得修改核心路由语义。

首个 Feature 插件通过 `onAnalyticsEvent` 接管机器人与自动化分类。Runtime 测试还会注入一个故障 Feature，证明重定向行为不会因此中断。

WebUI 提供四个静态注册扩展插槽：

- `analytics.overview.cards`
- `analytics.detail.sections`
- `settings.plugins`
- `rule-editor.fields`

当前官方目录除宿主自带的插件状态面板外，暂未向这些插槽注册内容。它们是未来编译期 UI 扩展的真实渲染点，不是在线安装机制。插件状态文案只会在面板挂载时动态导入。

`GET /api/plugins/status` 展示已安装 Manifest、配置状态、能力、宿主可观测的 Secret 绑定、所选 Store 健康状态和缺失前提。端点要求 WebUI 读取权限、禁止响应缓存、用超时限制健康检查，并且不会暴露原始数据库错误或 Secret 值。

## Analytics Store 与迁移

`AnalyticsStore` 暴露领域操作，不暴露 SQL。PostgreSQL 与 D1 会运行同一套共享行为契约，覆盖幂等写入、流量与自动化查询、小时与天级聚合、入口域名筛选、原始事件重算、181 天原始事件保留、聚合保留、健康检查和能力声明。

- PostgreSQL 是当前部署使用的 Store，默认继续读取 `DATABASE_URL`。迁移位于 `plugins/store/postgres/migrations`。
- D1 是用于证明协议并非围绕 PostgreSQL 设计的第二实现。独立迁移位于 `plugins/store/d1/migrations`；选择 D1 的宿主必须先注入 D1 binding。

每个 Store 自己实现 `status`、`plan` 与 `apply` 迁移语义。构建、应用启动、健康检查和普通请求都不会自动执行迁移。Plugin CI 会使用隔离 PostgreSQL 服务执行真实共享契约；本地没有 `TEST_POSTGRES_URL` 时只跳过该集成测试。D1 通过基于 Node SQLite 的 D1 测试适配器运行同一行为契约。

## 检查与 CI

从仓库根目录串行运行：

```bash
pnpm plugins:check
pnpm runtime:check
pnpm runtime:test
pnpm runtime:build:cf
pnpm runtime:build:vc
pnpm runtime:build:nf
pnpm webui:test
pnpm webui:lint
pnpm webui:build
```

Plugin CI 检查类型、Manifest、契约、独立插件包、PostgreSQL 集成行为和导入或 Bundle 边界。Runtime CI 测试共享语义并分别构建三个平台。WebUI CI 覆盖测试、Lint 与构建。Config CI 校验核心配置和插件目录。每个工作流都按真实所有者路径和工作流自身文件触发。

## 新增官方插件

1. 新增一个职责单一的 workspace 包，并按需提供 `./manifest`、`./config`、`./runtime`、`./collector` 或 `./webui` 入口。
2. 在插件包内定义 Manifest、配置 Schema、默认值、Secret 声明、能力和工厂。
3. 实现窄化的 Plugin API 契约，不导入 `apps/runtime` 或 `apps/webui`。
4. 在对应静态目录投影中注册 Manifest。
5. 复用 Plugin Testkit 契约，并添加实现特有测试。
6. 新增表面时同步扩展依赖边界检查和路径触发 CI。
7. 先合并并部署理解新声明的代码，再发布对应的 `data/config.json` 修改。

## 故障与发布顺序

无效远程配置不会替换有效缓存。热实例保留最后一次有效配置，冷实例使用仓库内置的兼容默认值。WebUI 会向已认证管理员保留无效文档原文，以便修复。

发布顺序：

1. 合并代码与 Schema 修改。
2. 部署受影响宿主。
3. 发布已校验的 `data/config.json` 与 `data/redirects.json` 修改。
4. 等待配置缓存时间，然后验证 WebUI 与选中的 Runtime 平台。
5. 完成生产验证后，才删除失效的非敏感 Dashboard 变量。

## 非目标

- 不在运行时加载 npm 包或 URL 插件。
- 不提供公开插件市场或在线安装、卸载 UI。
- 不实现不受信任插件沙箱。
- 不在 data 分支保存 Secret 值。
- 不要求同时部署全部 Runtime 适配器。
- 不设计超出已实现、已通过契约测试能力的万能数据库或平台抽象。
