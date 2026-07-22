# Runtime Host

`@i0c/runtime-host` 将平台无关的 i0c 请求处理器与一个编译期 Runtime 平台插件组合起来。它会补充当前插件 ID 和已安装平台 Manifest，但不会导入任何具体平台。

外部适配器实现 `RuntimePlatformPlugin` 并提供 Manifest 与 Runtime 入口后，即可在不修改 `apps/runtime` 源码的情况下完成装配。

## 检查

```bash
pnpm --filter @i0c/runtime-host check
pnpm --filter @i0c/runtime-host test
```

采用 Apache-2.0 许可证，详见仓库根目录的 `LICENSE`。
