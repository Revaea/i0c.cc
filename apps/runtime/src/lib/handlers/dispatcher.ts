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

interface ProxyRaceCandidate {
  base: string;
  matchKind: AnalyticsLinkMatchKind;
  rule: NormalizedRule;
  targetUrl: string;
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

async function raceProxyCandidates(
  request: Request,
  runtime: ResolvedRuntime,
  candidates: ProxyRaceCandidate[]
): Promise<DispatchedRoute> {
  const controllers = candidates.map(() => new AbortController());
  const tasks = candidates.map((candidate, candidateIndex) => {
    const controller = controllers[candidateIndex];
    const abortFromRequest = () => controller.abort(request.signal.reason);
    if (request.signal.aborted) {
      abortFromRequest();
    } else {
      request.signal.addEventListener("abort", abortFromRequest, { once: true });
    }
    const requestClone = new Request(request.clone(), {
      signal: controller.signal
    });
    return (async () => {
      try {
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
          candidateIndex,
          match: {
            response,
            rule: candidate.rule,
            routePath: candidate.base,
            matchKind: candidate.matchKind
          }
        };
      } finally {
        request.signal.removeEventListener("abort", abortFromRequest);
      }
    })();
  });

  const winner = await Promise.any(tasks);
  controllers.forEach((controller, candidateIndex) => {
    if (candidateIndex !== winner.candidateIndex) {
      controller.abort();
    }
  });
  void Promise.allSettled(tasks).then(async (results) => {
    await Promise.all(results.map(async (result, candidateIndex) => {
      if (candidateIndex !== winner.candidateIndex && result.status === "fulfilled") {
        await discardProxyResponse(result.value.match.response);
      }
    }));
  });
  return winner.match;
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
        try {
          const match = await raceProxyCandidates(request, runtime, candidates);
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
