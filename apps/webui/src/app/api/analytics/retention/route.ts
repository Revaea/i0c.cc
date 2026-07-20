import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/analytics/database";
import { pruneExpiredAnalyticsRows } from "@/lib/analytics/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }

  const supplied = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${cronSecret}`, "utf8");

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Analytics is not configured" }, { status: 503 });
  }

  try {
    return NextResponse.json(await pruneExpiredAnalyticsRows(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to prune expired analytics rows", error);
    return NextResponse.json(
      { error: "Analytics retention could not be completed" },
      { status: 500 },
    );
  }
}
