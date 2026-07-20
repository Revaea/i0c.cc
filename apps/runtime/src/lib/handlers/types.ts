/**
 * @file types.ts
 * @description
 * [EN] Type Definitions.
 * Defines all TypeScript interfaces, types, and shared data structures used throughout the library.
 * Centralizing types here prevents circular dependencies.
 *
 * [CN] 类型定义。
 * 定义库中使用的所有 TypeScript 接口、类型和共享数据结构。
 *在此处集中管理类型可防止循环依赖。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

export type RouteType = "prefix" | "exact" | "proxy";
export type AnalyticsProvider = "cloudflare" | "vercel" | "netlify" | "unknown";
export type AnalyticsRequestClass = "human" | "link_preview" | "crawler" | "monitor" | "asset" | "unknown";
export type AnalyticsEventKind = "link" | "runtime";
export type AnalyticsTrafficClass = "browser_like" | "declared_bot" | "suspected_automation" | "unknown";
export type AnalyticsBotCategory = "none" | "search" | "ai_crawler" | "social_preview" | "monitor" | "automation" | "security_probe" | "unknown";
export type AnalyticsBotConfidence = "none" | "low" | "medium" | "high";
export type AnalyticsResourceClass = "document" | "asset" | "api" | "other" | "unknown";
export type AnalyticsDeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";
export type AnalyticsProbeCategory = "none" | "wordpress" | "env_file" | "admin" | "vcs" | "path_traversal" | "scanner" | "other";
export type AnalyticsLinkMatchKind = "exact" | "parameterized" | "prefix" | "catch_all";
export type AnalyticsRuntimeMatchKind = "unmatched" | "system";
export type AnalyticsRuntimeOutcome = "not_found" | "proxy_exhausted" | "config_unavailable" | "internal_error";

export interface AnalyticsTrafficClassification {
  trafficClass: AnalyticsTrafficClass;
  botCategory: AnalyticsBotCategory;
  botConfidence: AnalyticsBotConfidence;
}

export interface AnalyticsUpstreamAttribution {
  upstreamEventId: string;
  upstreamAnalyticsId: string;
  upstreamEntryDomain: string;
  upstreamProvider: AnalyticsProvider;
}

export type RouteValue = string | RouteConfig;
export type RouteValueEntry = RouteValue | RouteValue[];

export interface RouteConfig {
  analyticsId?: string;
  type?: string;
  target?: string;
  to?: string;
  url?: string;
  appendPath?: boolean;
  status?: number | string;
  priority?: number | string;
}

export interface NormalizedRule {
  analyticsId?: string;
  type: RouteType;
  target: string;
  appendPath: boolean;
  status: number;
  priority: number;
}

export interface CompiledEntry {
  base: string;
  rule: NormalizedRule;
  regex: RegExp;
  names: string[];
  isParam: boolean;
  order: number;
}

export type SlotBranch = Record<string, unknown>;

export interface RedirectsConfig {
  Slots?: SlotBranch;
  slots?: SlotBranch;
  SLOT?: SlotBranch;
  [key: string]: unknown;
}

export interface MemoryCacheEntry {
  text: string;
  expiresAt: number;
}

export interface CacheLike {
  match(request: Request): Promise<Response | undefined | null>;
  put(request: Request, response: Response): Promise<void>;
}

export interface HandlerOptions {
  configUrl?: string;
  cache?: CacheLike;
  cacheTtlSeconds?: number;
  fetchImpl?: typeof fetch;
  fetchInit?: RequestInit;
  envBindings?: Record<string, unknown>;
  provider?: AnalyticsProvider;
  country?: string;
  waitUntil?(promise: Promise<unknown>): void;
  now?: () => number;
  random?: () => number;
}

export interface ResolvedRuntime {
  configUrl: string;
  cache?: CacheLike;
  cacheTtlSeconds: number;
  fetchImpl: typeof fetch;
  fetchInit?: RequestInit;
  envBindings?: Record<string, unknown>;
  provider: AnalyticsProvider;
  country?: string;
  waitUntil?: (promise: Promise<unknown>) => void;
  now: () => number;
  random: () => number;
}
