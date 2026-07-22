import { type NextRequest, NextResponse } from "next/server";

import {
  createWebUiAuthorizationErrorResponse,
  getWebUiReadRequestAuthorization,
} from "@/auth/authorization";
import { getWebUiPluginStatusSnapshot } from "@/lib/plugins/status";

export async function GET(request: NextRequest) {
  const authorization = await getWebUiReadRequestAuthorization(request);
  if (authorization.status !== "authorized") {
    return createWebUiAuthorizationErrorResponse(authorization.status);
  }

  try {
    return NextResponse.json(await getWebUiPluginStatusSnapshot(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to resolve plugin status", error);
    return NextResponse.json(
      { error: "Plugin status is temporarily unavailable" },
      { status: 500 },
    );
  }
}
