# i0c.cc

i0c.cc 的 monorepo，包含边缘重定向运行时和用于编辑重定向规则的 WebUI 管理面板。

## 项目

| 项目 | 路径 | 说明 |
|------|------|------|
| Runtime | [apps/runtime](apps/runtime) | 面向 Cloudflare Workers、Vercel Edge Functions、Netlify Edge Functions 的通用重定向运行时。 |
| WebUI | [apps/webui](apps/webui) | 基于 Next.js 的管理面板，用于可视化编辑并提交 `redirects.json`。 |

## 在线预览

- Runtime 主域名：https://api.i0c.cc
- Runtime Vercel 部署：https://vc.i0c.cc
- Runtime Netlify 部署：https://nf.i0c.cc

## 部署

这个仓库现在是 monorepo。部署时不要把仓库根目录当成一个单独应用，而是分别选择要部署的子项目目录。

### Runtime

从 [apps/runtime](apps/runtime) 部署重定向运行时。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/runtime)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Revaea/i0c.cc)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Revaea/i0c.cc)

平台要求填写项目或构建配置时，使用下面的值：

| 平台 | 项目根目录 | 构建命令 | 输出 |
|------|------------|----------|------|
| Cloudflare Workers | `apps/runtime` | `pnpm build` | 由 `wrangler.toml` 决定 |
| Vercel | `apps/runtime` | `pnpm build:vc` | `.vercel/output` |
| Netlify | `apps/runtime` | `pnpm build:nf` | `dist` |

部署完成后，如果你的 `redirects.json` 不使用默认位置，请设置 `REDIRECTS_CONFIG_URL`，或者设置仓库、分支、路径相关环境变量。

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

WebUI 需要 GitHub OAuth 和仓库访问相关环境变量，详见 [apps/webui/README.md](apps/webui/README.md)。

## 本地开发

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

## 文档

- Runtime 文档：[apps/runtime/README.zh-CN.md](apps/runtime/README.zh-CN.md)
- WebUI 文档：[apps/webui/README.zh-CN.md](apps/webui/README.zh-CN.md)
- 英文总览：[README.md](README.md)
