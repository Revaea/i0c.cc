import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createWebUiAuthorizationErrorResponse,
  getWebUiManagementRequestAuthorization,
  getWebUiReadRequestAuthorization,
} from "@/auth/authorization";
import {
  invalidateDataConfigCache,
  parseDataConfig,
  readRawDataConfigDocument,
} from "@/lib/configuration/data-config";
import { updateAppDataConfig } from "@/lib/github";

const updateSchema = z.object({
  content: z.string().min(2, { message: "Config content is required" }),
  sha: z.string().min(2, { message: "Missing config version (sha)" }),
  message: z.string().min(1).max(200).optional(),
});

export async function GET(request: NextRequest) {
  const authorization = await getWebUiReadRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  const accessToken = authorization.isReadOnly
    ? undefined
    : authorization.accessToken;

  try {
    const document = await readRawDataConfigDocument(accessToken);
    return NextResponse.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authorization = await getWebUiManagementRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    parseDataConfig(parsed.data.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid instance config";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await updateAppDataConfig(
      authorization.accessToken,
      parsed.data,
    );
    invalidateDataConfigCache();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
