import type { RuntimePlatformManifest } from "@i0c/plugin-api"

export const externalRuntimeManifest = {
  id: "@example/runtime-external",
  name: "External Runtime fixture",
  version: "0.1.0",
  apiVersion: 1,
  kind: "runtime-platform",
  slot: "runtime-platform",
  hosts: ["runtime"],
  capabilities: ["request-adapter"],
  description: {
    summary: {
      en: "Fixture runtime platform used to verify external adapter installation.",
      "zh-CN": "用于验证外部适配器安装能力的 Runtime 平台测试插件。",
    },
  },
  config: { version: 1 },
  secrets: {},
  provider: "external-edge",
} as const satisfies RuntimePlatformManifest
