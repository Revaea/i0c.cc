import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { getRedirectConfig, listRedirectHistory, updateRedirectConfig } from "@/lib/github";

async function requireAccessToken(request: Request): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // This should be configured for every environment.
    return null;
  }

  const token = await getToken({ req: request as unknown as never, secret });
  const accessToken = (token as { accessToken?: unknown } | null)?.accessToken;
  return typeof accessToken === "string" && accessToken.length > 0 ? accessToken : null;
}

export async function GET(request: Request) {
  const accessToken = await requireAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceUrl = new URL(request.url).searchParams.get("sourceUrl") ?? undefined;

  try {
    const [config, history] = await Promise.all([
      getRedirectConfig(accessToken, { sourceUrl }),
      listRedirectHistory(accessToken, 10, { sourceUrl })
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
  const accessToken = await requireAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await updateRedirectConfig(accessToken, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
