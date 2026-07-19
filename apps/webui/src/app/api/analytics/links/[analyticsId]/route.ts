import { NextResponse } from "next/server";

import { isAnalyticsRequestAuthenticated } from "@/lib/analytics/auth";
import { getAnalyticsDetail, isAnalyticsConfigured } from "@/lib/analytics/queries";
import { analyticsRanges, type AnalyticsRange } from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ analyticsId: string }>;
}

function parseRange(request: Request): AnalyticsRange | null {
  const value = new URL(request.url).searchParams.get("range") ?? "30d";
  return analyticsRanges.find((range) => range === value) ?? null;
}

function isValidAnalyticsId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

export async function GET(request: Request, context: RouteContext) {
  if (!await isAnalyticsRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = parseRange(request);
  if (!range) {
    return NextResponse.json({ error: "Range must be one of 7d, 30d, or 90d" }, { status: 400 });
  }

  const { analyticsId } = await context.params;
  if (!isValidAnalyticsId(analyticsId)) {
    return NextResponse.json({ error: "Invalid analytics ID" }, { status: 400 });
  }

  if (!isAnalyticsConfigured()) {
    return NextResponse.json({ error: "Analytics is not configured" }, { status: 503 });
  }

  try {
    const detail = await getAnalyticsDetail(analyticsId, range);
    if (!detail) {
      return NextResponse.json({ error: "Analytics link was not found" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Failed to query analytics detail", error);
    return NextResponse.json({ error: "Analytics detail could not be loaded" }, { status: 500 });
  }
}
