/**
 * @file analytics-classification.ts
 * @description
 * [EN] Privacy-safe request classification for analytics events.
 * Derives bounded traffic, resource, device, and probe categories without exporting raw paths or user agents.
 *
 * [CN] 面向统计事件的隐私安全请求分类。
 * 在不上传原始路径或 User-Agent 的前提下生成受控的流量、资源、设备与探测类别。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import type {
  AnalyticsDeviceType,
  AnalyticsProbeCategory,
  AnalyticsResourceClass,
  AnalyticsTrafficClassification
} from "./types";

const SEARCH_BOT_PATTERN = /(googlebot|bingbot|duckduckbot|baiduspider|yandexbot|yahoo! slurp|applebot)/i;
const AI_CRAWLER_PATTERN = /(gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexitybot|bytespider|google-extended|ccbot|cohere-ai)/i;
const SOCIAL_PREVIEW_PATTERN = /(facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|skypeuripreview|iframely|embedly|pinterestbot)/i;
const MONITOR_PATTERN = /(uptimerobot|pingdom|statuscake|better\s?uptime|healthchecks|checkly|datadog synthetics|new relic synthetics|site24x7|zabbix|nagios|synthetic monitor)/i;
const SECURITY_SCANNER_PATTERN = /(nuclei|nikto|sqlmap|masscan|zgrab|acunetix|nessus|openvas|wpscan|dirbuster|gobuster)/i;
const AUTOMATION_PATTERN = /(headlesschrome|phantomjs|playwright|puppeteer|selenium|curl\/|wget\/|python-requests|python\/|okhttp|libwww-perl|apache-httpclient|go-http-client)/i;
const GENERIC_BOT_PATTERN = /(bot\b|crawler|spider|scraper|scanner)/i;
const TABLET_PATTERN = /(ipad|tablet|kindle|silk|playbook|android(?!.*mobile))/i;
const MOBILE_PATTERN = /(mobile|iphone|ipod|android)/i;
const DESKTOP_PATTERN = /(windows nt|macintosh|x11|cros|linux x86_64)/i;
const ASSET_DESTINATIONS = new Set(["audio", "font", "image", "manifest", "script", "style", "track", "video"]);

export function classifyAnalyticsProbe(pathname: string): AnalyticsProbeCategory {
  const path = pathname.toLowerCase();

  if (/(?:^|\/)\.env(?:[./]|$)/.test(path)) {
    return "env_file";
  }
  if (/(?:^|\/)(?:\.git|\.hg|\.svn)(?:\/|$)/.test(path)) {
    return "vcs";
  }
  if (/(?:^|\/)\.\.(?:\/|$)|%2e%2e|%252e/i.test(path)) {
    return "path_traversal";
  }
  if (/(?:^|\/)(?:wp-admin|wp-content|wp-includes)(?:\/|$)|(?:^|\/)wp-login\.php$/.test(path)) {
    return "wordpress";
  }
  if (/(?:^|\/)(?:admin|administrator|phpmyadmin|adminer|manager|console)(?:\/|$)|(?:^|\/)(?:login|signin)\.php$/.test(path)) {
    return "admin";
  }
  if (/(?:^|\/)(?:xmlrpc\.php|cgi-bin|server-status|actuator|vendor\/phpunit|HNAP1)(?:\/|$)/i.test(path)) {
    return "scanner";
  }
  if (/(?:^|\/)(?:config|configuration|database|backup|dump|shell|webshell)(?:\.[a-z0-9._-]+)?$|\.(?:bak|old|orig|sql|sqlite|swp|tar|tgz|zip)$/.test(path)) {
    return "other";
  }

  return "none";
}

export function classifyAnalyticsTraffic(
  request: Request,
  probeCategory: AnalyticsProbeCategory
): AnalyticsTrafficClassification {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (SEARCH_BOT_PATTERN.test(userAgent)) {
    return { trafficClass: "declared_bot", botCategory: "search", botConfidence: "high" };
  }
  if (AI_CRAWLER_PATTERN.test(userAgent)) {
    return { trafficClass: "declared_bot", botCategory: "ai_crawler", botConfidence: "high" };
  }
  if (SOCIAL_PREVIEW_PATTERN.test(userAgent)) {
    return { trafficClass: "declared_bot", botCategory: "social_preview", botConfidence: "high" };
  }
  if (MONITOR_PATTERN.test(userAgent)) {
    return { trafficClass: "declared_bot", botCategory: "monitor", botConfidence: "high" };
  }
  if (SECURITY_SCANNER_PATTERN.test(userAgent)) {
    return { trafficClass: "suspected_automation", botCategory: "security_probe", botConfidence: "high" };
  }
  if (AUTOMATION_PATTERN.test(userAgent)) {
    return { trafficClass: "suspected_automation", botCategory: "automation", botConfidence: "medium" };
  }
  if (GENERIC_BOT_PATTERN.test(userAgent)) {
    return { trafficClass: "suspected_automation", botCategory: "unknown", botConfidence: "medium" };
  }
  if (probeCategory !== "none") {
    return { trafficClass: "suspected_automation", botCategory: "security_probe", botConfidence: "medium" };
  }

  const method = request.method.toUpperCase();
  const fetchMode = request.headers.get("sec-fetch-mode");
  const fetchDestination = request.headers.get("sec-fetch-dest");
  const accept = request.headers.get("accept") ?? "";
  if (
    method === "GET" &&
    (fetchMode === "navigate" || fetchDestination === "document" || accept.includes("text/html"))
  ) {
    return { trafficClass: "browser_like", botCategory: "none", botConfidence: "none" };
  }

  return { trafficClass: "unknown", botCategory: "none", botConfidence: "none" };
}

export function classifyAnalyticsResource(request: Request, pathname: string): AnalyticsResourceClass {
  const fetchDestination = request.headers.get("sec-fetch-dest")?.toLowerCase() ?? "";
  const fetchMode = request.headers.get("sec-fetch-mode")?.toLowerCase() ?? "";
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";

  if (
    /(?:^|\/)(_next|_nuxt)(?:\/|$)/.test(pathname) ||
    /(?:^|\/)(assets|static|images|img|fonts)(?:\/|$)/i.test(pathname) ||
    /\.(?:js|mjs|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot)$/i.test(pathname) ||
    ASSET_DESTINATIONS.has(fetchDestination)
  ) {
    return "asset";
  }

  if (
    fetchDestination === "document" ||
    fetchDestination === "iframe" ||
    fetchMode === "navigate" ||
    accept.includes("text/html")
  ) {
    return "document";
  }

  if (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    accept.includes("application/json") ||
    request.headers.get("content-type")?.toLowerCase().includes("application/json")
  ) {
    return "api";
  }

  if (fetchDestination || !["GET", "HEAD"].includes(request.method.toUpperCase())) {
    return "other";
  }

  return "unknown";
}

export function classifyAnalyticsDevice(
  request: Request,
  traffic: AnalyticsTrafficClassification
): AnalyticsDeviceType {
  if (traffic.trafficClass === "declared_bot" || traffic.trafficClass === "suspected_automation") {
    return "bot";
  }

  const clientHint = request.headers.get("sec-ch-ua-mobile")?.trim();
  if (clientHint === "?1") {
    return "mobile";
  }
  if (clientHint === "?0") {
    return "desktop";
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (TABLET_PATTERN.test(userAgent)) {
    return "tablet";
  }
  if (MOBILE_PATTERN.test(userAgent)) {
    return "mobile";
  }
  if (DESKTOP_PATTERN.test(userAgent)) {
    return "desktop";
  }

  return "unknown";
}
