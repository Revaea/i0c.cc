/**
 * @file dispatcher.ts
 * @description
 * [EN] Route response dispatcher.
 * Resolves compiled routes, coordinates proxy fallbacks and races, and returns match metadata
 * without owning request lifecycle or analytics finalization.
 *
 * [CN] 路由响应分发器。
 * 负责解析已编译路由、协调代理回退与竞速，并返回匹配元数据，
 * 不负责请求生命周期或分析事件收尾。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import {
  collectProxyRaceCandidates,
  resolveCompiledTarget
} from "./matcher";
import { respondUsingRule, shouldFallbackProxy } from "./response";
import type {
  AnalyticsLinkMatchKind,
  CompiledEntry,
  NormalizedRule,
  ResolvedRuntime
} from "./types";

interface DispatchRouteRequestOptions {
  request: Request;
  runtime: ResolvedRuntime;
  compiledList: CompiledEntry[];
  effectivePath: string;
  search: string;
  isStaticAssetPath: boolean;
}

interface DispatchedRoute {
  response: Response;
  rule: NormalizedRule;
  routePath: string;
  matchKind: AnalyticsLinkMatchKind;
}

export interface DispatchRouteResult {
  match: DispatchedRoute | null;
  hasProxyExhaustion: boolean;
}

async function discardProxyResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
  }
}

export async function dispatchRouteRequest({
  request,
  runtime,
  compiledList,
  effectivePath,
  search,
  isStaticAssetPath
}: DispatchRouteRequestOptions): Promise<DispatchRouteResult> {
  let hasProxyExhaustion = false;

  for (let index = 0; index < compiledList.length; index += 1) {
    const item = compiledList[index];
    const { rule, base } = item;
    if (!rule.target) {
      continue;
    }

    const resolved = resolveCompiledTarget(item, effectivePath, search);
    if (!resolved) {
      continue;
    }
    const { targetUrl, matchKind } = resolved;

    if (isStaticAssetPath && rule.type === "proxy") {
      const collected = collectProxyRaceCandidates(
        compiledList,
        index,
        effectivePath,
        search
      );
      if (!collected) {
        continue;
      }

      const { candidates, scanEnd } = collected;
      if (candidates.length > 1) {
        const tasks = candidates.map((candidate) => {
          const requestClone = request.clone() as Request;
          return (async () => {
            const response = await respondUsingRule(
              requestClone,
              candidate.rule,
              candidate.targetUrl,
              runtime,
              candidate.base
            );
            if (shouldFallbackProxy(response)) {
              await discardProxyResponse(response);
              throw new Error(`proxy ${response.status}`);
            }
            return {
              response,
              rule: candidate.rule,
              routePath: candidate.base,
              matchKind: candidate.matchKind
            };
          })();
        });

        try {
          const match = await Promise.any(tasks);
          return { match, hasProxyExhaustion };
        } catch {
          hasProxyExhaustion = true;
          index = scanEnd - 1;
          continue;
        }
      }

      index = scanEnd - 1;
    }

    const requestClone = request.clone() as Request;
    const response = await respondUsingRule(requestClone, rule, targetUrl, runtime, base);

    if (rule.type === "proxy" && shouldFallbackProxy(response)) {
      await discardProxyResponse(response);
      hasProxyExhaustion = true;
      continue;
    }

    return {
      match: {
        response,
        rule,
        routePath: base,
        matchKind
      },
      hasProxyExhaustion
    };
  }

  return { match: null, hasProxyExhaustion };
}
