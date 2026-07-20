"use server";

import type { Session } from "next-auth";
import { refresh, updateTag } from "next/cache";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/auth/config";

import { analyticsCacheTag } from "./cache";

type AnalyticsSession = Session & { hasAccessToken?: boolean };

export async function refreshAnalytics(): Promise<void> {
  const session = (await getServerSession(authOptions)) as AnalyticsSession | null;

  if (session?.hasAccessToken !== true) {
    refresh();
    return;
  }

  updateTag(analyticsCacheTag);
  refresh();
}
