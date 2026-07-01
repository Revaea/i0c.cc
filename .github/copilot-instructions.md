在项目中，需要遵循规范。

当前仓库是 pnpm workspace monorepo：
- `apps/runtime`：边缘重定向运行时，覆盖 Cloudflare Workers、Vercel Edge Functions、Netlify Edge Functions。
- `apps/webui`：Next.js 管理面板，用于编辑 `redirects.json`。
- 仓库根目录只做 workspace 总览和统一脚本入口，不应当按单一前端应用部署。
- 优先使用根目录脚本，例如 `pnpm runtime:build`、`pnpm webui:build`、`pnpm webui:lint`。

组件文件（.tsx / .vue）：PascalCase
普通脚本文件（.ts / .js）：camelCase 或 kebab-case，建议统一选一种
文件夹：kebab-case
如果项目已经有了自己的命名规律，优先按照本来的规则命名，这个需要视情况而定

缩进：2 空格
引号：双引号
分号：不使用
尾随逗号：保留
大括号风格：K&R

导入顺序（注意每组之间空一行）：
1. Node 内置模块
2. 第三方依赖
3. Alias 路径
4. 相对路径
5. CSS / 样式文件

变量 / 函数：camelCase
类型 / 接口 / 类 / 组件名：PascalCase
环境变量：SCREAMING_SNAKE_CASE
CSS 类名：kebab-case
布尔变量：is / has / can / should 开头

关于TypeScript：
- 禁止使用 any，优先使用 unknown、泛型或精确类型。
- 禁止使用 @ts-ignore，优先使用 @ts-expect-error，并注明原因。
- 不使用非空断言（!），除非能够证明其安全性。
- 优先使用 interface 定义对象结构，type 用于联合类型、交叉类型或类型别名。（如果团队有此约定）
- 开启 strict 模式。

关于注释：
- 非必要情况下，不添加注释。
- 注释仅用于说明设计意图、复杂逻辑、特殊约束或实现原因。
- 不要添加描述代码表面行为的冗余注释。
- 注释应面向开发者，不面向最终用户。
- 注释中不得出现 AI 身份、自我描述、对话式表达、提示词或生成过程相关内容。

关于文件编码默认使用 UTF-8

换行、缩进等基础编辑行为遵循仓库根目录的 `.editorconfig`，不要做无关的全仓换行重写。

本机使用的是uv管理的python
本机使用pnpm管理包

此条规则为最高优先级：如果项目已经有了自己的规范规律，优先按照本来的规则进行，这个需要视情况而定
