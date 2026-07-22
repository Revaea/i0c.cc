import "server-only";

import { unstable_cache } from "next/cache";

import { analyticsCacheTag } from "./cache";
import { readAnalyticsSourceId } from "./configuration";
import {
  getRequiredAnalyticsStore,
  isAnalyticsStoreConfigured
} from "./store";
import type {
  AnalyticsAutomationOverview,
  AnalyticsDetail,
  AnalyticsOverview,
  AnalyticsQueryScope,
  AnalyticsScope
} from "./types";

export type {
  AnalyticsAutomationOverview,
  AnalyticsDetail,
  AnalyticsOverview,
  AnalyticsQueryScope,
  AnalyticsRange
} from "./types";

const analyticsCacheSeconds = 15;

export async function isAnalyticsConfigured(): Promise<boolean> {
  return await isAnalyticsStoreConfigured()
    && await readAnalyticsSourceId() !== null;
}

export async function getAnalyticsScope(input: AnalyticsQueryScope): Promise<AnalyticsScope> {
  const sourceId = await resolveSourceId();
  const store = await getRequiredAnalyticsStore();
  const availableEntryDomains = await store.getEntryDomains({ sourceId, query: input });
  const entryDomain = resolveEntryDomain(input.entryDomain, availableEntryDomains);
  return { entryDomain, availableEntryDomains: [...availableEntryDomains] };
}

async function queryAnalyticsOverview(
  sourceId: string,
  input: AnalyticsQueryScope
): Promise<AnalyticsOverview> {
  const store = await getRequiredAnalyticsStore();
  return store.getOverview({ sourceId, query: input });
}

const getCachedAnalyticsOverview = unstable_cache(
  queryAnalyticsOverview,
  ["analytics-overview-v5"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] }
);

export async function getAnalyticsOverview(
  input: AnalyticsQueryScope
): Promise<AnalyticsOverview> {
  const sourceId = await resolveSourceId();
  const normalizedInput = await normalizeQueryScope(sourceId, input);
  return getCachedAnalyticsOverview(sourceId, normalizedInput);
}

async function queryAnalyticsDetail(
  sourceId: string,
  analyticsId: string,
  input: AnalyticsQueryScope
): Promise<AnalyticsDetail | null> {
  const store = await getRequiredAnalyticsStore();
  return store.getDetail({ sourceId, analyticsId, query: input });
}

const getCachedAnalyticsDetail = unstable_cache(
  queryAnalyticsDetail,
  ["analytics-detail-v5"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] }
);

export async function getAnalyticsDetail(
  analyticsId: string,
  input: AnalyticsQueryScope
): Promise<AnalyticsDetail | null> {
  const sourceId = await resolveSourceId();
  const normalizedInput = await normalizeQueryScope(sourceId, input);
  return getCachedAnalyticsDetail(sourceId, analyticsId, normalizedInput);
}

async function queryAnalyticsAutomationOverview(
  sourceId: string,
  input: AnalyticsQueryScope
): Promise<AnalyticsAutomationOverview> {
  const store = await getRequiredAnalyticsStore();
  return store.getAutomation({ sourceId, query: input });
}

const getCachedAnalyticsAutomationOverview = unstable_cache(
  queryAnalyticsAutomationOverview,
  ["analytics-automation-overview-v5"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] }
);

export async function getAnalyticsAutomationOverview(
  input: AnalyticsQueryScope
): Promise<AnalyticsAutomationOverview> {
  const sourceId = await resolveSourceId();
  const normalizedInput = await normalizeQueryScope(sourceId, input);
  return getCachedAnalyticsAutomationOverview(sourceId, normalizedInput);
}

async function normalizeQueryScope(
  sourceId: string,
  input: AnalyticsQueryScope
): Promise<AnalyticsQueryScope> {
  const store = await getRequiredAnalyticsStore();
  const availableEntryDomains = await store.getEntryDomains({ sourceId, query: input });
  return {
    range: input.range,
    entryDomain: resolveEntryDomain(input.entryDomain, availableEntryDomains)
  };
}

function resolveEntryDomain(
  requestedValue: string,
  availableEntryDomains: readonly { value: string }[]
): string {
  const requested = requestedValue.trim().toLowerCase() || "all";
  return requested === "all"
    || availableEntryDomains.some((option) => option.value === requested)
    ? requested
    : "all";
}

async function resolveSourceId(): Promise<string> {
  const sourceId = await readAnalyticsSourceId();
  if (!sourceId) {
    throw new Error("Analytics source ID in data/config.json is invalid");
  }
  return sourceId;
}
