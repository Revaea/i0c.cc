/**
 * @file response.ts
 * @description
 * [EN] Response Factory.
 * Constructs the final HTTP responses for the client. Contains specific logic for handling
 * Redirects (3xx status codes) and Proxies (request forwarding), including security headers.
 *
 * [CN] 响应工厂。
 * 为客户端构造最终的 HTTP 响应。包含处理重定向（3xx 状态码）和代理（请求转发）的具体逻辑，
 * 包括设置安全响应头。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import { DEFAULT_STATUS, HSTS_HEADER_VALUE } from "./constants";
import { NormalizedRule, ResolvedRuntime } from "./types";

const SENSITIVE_FORWARD_HEADERS = [
  "cookie",
  "authorization",
  "proxy-authorization",
  "x-forwarded-for",
  "x-real-ip"
] as const;
const MAX_PROXY_REDIRECTS = 5;

function isIPv4(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateIPv4(hostname: string): boolean {
  if (!isIPv4(hostname)) return false;
  const parts = hostname.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;

  // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
  if (a === 0 || a === 10 || a === 127) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

function normalizeHostname(hostname: string): string {
  const host = hostname.toLowerCase();
  return host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
}

function isPrivateIPv6(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host.includes(":")) return false;
  if (host === "::" || host === "::1" || host.startsWith("::ffff:")) return true;

  const firstHextet = Number.parseInt(host.split(":", 1)[0], 16);
  return (
    (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) ||
    (firstHextet >= 0xfe80 && firstHextet <= 0xfebf)
  );
}

function isLikelyLocalhost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (host === "localhost" || host === "127.0.0.1") return true;
  // block common internal hostnames
  if (host.endsWith(".localhost")) return true;
  return isPrivateIPv6(host);
}

function assertSafeProxyUrl(url: URL): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported proxy protocol: ${url.protocol}`);
  }
  if (isLikelyLocalhost(url.hostname) || isPrivateIPv4(url.hostname)) {
    throw new Error(`Blocked proxy target host: ${url.hostname}`);
  }
}

export function shouldFallbackProxy(response: Response): boolean {
  return response.status === 404 || response.status >= 500;
}

export async function respondUsingRule(
  request: Request, 
  rule: NormalizedRule, 
  targetUrl: string, 
  runtime: ResolvedRuntime,
  basePath?: string
): Promise<Response> {
  if (rule.type === "proxy") {
    return proxyRequest(request, targetUrl, runtime, basePath);
  }

  return redirectResponse(targetUrl, rule.status);
}

async function proxyRequest(
  request: Request,
  targetUrl: string,
  runtime: ResolvedRuntime,
  basePath: string = ""
): Promise<Response> {
  const originalHost = request.headers.get("host") ?? "";
  const originalUrl = new URL(request.url);
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

  while (true) {
    const headers = new Headers(request.headers);
    const currentUrlObj = new URL(currentTarget);

    try {
      assertSafeProxyUrl(currentUrlObj);
    } catch (e) {
      console.error("Unsafe proxy redirect target:", e);
      return new Response("Bad Gateway: Upstream redirect blocked.", { status: 502 });
    }

    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");

    for (const name of SENSITIVE_FORWARD_HEADERS) {
      headers.delete(name);
    }

    // Re-assert forwarding headers after stripping user-controlled versions.
    headers.set("x-forwarded-host", request.headers.get("host") ?? "");
    headers.set("x-forwarded-proto", "https");

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
      redirect: "manual"
    });

    try {
      lastResponse = await runtime.fetchImpl(forwarded);
    } catch (e) {
      console.error(`Proxy fetch failed for ${currentTarget}:`, e);
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
        return new Response("Bad Gateway: Unsafe upstream redirect.", { status: 502 });
      }

      if (redirectCount >= MAX_PROXY_REDIRECTS) {
        break;
      }

      const nextUrl = nextUrlObj.toString();

      if (status === 301 || status === 302 || status === 303) {
        effectiveMethod = "GET";
      }

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
        const rewritten = `https://${originalHost}${locUrl.pathname}${locUrl.search}`;
        finalLocation = rewritten !== originalUrl.href ? rewritten : locUrl.toString();
      } else {
        finalLocation = locUrl.toString();
      }
    } catch {
    }

    if (basePath && basePath !== "/" && finalLocation.startsWith("/") && !finalLocation.startsWith("//")) {
      finalLocation = `${basePath}${finalLocation}`;
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
