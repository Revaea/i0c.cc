/**
 * @file response.ts
 * @description
 * [EN] Response Factory.
 * Constructs the final HTTP responses for the client. Contains specific logic for handling
 * Redirects (3xx status codes) and Proxies (request forwarding), including security headers
 * and proxy candidate failure classification.
 *
 * [CN] 响应工厂。
 * 为客户端构造最终的 HTTP 响应。包含处理重定向（3xx 状态码）和代理（请求转发）的具体逻辑，
 * 包括设置安全响应头以及区分代理候选的失败原因。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import { DEFAULT_STATUS, HSTS_HEADER_VALUE } from "./constants";
import { NormalizedRule, ResolvedRuntime } from "./types";

const SENSITIVE_FORWARD_HEADERS = [
  "cookie",
  "authorization",
  "client-ip",
  "fastly-client-ip",
  "fly-client-ip",
  "forwarded",
  "forwarded-for",
  "proxy-authorization",
  "true-client-ip",
  "x-client-ip",
  "x-cluster-client-ip",
  "x-envoy-external-address",
  "x-real-ip"
] as const;
const SENSITIVE_FORWARD_HEADER_PREFIXES = [
  "cf-",
  "x-forwarded-",
  "x-nf-",
  "x-vercel-"
] as const;
const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
] as const;
const REQUEST_BODY_HEADERS = [
  "content-encoding",
  "content-language",
  "content-length",
  "content-location",
  "content-type"
] as const;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9a-z-]+$/i;
const MAX_PROXY_REDIRECTS = 5;

async function discardResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
  }
}

function isIPv4(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isNonPublicIPv4(hostname: string): boolean {
  if (!isIPv4(hostname)) return false;
  const parts = hostname.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 192 && b === 88 && c === 99) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return a >= 224;
}

function normalizeHostname(hostname: string): string {
  const host = hostname.toLowerCase();
  return host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
}

function isNonPublicIPv6(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host.includes(":")) return false;
  if (
    host.startsWith("::")
    || host.startsWith("64:ff9b:")
    || host.startsWith("100:")
    || host.startsWith("2001:db8:")
    || host.startsWith("2002:")
  ) {
    return true;
  }

  const firstHextet = Number.parseInt(host.split(":", 1)[0], 16);
  return (
    (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) ||
    (firstHextet >= 0xfe80 && firstHextet <= 0xfeff) ||
    (firstHextet >= 0xff00 && firstHextet <= 0xffff)
  );
}

function isNonPublicProxyHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".localhost")) return true;
  return isNonPublicIPv4(host) || isNonPublicIPv6(host);
}

function assertSafeProxyUrl(url: URL): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported proxy protocol: ${url.protocol}`);
  }
  if (isNonPublicProxyHost(url.hostname)) {
    throw new Error(`Blocked proxy target host: ${url.hostname}`);
  }
}

function shouldSwitchRedirectToGet(status: number, method: string): boolean {
  return (
    ((status === 301 || status === 302) && method === "POST")
    || (status === 303 && method !== "GET" && method !== "HEAD")
  );
}

function prependProxyBasePath(pathname: string, basePath: string): string {
  if (!basePath || basePath === "/") {
    return pathname;
  }

  const prefix = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return pathname === "/" ? `${prefix}/` : `${prefix}${pathname}`;
}

export type ProxyFailureReason = "not_found" | "unavailable";

export function classifyProxyFailure(response: Response): ProxyFailureReason | null {
  if (response.status === 404) {
    return "not_found";
  }
  if (response.status >= 500) {
    return "unavailable";
  }
  return null;
}

export async function respondUsingRule<CfHostMetadata, Cf>(
  request: Request<CfHostMetadata, Cf>,
  rule: NormalizedRule, 
  targetUrl: string, 
  runtime: ResolvedRuntime,
  basePath?: string,
  signal?: AbortSignal
): Promise<Response> {
  if (rule.type === "proxy") {
    return proxyRequest(request, targetUrl, runtime, basePath, signal);
  }

  return redirectResponse(targetUrl, rule.status);
}

async function proxyRequest<CfHostMetadata, Cf>(
  request: Request<CfHostMetadata, Cf>,
  targetUrl: string,
  runtime: ResolvedRuntime,
  basePath: string = "",
  signal: AbortSignal = request.signal
): Promise<Response> {
  const originalUrl = new URL(request.url);
  const originalHost = originalUrl.host;
  const targetUrlObj = new URL(targetUrl);
  try {
    assertSafeProxyUrl(targetUrlObj);
  } catch (e) {
    console.error("Unsafe proxy target:", e);
    return new Response("Bad Request: Unsafe proxy target.", { status: 400 });
  }

  let currentTarget = targetUrl;
  let redirectCount = 0;
  let lastResponse: Response | null = null;

  let bodyBuffer: ArrayBuffer | undefined;
  const originalMethod = request.method.toUpperCase();
  if (originalMethod !== "GET" && originalMethod !== "HEAD" && request.body) {
    bodyBuffer = await request.arrayBuffer();
  }

  let effectiveMethod = originalMethod;
  let shouldDropBodyHeaders = false;

  while (true) {
    const headers = new Headers(request.headers);
    const currentUrlObj = new URL(currentTarget);

    try {
      assertSafeProxyUrl(currentUrlObj);
    } catch (e) {
      console.error("Unsafe proxy redirect target:", e);
      return new Response("Bad Gateway: Upstream redirect blocked.", { status: 502 });
    }

    const connectionHeaders = headers.get("connection")
      ?.split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => HEADER_NAME_PATTERN.test(name)) ?? [];

    headers.delete("host");
    for (const name of SENSITIVE_FORWARD_HEADERS) {
      headers.delete(name);
    }
    for (const name of HOP_BY_HOP_HEADERS) {
      headers.delete(name);
    }
    for (const name of connectionHeaders) {
      headers.delete(name);
    }
    for (const name of [...headers.keys()]) {
      if (SENSITIVE_FORWARD_HEADER_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        headers.delete(name);
      }
    }
    if (shouldDropBodyHeaders) {
      for (const name of REQUEST_BODY_HEADERS) {
        headers.delete(name);
      }
    }

    // Re-assert forwarding headers after stripping user-controlled versions.
    headers.set("x-forwarded-host", originalHost);
    headers.set("x-forwarded-proto", originalUrl.protocol.slice(0, -1));

    headers.set("origin", currentUrlObj.origin);
    headers.set("referer", currentTarget);

    let forwardBody: BodyInit | null = null;
    if (effectiveMethod !== "GET" && effectiveMethod !== "HEAD" && bodyBuffer) {
      forwardBody = bodyBuffer;
    }

    const forwarded = new Request(currentTarget, {
      method: effectiveMethod,
      headers,
      body: forwardBody,
      redirect: "manual",
      signal
    });

    try {
      lastResponse = await runtime.fetchImpl(forwarded);
    } catch (e) {
      if (!signal.aborted) {
        console.error(`Proxy fetch failed for ${currentTarget}:`, e);
      }
      return new Response("Bad Gateway: Upstream fetch failed.", { status: 502 });
    }

    const status = lastResponse.status;
    if (status >= 300 && status < 400) {
      const location = lastResponse.headers.get("Location");
      if (!location) break;

      let nextUrlObj: URL;
      try {
        nextUrlObj = new URL(location, currentUrlObj);
        assertSafeProxyUrl(nextUrlObj);
      } catch (e) {
        console.error("Blocked unsafe upstream redirect:", e);
        await discardResponseBody(lastResponse);
        return new Response("Bad Gateway: Unsafe upstream redirect.", { status: 502 });
      }

      if (redirectCount >= MAX_PROXY_REDIRECTS) {
        break;
      }

      const nextUrl = nextUrlObj.toString();

      if (shouldSwitchRedirectToGet(status, effectiveMethod)) {
        effectiveMethod = "GET";
        shouldDropBodyHeaders = true;
      }

      await discardResponseBody(lastResponse);
      currentTarget = nextUrl;
      redirectCount += 1;
      continue;
    }

    break;
  }

  if (!lastResponse) {
    return new Response("Gateway Timeout", { status: 504 });
  }

  const responseHeaders = new Headers(lastResponse.headers);

  responseHeaders.set("x-upstream-status", String(lastResponse.status));
  responseHeaders.set("x-upstream-location", lastResponse.headers.get("Location") ?? "");
  responseHeaders.set("x-proxy-redirects-followed", String(redirectCount));

  responseHeaders.delete("content-security-policy");
  responseHeaders.delete("content-security-policy-report-only");
  responseHeaders.delete("x-frame-options");
  responseHeaders.set("Strict-Transport-Security", HSTS_HEADER_VALUE);

  const setCookie = responseHeaders.get("set-cookie");
  if (setCookie) {
    const fixedCookie = setCookie.replace(/;\s*domain=[^;]+/ig, "");
    responseHeaders.set("set-cookie", fixedCookie);
  }

  const location = responseHeaders.get("Location");
  if (location) {
    let finalLocation = location;

    try {
      const locUrl = new URL(location, currentTarget);
      if (locUrl.origin === targetUrlObj.origin && originalHost) {
        const rewrittenUrl = new URL(originalUrl.origin);
        rewrittenUrl.pathname = prependProxyBasePath(locUrl.pathname, basePath);
        rewrittenUrl.search = locUrl.search;
        rewrittenUrl.hash = locUrl.hash;
        const rewritten = rewrittenUrl.toString();
        finalLocation = rewritten !== originalUrl.href ? rewritten : locUrl.toString();
      } else {
        finalLocation = locUrl.toString();
      }
    } catch {
    }

    responseHeaders.set("Location", finalLocation);
  }

  const contentType = responseHeaders.get("content-type") || "";
  const shouldRewriteHtml = basePath && basePath !== "/" && contentType.includes("text/html");

  if (!shouldRewriteHtml) {
    return new Response(lastResponse.body, {
      status: lastResponse.status,
      headers: responseHeaders
    });
  }

  const html = await lastResponse.text();
  const prefix = basePath || "";
  const rewrittenHtml = html.replace(/(href|src|action)="\/((?!\/|#|\.\/|\.\.\/)[^"]*)"/g, (_, attr, pathPart) => {
    return `${attr}="${prefix}/${pathPart}"`;
  }).replace(/<base\s+href="\/"\s*>/gi, `<base href="${prefix}/">`);

  responseHeaders.delete("content-length");

  return new Response(rewrittenHtml, {
    status: lastResponse.status,
    headers: responseHeaders
  });
}

function redirectResponse(location: string, status: number): Response {
  return new Response(null, {
    status: status || DEFAULT_STATUS,
    headers: {
      Location: location,
      "Strict-Transport-Security": HSTS_HEADER_VALUE
    }
  });
}
