# @i0c/config

Runtime 与 WebUI 共用的版本化非敏感配置。

需要修改重定向数据源、Runtime 规范域名、robots 策略、统计命名空间与收集端地址、GitHub OAuth scope 或 WebUI 访问策略时，请编辑 [src/index.ts](src/index.ts)。配置只会在受影响的应用重新构建并部署后生效。

密钥和部署绑定仍保留在各应用的环境变量中。这个包不得写入凭据、数据库地址、签名密钥或认证密钥。

消费方会直接打包 TypeScript 源码，因此配置包的构建只校验源码，不生成需要提交的产物。

在仓库根目录运行配置包检查：

```bash
pnpm config:check
```

英文版本见 [README.md](README.md)。
