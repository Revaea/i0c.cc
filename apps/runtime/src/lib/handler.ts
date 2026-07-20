/**
 * @file handler.ts
 * @description
 * [EN] Core Logic Entry Point.
 * This module acts as the controller that coordinates config loading,
 * route matching (regex/prefix), and response handling. It is platform-agnostic.
 *
 * [CN] 核心逻辑入口。
 * 该模块作为控制器，负责协调配置加载、路由匹配（正则/前缀）以及响应处理。
 * 它与具体部署平台（Cloudflare/Vercel）解耦，通用性强。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import {
  ANALYTICS_ATTRIBUTION_QUERY_PARAM,
  clearAttributionCookie,
  finalizeMatchedAnalytics,
  finalizeRuntimeAnalytics,
  prepareAnalyticsRequest
} from "@handlers/analytics";
import { HTTPS_REDIRECT_STATUS } from "@handlers/constants";
import { dispatchRouteRequest } from "@handlers/dispatcher";
import { serveFavicon } from "@handlers/favicon-serve";
import { loadConfig, resolveRuntimeOptions } from "@handlers/loader";
import {
  flattenSlots,
  getCompiledList,
  getSlotSource
} from "@handlers/matcher";
import { generateRobots, generateSitemapXml, isRobotsAllowed } from "@handlers/seo";
import { notFoundPageHtml } from "@handlers/templates";
import type { AnalyticsRequestContext } from "@handlers/analytics";
import type { HandlerOptions, RouteValueEntry } from "@handlers/types";
import { inferEffectivePath, isLikelyStaticAssetPath, normalisePath, safeDecode } from "@handlers/utils";

export async function handleRedirectRequest(request: Request, options: HandlerOptions = {}): Promise<Response> {
  const runtime = resolveRuntimeOptions(options);
  const startedAt = runtime.now();
  let analytics: AnalyticsRequestContext | undefined;
  let effectivePath = "/";

  try {
    const initialUrl = new URL(request.url);

    if (initialUrl.protocol !== "https:") {
      const containsAttributionToken = initialUrl.searchParams.has(ANALYTICS_ATTRIBUTION_QUERY_PARAM);
      const destination = `https://${initialUrl.host}${initialUrl.pathname}${initialUrl.search}`;
      return createCanonicalRedirect(destination, containsAttributionToken);
    }

    analytics = await prepareAnalyticsRequest(request, runtime);
    if (analytics.cleanupResponse) {
      return analytics.cleanupResponse;
    }

    const url = analytics.sanitizedUrl;
    const path = normalisePath(url.pathname);
    effectivePath = safeDecode(path);

    if (path === "/favicon.ico") {
      return clearAttributionCookie(serveFavicon(), analytics.hasAttributionCookie);
    }

    const redirectsConfig = await loadConfig(runtime);
    const slotSource = getSlotSource(redirectsConfig);

    if (!slotSource) {
      console.warn("[Handler] No slots configured.");
      const response = new Response("503 No Slots configured", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
      return finalizeRuntimeAnalytics({
        request,
        response,
        outcome: "config_unavailable",
        effectivePath,
        startedAt,
        runtime,
        analytics
      });
    }

    if (path === "/robots.txt" || path === "/sitemap.xml") {
      const rawRules: Record<string, RouteValueEntry> = {};
      flattenSlots(slotSource, rawRules);
      const origin = url.origin;

      if (path === "/robots.txt") {
        const robots = generateRobots(origin, runtime.envBindings);
        const response = new Response(robots, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }
        });
        return clearAttributionCookie(response, analytics.hasAttributionCookie);
      }

      if (!isRobotsAllowed(runtime.envBindings)) {
        const response = new Response("Sitemap disabled", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" }
        });
        return clearAttributionCookie(response, analytics.hasAttributionCookie);
      }

      const sitemap = generateSitemapXml(origin, rawRules);
      const response = new Response(sitemap, {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
      });
      return clearAttributionCookie(response, analytics.hasAttributionCookie);
    }

    const compiledList = getCompiledList(slotSource);
    const decodedPath = safeDecode(path);

    effectivePath = inferEffectivePath(decodedPath, request.headers, compiledList);
    const isStaticAssetPath = isLikelyStaticAssetPath(effectivePath);
    const dispatch = await dispatchRouteRequest({
      request,
      runtime,
      compiledList,
      effectivePath,
      search: url.search,
      isStaticAssetPath
    });

    if (dispatch.match) {
      return await finalizeMatchedAnalytics({
        request,
        response: dispatch.match.response,
        rule: dispatch.match.rule,
        routePath: dispatch.match.routePath,
        matchKind: dispatch.match.matchKind,
        effectivePath,
        startedAt,
        runtime,
        analytics
      });
    }

    const response = new Response(notFoundPageHtml, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });
    return finalizeRuntimeAnalytics({
      request,
      response,
      outcome: dispatch.hasProxyExhaustion ? "proxy_exhausted" : "not_found",
      effectivePath,
      startedAt,
      runtime,
      analytics
    });
  } catch (error) {
    console.error("[Handler Critical Error]", error);
    const response = new Response("Internal Server Error", { status: 500 });
    return analytics
      ? finalizeRuntimeAnalytics({
        request,
        response,
        outcome: "internal_error",
        effectivePath,
        startedAt,
        runtime,
        analytics
      })
      : response;
  }
}

function createCanonicalRedirect(destination: string, containsAttributionToken: boolean): Response {
  if (!containsAttributionToken) {
    return Response.redirect(destination, HTTPS_REDIRECT_STATUS);
  }

  return new Response(null, {
    status: HTTPS_REDIRECT_STATUS,
    headers: {
      "Cache-Control": "private, no-store",
      Location: destination,
      "Referrer-Policy": "no-referrer"
    }
  });
}

export { resolveConfigUrlFromBindings, DEFAULT_CONFIG_URL } from "@handlers/config";
export type { RedirectsConfig, RouteConfig, HandlerOptions } from "@handlers/types";
