## 项目简介

i0c.cc WebUI 是一个基于 Next.js 16 的管理面板，用于通过 GitHub OAuth 登录后在线编辑 `redirects.json`。保存修改时会调用 GitHub Contents API，对目标仓库的指定分支创建提交并保留历史记录。

**推荐：配合 [i0c.cc](https://github.com/Revaea/i0c.cc) 本体使用更好。**

该项目提供两种编辑方式：

- 可视化规则编辑（分组树 + 表单）
- JSON 编辑（右侧面板，可直接编辑原始 JSON）

## 快速开始

1. 在 `apps/webui` 目录下复制示例环境变量：

   - macOS/Linux：
     ```bash
     cp .env.example .env.local
     ```
   - Windows PowerShell：
     ```powershell
     Copy-Item .env.example .env.local
     ```

2. 在 GitHub 创建 OAuth App，回调地址填写 `http(s)://<localhost:3000 或 你的域名>/api/auth/callback/github`，然后将 `Client ID`、`Client Secret` 写入 `.env.local` 的 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。如果是部署在 ▲ Vercel，将配置写到环境变量便好。

   默认 OAuth scope 是 `read:user user:email public_repo`。如果目标仓库是私有仓库，请将 `GITHUB_OAUTH_SCOPE` 设置为 `read:user user:email repo`。

   必须明确选择服务端 WebUI 访问模式：

   ```dotenv
   # 任意 GitHub 账号均可登录；写入仓库仍需 GitHub 权限。
   WEBUI_ACCESS_MODE="authenticated"

   # 或将整个 WebUI 限制为指定 GitHub 数字用户 ID。
   # WEBUI_ACCESS_MODE="allowlist"
   # GITHUB_ALLOWED_USER_IDS="12345678,87654321"

   # 或允许任意 GitHub 用户登录后只读查看，同时让名单内用户保留管理权限。
   # WEBUI_ACCESS_MODE="public-readonly"
   # GITHUB_ALLOWED_USER_IDS="12345678,87654321"
   ```

   `WEBUI_ACCESS_MODE` 为必填项；只有 `allowlist` 模式要求填写
   `GITHUB_ALLOWED_USER_IDS`；该变量在 `public-readonly` 模式下选填。可以使用
   `gh api user --jq .id` 查询自己的数字 ID。这些变量只能配置在服务端，不能添加
   `NEXT_PUBLIC_` 前缀。`public-readonly` 为只读账号通过 GitHub 未认证 API 加载指定规则，
   因此目标仓库必须公开；任意 GitHub 用户登录后都可以查看规则和统计，名单内用户可以编辑配置、
   生成渠道链接并手动刷新统计。如果未配置名单，则任何人都不能管理。

3. 设置信息（`redirects.json` 默认为 `Revaea/i0c.cc` 的 `data` 分支，二维码域名默认为 `https://i0c.cc`，可根据需要修改以下变量）：

   ```dotenv
   GITHUB_REPO_OWNER="Revaea"
   GITHUB_REPO_NAME="i0c.cc"
   GITHUB_TARGET_BRANCH="data"
   GITHUB_CONFIG_PATH="redirects.json"

   NEXT_PUBLIC_DOMAIN="https://your-domain.com"
   ```

4. 生成 `NEXTAUTH_SECRET` 并写入 `.env.local`。生产环境将 `NEXTAUTH_URL` 设为 `https://你的域名`，开发环境可将 `NEXTAUTH_URL` 设为 `http://localhost:3000`。

   - 使用 OpenSSL：
     ```bash
     openssl rand -base64 32
     ```
   - 或使用 Node.js：
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

5. 在仓库根目录安装依赖并启动开发服务器：

   ```bash
   pnpm install
   pnpm webui:dev
   ```

6. 打开 [http://localhost:3000](http://localhost:3000) 或 **你的域名**，使用拥有仓库写入权限的 GitHub 账号登录后即可编辑 `redirects.json`。

## 短链接统计

统计功能使用标准 PostgreSQL，不依赖特定厂商的数据库 API。对于小型部署，可以使用 [Neon](https://neon.com/pricing) 等免费托管 PostgreSQL；[Supabase](https://supabase.com/pricing) 也可以直接使用同一套数据库结构和应用代码。如果服务商提供连接池地址，建议优先使用。

1. 创建 PostgreSQL 数据库，并在 WebUI 环境中配置：

   ```dotenv
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ANALYTICS_INGEST_SECRET="replace-with-a-separate-strong-secret"
   ANALYTICS_SOURCE_ID="i0c.cc"
   CRON_SECRET="replace-with-an-independent-strong-secret"
   ```

2. 在仓库根目录执行已提交的数据库迁移：

   ```bash
   pnpm analytics:migrate
   ```

3. 配置每个 Runtime 部署，将签名后的事件发送到 WebUI：

   ```dotenv
   ANALYTICS_ENDPOINT="https://u.i0c.cc/api/analytics/events"
   ANALYTICS_WRITE_KEY="the-same-value-as-ANALYTICS_INGEST_SECRET"
   ANALYTICS_SOURCE_ID="i0c.cc"
   ```

`ANALYTICS_SOURCE_ID` 必须是共享的基础域名，而不是平台名称。使用 `i0c.cc` 时，`i0c.cc`、`www.i0c.cc`、`api.i0c.cc`、`vc.i0c.cc`、`nf.i0c.cc` 可以分别统计，无需再维护一份域名列表。命名空间之外的域名会存为 `unknown`。

使用 GitHub 登录后，可以在 `/<locale>/analytics` 查看 1、7、30 和 90 天范围的统计。1 天趋势使用小时桶，更长范围使用天桶。入口域名筛选会一致作用于总数、趋势、路由、国家或地区、设备、平台、来源域名、渠道、内部来源和自动化分析。`/<locale>/analytics/automation` 会把已声明机器人、疑似自动化和未匹配 Runtime 请求的观测值与抽样估算值分开展示。

事件接收端兼容 V1，并严格校验 V2 的 link 与 Runtime 事件。过期、签名无效、正文过大、分类不一致或 source 错误的事件都会被拒绝。查询接口与渠道链接接口要求已经通过 WebUI 身份验证的会话。

对象形式的规则使用稳定的 `analyticsId`，因此只要保留该 ID，修改短链路径也不会切断后续统计历史。字符串简写规则使用确定性的兼容标识；将其转换为对象形式后会开始使用新的稳定标识。匹配事件全量采集；未匹配和系统 Runtime 事件按 10% 抽样，并同时显示观测值和估算值。

Runtime 会发送匹配流量对应的配置规则路径、入口域名、平台、结果、受控的流量与机器人分类、国家代码、来源域名和延迟，但不会发送 IP、完整 User-Agent、查询参数、目标地址、完整来源 URL 或原始未匹配路径。浏览器来源、显式签名渠道和验证后的内部短链接来源属于相互独立的维度。

需要生成渠道链接时，已登录的客户端可以调用 `POST /api/analytics/campaigns`，传入 Runtime 地址、统计 ID、渠道 ID 和 1–365 天有效期。返回的签名 `_i0c_via` 参数会绑定精确域名和归一化路径，并由 Runtime 在规则处理前删除。

数据库地址和签名密钥必须仅保存在服务端。Vercel 每天调用受保护的保留端点：原始事件、幂等收据和上游声明在 181 天后过期，小时与天级聚合继续保留。免费方案的额度和休眠策略可能变化，生产使用前请检查服务商的最新限制。

完整事件契约、归因行为、数据库迁移顺序、隐私限制、投递保证和验收场景详见 [统计架构文档](../../docs/analytics.zh-CN.md)。迁移属于明确的外部写入，WebUI 构建不会自动执行迁移。

## 部署

在 monorepo 中部署这个包时，Vercel 使用下面的设置：

| 设置 | 值 |
|------|----|
| Framework Preset | Next.js |
| Root Directory | `apps/webui` |
| Build Command | `pnpm build` |
| Output Directory | Next.js default |

将 [.env.example](.env.example) 中的环境变量配置到 Vercel。生产环境的 `NEXTAUTH_URL` 必须和部署域名一致，必须明确设置 `WEBUI_ACCESS_MODE`，并配置 `CRON_SECRET` 供每日保留请求使用；GitHub OAuth callback URL 必须是 `https://<你的域名>/api/auth/callback/github`。

## 功能概览

- 可选择任意已登录用户、数字用户 ID 白名单或带白名单管理员的 GitHub 全员只读模式。
- 可视化编辑 `redirects.json`：分组树管理 + 规则表单编辑。
- JSON 编辑器：行号、当前行高亮、JSON 语法校验（格式错误提示）。
- 表单行为对齐 Schema（规范来源：[https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json](https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json)）。
- 支持撤销/重做，便于快速回退编辑。
- 保存时调用 GitHub Contents API，创建带提交说明的 commit。
- 展示最近的提交历史并可跳转到 GitHub 查看详情。

## 注意事项

- OAuth 应用需要 `repo` 权限才能写入私有仓库。
- 若目标仓库为私有，请确认登录账号具备相应写权限。
- `public-readonly` 仅支持公开目标仓库，并受 GitHub 未认证 API 请求限额约束。
- 生产环境部署时务必将 `.env.local` 中的凭据配置到对应平台的环境变量管理中。
