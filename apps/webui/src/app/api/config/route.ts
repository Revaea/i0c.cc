import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createWebUiAuthorizationErrorResponse,
  getWebUiManagementRequestAuthorization,
  getWebUiReadRequestAuthorization,
} from "@/auth/authorization";
import { getRedirectConfig, listRedirectHistory, updateRedirectConfig } from "@/lib/github";

export async function GET(request: Request) {
  const authorization = await getWebUiReadRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  const sourceUrl = new URL(request.url).searchParams.get("sourceUrl") ?? undefined;
  if (authorization.isReadOnly && sourceUrl) {
    return NextResponse.json(
      { error: "Custom config URLs are unavailable in public read-only mode" },
      { status: 400 },
    );
  }

  const accessToken = authorization.isReadOnly
    ? undefined
    : authorization.accessToken;

  try {
    const [config, history] = await Promise.all([
      getRedirectConfig(accessToken, { sourceUrl }),
      authorization.isReadOnly
        ? Promise.resolve([])
        : listRedirectHistory(accessToken, 10, { sourceUrl }),
    ]);

    return NextResponse.json({ config, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const updateSchema = z.object({
  content: z.string().min(2, { message: "Config content is required" }),
  sha: z.string().min(2, { message: "Missing config version (sha)" }),
  message: z.string().min(1).max(200).optional(),
  sourceUrl: z.string().min(8).max(2048).optional()
});

export async function PUT(request: Request) {
  const authorization = await getWebUiManagementRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await updateRedirectConfig(authorization.accessToken, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
