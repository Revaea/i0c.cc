# 内部插件架构

## 目的

i0c.cc 使用轻量的编译期插件架构，让平台和存储方案可以替换，同时避免把个人项目扩展成动态插件平台。

插件是构建时明确选择的普通 workspace 或包依赖。远程数据可以配置已经安装的插件，但不能下载或执行新的代码。

## 数据文档

`data` 分支是可编辑、非敏感的数据平面：

- `config.json` 存放版本化实例设置和按命名空间隔离的插件配置。
- `redirects.json` 存放重定向规则。

两份文档分别校验。Runtime 会分别缓存、合并进行中的重复刷新，并在刷新失败时保留最后一次有效值。WebUI 通过带版本号的仓库适配器读写同一组文档。

GitHub 仓库、分支、文档路径、OAuth scope 与安全回退值必须在读取远程数据前存在，因此这些启动配置仍保留在 `@i0c/config` 中，修改后需要重新构建。

## 稳定边界

`@i0c/plugin-contracts` 提供四个小接口：

| 边界 | 当前实现 | 可替换场景 |
|------|----------|------------|
| `RuntimeDataSource` | 带内存与平台缓存的 GitHub Raw JSON | 数据库、KV、D1、对象存储或其他 HTTP 数据源 |
| `VersionedDataRepository` | GitHub Contents API | 数据库支持的 WebUI 编辑或其他版本化控制面 |
| `RuntimePlatformAdapter` | Cloudflare、Vercel 与 Netlify 边缘适配器 | 其他兼容 fetch 的运行时 |
| `AnalyticsSink` | 签名后投递到 WebUI 收集端的 HTTP 实现 | 队列、日志管道或其他收集端 |

PostgreSQL 统计查询与迁移层继续由应用自身负责。只有真正实现第二种统计存储后才抽象它；提前设计通用数据库接口只会增加复杂度，无法证明兼容性。

## 配置与密钥

每个已安装插件在 `config.json` 中使用一个独立键：

```json
{
  "plugins": {
    "example-sink": {
      "enabled": true,
      "config": {
        "endpoint": "https://example.com/events"
      },
      "secrets": {
        "token": "EXAMPLE_SINK_TOKEN"
      }
    }
  }
}
```

`config` 只接受 JSON 安全的公开值。`secrets` 把插件内名称映射到部署环境变量名称；密钥值仍保存在平台绑定中，只能由受信任的 Runtime 代码解析。

注入的 `AnalyticsSink` 可以解析自己的密钥绑定，不依赖默认的 `ANALYTICS_WRITE_KEY`；只有内置的签名 HTTP Sink 必须配置该密钥。

## 添加内部插件

1. 新增只承担一个明确职责的 workspace 包。
2. 实现 `@i0c/plugin-contracts` 中对应的契约。
3. 只有插件需要公开设置时，才在 `config.json` 中增加经过校验的命名空间。
4. 密钥值保留在环境变量中，并在所属 `.env.example` 中写占位说明。
5. 在所属应用中显式注册包，不使用运行时包发现。
6. 添加所属边界的测试和按路径触发的 CI。

## 发布顺序与故障行为

1. 先合并并部署能够理解新配置版本的代码。
2. 新增或修改已经校验的 `data/config.json`。
3. 等待配置的缓存时间后，检查 Runtime 与 WebUI。
4. 验证完成后，再删除平台中已废弃的非敏感环境变量。

远程配置不可用或无效时，不会替换当前值。热实例继续使用最后一次有效缓存，冷实例使用仓库内置的安全默认值。管理员仍能在 WebUI 加载无效 `config.json` 的原文并修复。

## 不做的事情

- 不通过 `config.json` 动态加载代码。
- 不提供公开插件市场或插件安装界面。
- 不在 data 分支中建立共享密钥存储。
- 不要求同时部署所有 Runtime 适配器。
- 在第二种实现出现前，不抽象通用统计数据库适配器。
