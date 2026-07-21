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
| WebUI | [apps/webui](apps/webui) | 基于 Next.js 的管理面板，用于编辑 `redirects.json` 并查询短链接统计。 |
| 配置 | [packages/config](packages/config) | Runtime 与 WebUI 共用的版本化非敏感配置。 |

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
| Cloudflare Workers | `apps/runtime` | `pnpm build` | 由 `wrangler.toml` 决定 |
| Vercel | `apps/runtime` | `pnpm build:vc` | `.vercel/output` |
| Netlify | `apps/runtime` | `pnpm build:nf` | `dist` |

构建时必须使用完整的 monorepo 检出，确保 Runtime 可以导入共享 workspace 包。Vercel 需要保持开启 **Include source files outside of the Root Directory in the Build Step**。Runtime 的非敏感配置来自 [packages/config/src/index.ts](packages/config/src/index.ts)；启用统计投递时，每个平台只需要设置 `ANALYTICS_WRITE_KEY` 密钥。

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

需要修改重定向数据源、Runtime 规范域名、robots 策略、统计命名空间与收集端地址、GitHub OAuth scope 或 WebUI 访问策略时，请编辑 [packages/config/src/index.ts](packages/config/src/index.ts)。两个应用会在构建时读取 `@i0c/config`，因此修改配置后必须重新构建并部署受影响的应用。

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

分别构建两个项目：

```bash
pnpm runtime:build
pnpm webui:build
```

运行 Runtime 统计契约测试：

```bash
pnpm runtime:test
```

提交前运行完整本地验证：

```bash
pnpm check
```

## 重定向数据

Runtime 会读取 `redirects.json` 中的重定向规则，通常来自本仓库的 `data` 分支。Schema 位于：

```text
apps/runtime/redirects.schema.json
```

在 `redirects.json` 中使用下面的 schema 引用：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json",
  "Slots": {
    // ...
  }
}
```

用 schema 校验 `data` 分支的重定向数据：

```bash
pnpm data:validate
```

## 文档

- Runtime 文档：[apps/runtime/README.zh-CN.md](apps/runtime/README.zh-CN.md)
- WebUI 文档：[apps/webui/README.zh-CN.md](apps/webui/README.zh-CN.md)
- 统计架构与口径：[docs/analytics.zh-CN.md](docs/analytics.zh-CN.md)
- 英文总览：[README.md](README.md)

## 许可证

Apache-2.0，详见 [LICENSE](LICENSE)。
