"use server";

import { refresh, updateTag } from "next/cache";

import { getWebUiManagementSessionAuthorization } from "@/auth/authorization";

import { analyticsCacheTag } from "./cache";

export async function refreshAnalytics(): Promise<void> {
  const authorization = await getWebUiManagementSessionAuthorization();

  if (authorization.status !== "authorized") {
    return;
  }

  updateTag(analyticsCacheTag);
  refresh();
}
