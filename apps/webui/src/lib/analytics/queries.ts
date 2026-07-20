import "server-only";

import { unstable_cache } from "next/cache";

import { analyticsCacheTag } from "./cache";
import { readAnalyticsSourceId } from "./configuration";
import { isDatabaseConfigured } from "./database";
import {
  getAutomationDeliveryDimensions,
  getAutomationLinks,
  getAutomationSeries,
  getAutomationTotals,
  getLinkBotBreakdowns,
  getRuntimeBotBreakdowns,
} from "./queries/automation";
import {
  analyticsCacheSeconds,
  normalizeAnalyticsQueryScope,
  resolveScope,
  resolveSourceId,
} from "./queries/scope";
import {
  getDimensions,
  getLink,
  getLinkSummaries,
  getSeries,
  getTotals,
} from "./queries/traffic";
import type {
  AnalyticsAutomationOverview,
  AnalyticsDetail,
  AnalyticsOverview,
  AnalyticsQueryScope,
  AnalyticsScope,
} from "./types";

export type {
  AnalyticsAutomationOverview,
  AnalyticsDetail,
  AnalyticsOverview,
  AnalyticsQueryScope,
  AnalyticsRange,
} from "./types";

export function isAnalyticsConfigured(): boolean {
  return isDatabaseConfigured() && readAnalyticsSourceId() !== null;
}

export async function getAnalyticsScope(input: AnalyticsQueryScope): Promise<AnalyticsScope> {
  const sourceId = resolveSourceId();
  const { publicScope } = await resolveScope(sourceId, input);

  return publicScope;
}

async function queryAnalyticsOverview(
  sourceId: string,
  input: AnalyticsQueryScope,
): Promise<AnalyticsOverview> {
  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const [totals, series, links, dimensions, botBreakdowns] = await Promise.all([
    getTotals(sourceId, queryScope, null),
    getSeries(sourceId, queryScope, null),
    getLinkSummaries(sourceId, queryScope),
    getDimensions(sourceId, queryScope, null),
    getLinkBotBreakdowns(sourceId, queryScope, null),
  ]);

  return {
    range: queryScope.range.publicRange,
    scope: publicScope,
    totals,
    series,
    links,
    ...dimensions,
    botBreakdowns,
  };
}

const getCachedAnalyticsOverview = unstable_cache(
  queryAnalyticsOverview,
  ["analytics-overview-v3"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] },
);

export async function getAnalyticsOverview(
  input: AnalyticsQueryScope,
): Promise<AnalyticsOverview> {
  const sourceId = resolveSourceId();
  const normalizedInput = await normalizeAnalyticsQueryScope(sourceId, input);
  return getCachedAnalyticsOverview(sourceId, normalizedInput);
}

async function queryAnalyticsDetail(
  sourceId: string,
  analyticsId: string,
  input: AnalyticsQueryScope,
): Promise<AnalyticsDetail | null> {
  const link = await getLink(sourceId, analyticsId);
  if (!link) {
    return null;
  }

  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const [totals, series, dimensions, botBreakdowns] = await Promise.all([
    getTotals(sourceId, queryScope, analyticsId),
    getSeries(sourceId, queryScope, analyticsId),
    getDimensions(sourceId, queryScope, analyticsId),
    getLinkBotBreakdowns(sourceId, queryScope, analyticsId),
  ]);

  return {
    range: queryScope.range.publicRange,
    scope: publicScope,
    link,
    totals,
    series,
    ...dimensions,
    botBreakdowns,
  };
}

const getCachedAnalyticsDetail = unstable_cache(
  queryAnalyticsDetail,
  ["analytics-detail-v3"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] },
);

export async function getAnalyticsDetail(
  analyticsId: string,
  input: AnalyticsQueryScope,
): Promise<AnalyticsDetail | null> {
  const sourceId = resolveSourceId();
  const normalizedInput = await normalizeAnalyticsQueryScope(sourceId, input);
  return getCachedAnalyticsDetail(sourceId, analyticsId, normalizedInput);
}

async function queryAnalyticsAutomationOverview(
  sourceId: string,
  input: AnalyticsQueryScope,
): Promise<AnalyticsAutomationOverview> {
  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const [totals, series, links, delivery, botBreakdowns] = await Promise.all([
    getAutomationTotals(sourceId, queryScope),
    getAutomationSeries(sourceId, queryScope),
    getAutomationLinks(sourceId, queryScope),
    getAutomationDeliveryDimensions(sourceId, queryScope),
    getRuntimeBotBreakdowns(sourceId, queryScope),
  ]);

  return {
    range: queryScope.range.publicRange,
    scope: publicScope,
    totals,
    series,
    links,
    ...delivery,
    botBreakdowns,
  };
}

const getCachedAnalyticsAutomationOverview = unstable_cache(
  queryAnalyticsAutomationOverview,
  ["analytics-automation-overview-v3"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] },
);

export async function getAnalyticsAutomationOverview(
  input: AnalyticsQueryScope,
): Promise<AnalyticsAutomationOverview> {
  const sourceId = resolveSourceId();
  const normalizedInput = await normalizeAnalyticsQueryScope(sourceId, input);
  return getCachedAnalyticsAutomationOverview(sourceId, normalizedInput);
}
