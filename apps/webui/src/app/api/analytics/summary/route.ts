import { type NextRequest, NextResponse } from "next/server";

import {
  createWebUiAuthorizationErrorResponse,
  getWebUiReadRequestAuthorization,
} from "@/auth/authorization";
import { getAnalyticsOverview, isAnalyticsConfigured } from "@/lib/analytics/queries";
import {
  analyticsRanges,
  type AnalyticsQueryScope,
  type AnalyticsRange,
} from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(request: Request): AnalyticsRange | null {
  const value = new URL(request.url).searchParams.get("range") ?? "30d";
  return analyticsRanges.find((range) => range === value) ?? null;
}

function parseScope(request: Request, range: AnalyticsRange): AnalyticsQueryScope {
  return {
    range,
    entryDomain: new URL(request.url).searchParams.get("entryDomain") ?? "all",
  };
}

export async function GET(request: NextRequest) {
  const authorization = await getWebUiReadRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  const range = parseRange(request);
  if (!range) {
    return NextResponse.json({ error: "Range must be one of 1d, 7d, 30d, or 90d" }, { status: 400 });
  }

  if (!isAnalyticsConfigured()) {
    return NextResponse.json({ error: "Analytics is not configured" }, { status: 503 });
  }

  try {
    return NextResponse.json(await getAnalyticsOverview(parseScope(request, range)));
  } catch (error) {
    console.error("Failed to query analytics summary", error);
    return NextResponse.json({ error: "Analytics summary could not be loaded" }, { status: 500 });
  }
}
