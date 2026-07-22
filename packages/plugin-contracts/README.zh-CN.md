# 插件契约

`@i0c/plugin-contracts` 只存放内部适配器共用的少量稳定接口。

- `RuntimeDataSource` 负责加载实例配置和重定向规则。
- `VersionedDataRepository` 负责读写可编辑、带版本号的数据文档。
- `AnalyticsSink` 负责投递统计事件，避免请求处理流程绑定单一采集端。
- `RuntimePlatformAdapter` 负责把平台请求上下文转换到共享 Runtime 处理器。

该包只定义编译期契约。插件仍通过明确的 workspace 依赖接入，不提供动态代码加载或公开插件市场。
