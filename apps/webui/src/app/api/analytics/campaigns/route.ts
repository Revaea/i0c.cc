import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createWebUiAuthorizationErrorResponse,
  getWebUiManagementRequestAuthorization,
} from "@/auth/authorization";
import {
  AnalyticsAttributionError,
  createCampaignUrl
} from "@/lib/analytics/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  url: z.string().min(1).max(2048),
  analyticsId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  campaignId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  expiresInDays: z.number().int().min(1).max(365).default(30)
}).strict();

export async function POST(request: Request) {
  const authorization = await getWebUiManagementRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign link request" }, { status: 400 });
  }

  try {
    const url = await createCampaignUrl({
      url: parsed.data.url,
      analyticsId: parsed.data.analyticsId,
      campaignId: parsed.data.campaignId,
      lifetimeSeconds: parsed.data.expiresInDays * 24 * 60 * 60
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof AnalyticsAttributionError) {
      const status = error.kind === "configuration" ? 503 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("Failed to create analytics campaign URL", error);
    return NextResponse.json({ error: "Campaign URL could not be created" }, { status: 500 });
  }
}
