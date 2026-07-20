import "server-only";

import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth/next";

import {
  isWebUiPublicReadOnly,
  isWebUiTokenAuthorized,
} from "./access-policy";
import { authOptions } from "./config";

export type WebUiAuthorizationDenial = "unauthenticated" | "forbidden";

type WebUiAuthorizationDenied =
  | { status: "unauthenticated" }
  | { status: "forbidden" };

type WebUiReadSessionAuthorization =
  | WebUiAuthorizationDenied
  | { status: "authorized"; isReadOnly: boolean };

type WebUiManagementSessionAuthorization =
  | WebUiAuthorizationDenied
  | { status: "authorized" };

type WebUiReadRequestAuthorization =
  | WebUiAuthorizationDenied
  | {
      status: "authorized";
      isReadOnly: true;
    }
  | {
      status: "authorized";
      isReadOnly: false;
      accessToken: string;
    };

type WebUiManagementRequestAuthorization =
  | WebUiAuthorizationDenied
  | {
      status: "authorized";
      accessToken: string;
    };

async function getAuthenticatedSessionAuthorization(): Promise<WebUiManagementSessionAuthorization> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return { status: "unauthenticated" };
  }

  if (session.hasAccessToken !== true || session.isAuthorized !== true) {
    return { status: "forbidden" };
  }

  return { status: "authorized" };
}

export async function getWebUiReadSessionAuthorization(): Promise<WebUiReadSessionAuthorization> {
  const authorization = await getAuthenticatedSessionAuthorization();
  if (authorization.status === "authorized") {
    return { status: "authorized", isReadOnly: false };
  }

  if (
    isWebUiPublicReadOnly() &&
    authorization.status === "forbidden"
  ) {
    return { status: "authorized", isReadOnly: true };
  }

  return authorization;
}

export async function getWebUiManagementSessionAuthorization(): Promise<WebUiManagementSessionAuthorization> {
  return getAuthenticatedSessionAuthorization();
}

async function getAuthenticatedRequestAuthorization(
  request: Request,
): Promise<WebUiManagementRequestAuthorization> {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    return { status: "unauthenticated" };
  }

  let token: JWT | null;
  try {
    token = await getToken({ req: request as unknown as never, secret });
  } catch {
    return { status: "unauthenticated" };
  }

  if (!token) {
    return { status: "unauthenticated" };
  }

  if (!isWebUiTokenAuthorized(token)) {
    return { status: "forbidden" };
  }

  return {
    status: "authorized",
    accessToken: token.accessToken,
  };
}

export async function getWebUiReadRequestAuthorization(
  request: Request,
): Promise<WebUiReadRequestAuthorization> {
  const authorization = await getAuthenticatedRequestAuthorization(request);
  if (authorization.status === "authorized") {
    return {
      status: "authorized",
      isReadOnly: false,
      accessToken: authorization.accessToken,
    };
  }

  if (
    isWebUiPublicReadOnly() &&
    authorization.status === "forbidden"
  ) {
    return { status: "authorized", isReadOnly: true };
  }

  return authorization;
}

export async function getWebUiManagementRequestAuthorization(
  request: Request,
): Promise<WebUiManagementRequestAuthorization> {
  return getAuthenticatedRequestAuthorization(request);
}

export function createWebUiAuthorizationErrorResponse(
  status: WebUiAuthorizationDenial,
): Response {
  const isForbidden = status === "forbidden";
  return Response.json(
    { error: isForbidden ? "Forbidden" : "Unauthorized" },
    { status: isForbidden ? 403 : 401 },
  );
}
