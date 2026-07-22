# i0c.cc

i0c.cc 是一个个人使用、由 Git 驱动的边缘重定向实验项目。重定向规则在 Git 中版本化，同一套核心可以通过不同边缘平台适配器运行，并提供自用的 WebUI 与可选统计功能。

## 项目定位

这个仓库面向个人使用和工程实验，不准备成为托管短链接服务或企业级重定向平台。

- 按部署环境选择所需的 Runtime 适配器；Cloudflare、Vercel 与 Netlify 是可选方案，不要求同时运行。
- 以 Git 中的 `redirects.json` 作为可审查、可回退的规则来源。
- WebUI 与统计功能服务于个人工作流；后续路线优先保证清晰和可靠，不追求与商业产品功能对齐。

## 项目

| 项目 | 路径 | 说明 |
|------|------|------|
| Runtime | [apps/runtime](apps/runtime) | 可按平台选择的重定向运行时，支持 Cloudflare Workers、Vercel Edge Functions 与 Netlify Edge Functions。 |
| WebUI | [apps/webui](apps/webui) | 基于 Next.js 的管理面板，用于编辑 `config.json` 与 `redirects.json`、查看插件状态并查询统计。 |
| 配置 | [packages/config](packages/config) | 两个应用共用的启动默认值、两份数据文档 Schema 与校验。 |
| 插件 API | [packages/plugin-api](packages/plugin-api) | 官方插件使用的稳定编译期 Manifest、生命周期契约与类型化扩展边界。 |
| 插件 Testkit | [packages/plugin-testkit](packages/plugin-testkit) | 共享插件契约与依赖边界检查。 |
| 插件目录 | [packages/plugin-catalog](packages/plugin-catalog) | 按宿主静态注册插件并校验插件配置。 |
| 官方插件 | [plugins](plugins) | Git 数据、三个 Runtime 适配器、HTTP 统计投递、PostgreSQL 与 D1 Store，以及机器人分类。 |

## 在线预览

- Runtime Cloudflare 域名：https://i0c.cc、https://www.i0c.cc、https://api.i0c.cc
- Runtime Vercel 部署：https://vc.i0c.cc
- Runtime Netlify 部署：https://nf.i0c.cc
- WebUI：https://u.i0c.cc

## 部署

这个仓库现在是 monorepo。部署时不要把仓库根目录当成一个单独应用，而是分别选择要部署的子项目目录。

### Runtime

从 [apps/runtime](apps/runtime) 部署重定向运行时。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/runtime)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Revaea/i0c.cc)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Revaea/i0c.cc)

如果平台检测到多个项目，请选择 `apps/runtime`。

平台要求填写项目或构建配置时，使用下面的值：

| 平台 | 项目根目录 | 构建命令 | 输出 |
|------|------------|----------|------|
| Cloudflare Workers | `apps/runtime` | `pnpm build:cf` | `dist/platforms/cloudflare.js` |
| Vercel | `apps/runtime` | `pnpm build:vc` | `.vercel/output` |
| Netlify | `apps/runtime` | `pnpm build:nf` | `dist` |

构建时必须使用完整的 monorepo 检出，确保 Runtime 可以导入共享 workspace 包。Vercel 需要保持开启 **Include source files outside of the Root Directory in the Build Step**。Runtime 的实例配置与重定向规则会从 `data` 分支读取；启用统计投递时，每个平台只需要设置 `ANALYTICS_WRITE_KEY` 密钥。

### WebUI

从 [apps/webui](apps/webui) 部署管理面板。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/webui)

Vercel 使用下面的设置：

| 设置 | 值 |
|------|----|
| Framework Preset | Next.js |
| Root Directory | `apps/webui` |
| Build Command | `pnpm build` |
| Output Directory | Next.js default |

Vercel 需要保持开启 **Include source files outside of the Root Directory in the Build Step**，让 WebUI 构建能够包含共享 workspace 包。WebUI 环境只保留 OAuth 与部署绑定、数据库访问和密钥，详见 [apps/webui/README.zh-CN.md](apps/webui/README.zh-CN.md)。

## 应用配置

`data` 分支包含两份可独立编辑的文档：

- `config.json` 存放非敏感实例配置，包括 Runtime 规范域名、缓存时间、robots 策略、统计命名空间与收集端地址、WebUI 访问策略，以及按命名空间隔离的插件配置。
- `redirects.json` 存放重定向规则。

Runtime 与 WebUI 会远程读取这两份文档，缓存最后一次有效值，并在无需重新构建应用的情况下获取更新。WebUI 可以编辑两份文件；即使 `config.json` 写坏，管理员仍能看到原文并修复，而应用消费者会继续使用最后一次有效值或仓库内置的安全默认值。

[packages/config](packages/config) 负责 schema、校验、安全默认值以及 `data` 分支的启动地址。只有迁移数据源本身时，才需要在代码中修改启动仓库、分支、路径或 GitHub OAuth scope；这类改动仍需要重新构建。

原有非敏感环境变量不再作为覆盖值或回退值读取。平台后台遗留的旧值会被忽略，确认新部署正常后即可删除。密钥和与部署绑定的值继续保留在各应用的环境变量示例中。

## 本地开发

先启用 Corepack，让 `pnpm` 使用 `package.json` 中声明的版本：

```bash
corepack enable
```

在仓库根目录安装依赖：

```bash
pnpm install
```

运行 runtime：

```bash
pnpm runtime:dev:cf
```

运行 WebUI：

```bash
pnpm webui:dev
```

分别构建所需 Runtime 适配器与 WebUI：

```bash
pnpm runtime:build:cf
pnpm runtime:build:vc
pnpm runtime:build:nf
pnpm webui:build
```

运行插件、Runtime 与 WebUI 测试：

```bash
pnpm plugins:check
pnpm runtime:check
pnpm runtime:test
pnpm webui:test
```

提交前运行完整本地验证：

```bash
pnpm check
```

## Data 分支

Runtime 会从本仓库的 `data` 分支读取 `config.json` 与 `redirects.json`。两份 schema 位于：

```text
packages/config/config.schema.json
packages/config/redirects.schema.json
```

两份文件分别通过 `$schema` 声明自己的 schema。使用下面的命令校验本地 `origin/data` Git 引用中的两份数据：

```bash
pnpm data:validate
```

## 文档

- Runtime 文档：[apps/runtime/README.zh-CN.md](apps/runtime/README.zh-CN.md)
- WebUI 文档：[apps/webui/README.zh-CN.md](apps/webui/README.zh-CN.md)
- 统计架构与口径：[docs/analytics.zh-CN.md](docs/analytics.zh-CN.md)
- 内部插件架构：[docs/plugins.zh-CN.md](docs/plugins.zh-CN.md)
- 英文总览：[README.md](README.md)

## 许可证

Apache-2.0，详见 [LICENSE](LICENSE)。
