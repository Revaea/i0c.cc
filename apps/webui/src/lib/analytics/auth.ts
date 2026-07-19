import "server-only";

import { getToken } from "next-auth/jwt";

export async function isAnalyticsRequestAuthenticated(request: Request): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    return false;
  }

  try {
    const token = await getToken({ req: request as unknown as never, secret });
    const accessToken = (token as { accessToken?: unknown } | null)?.accessToken;
    return typeof accessToken === "string" && accessToken.length > 0;
  } catch {
    return false;
  }
}
