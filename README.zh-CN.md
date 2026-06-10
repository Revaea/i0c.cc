## 项目简介

i0c.cc WebUI 是一个基于 Next.js 16 的管理面板，用于通过 GitHub OAuth 登录后在线编辑 `redirects.json`。保存修改时会调用 GitHub Contents API，对目标仓库的指定分支创建提交并保留历史记录。

**推荐：配合 [i0c.cc](https://github.com/Revaea/i0c.cc) 本体使用更好。**

该项目提供两种编辑方式：

- 可视化规则编辑（分组树 + 表单）
- JSON 编辑（右侧面板，可直接编辑原始 JSON）

## 快速开始

1. 复制示例环境变量：

	- macOS/Linux：
		```bash
		cp .env.example .env.local
		```
	- Windows PowerShell：
		```powershell
		Copy-Item .env.example .env.local
		```

2. 在 GitHub 创建 OAuth App，回调地址填写 `http(s)://<localhost:3000 或 你的域名>/api/auth/callback/github`，然后将 `Client ID`、`Client Secret` 写入 `.env.local` 的 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。如果是部署在 ▲ Vercel，将配置写到环境变量便好。

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

5. 安装依赖并启动开发服务器：

	```bash
	npm install
	npm run dev
	```

6. 打开 [http://localhost:3000](http://localhost:3000) 或 **你的域名**，使用拥有仓库写入权限的 GitHub 账号登录后即可编辑 `redirects.json`。

## 功能概览

- GitHub OAuth 登录，自动获取访问令牌并保存在会话中。
- 可视化编辑 `redirects.json`：分组树管理 + 规则表单编辑。
- JSON 编辑器：行号、当前行高亮、JSON 语法校验（格式错误提示）。
- 表单行为对齐 Schema（规范来源：[https://raw.githubusercontent.com/Revaea/i0c.cc/main/redirects.schema.json](https://raw.githubusercontent.com/Revaea/i0c.cc/main/redirects.schema.json)）。
- 支持撤销/重做，便于快速回退编辑。
- 保存时调用 GitHub Contents API，创建带提交说明的 commit。
- 展示最近的提交历史并可跳转到 GitHub 查看详情。

## 注意事项

- OAuth 应用需要 `repo` 权限才能写入私有仓库。
- 若目标仓库为私有，请确认登录账号具备相应写权限。
- 生产环境部署时务必将 `.env.local` 中的凭据配置到对应平台的环境变量管理中。
