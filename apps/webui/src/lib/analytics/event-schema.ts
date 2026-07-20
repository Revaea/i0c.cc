import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const uuidSchema = z.string().uuid().transform((value) => value.toLowerCase());

const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/)
  .nullish();

const referrerDomainSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/)
  .nullish();

const providerSchema = z.enum(["cloudflare", "vercel", "netlify", "unknown"]);
const deviceTypeSchema = z.enum(["desktop", "mobile", "tablet", "bot", "unknown"]);
const trafficClassSchema = z.enum([
  "browser_like",
  "declared_bot",
  "suspected_automation",
  "unknown",
]);
const botCategorySchema = z.enum([
  "none",
  "search",
  "ai_crawler",
  "social_preview",
  "monitor",
  "automation",
  "security_probe",
  "unknown",
]);
const botConfidenceSchema = z.enum(["none", "low", "medium", "high"]);
const resourceClassSchema = z.enum(["document", "asset", "api", "other", "unknown"]);
const probeCategorySchema = z.enum([
  "none",
  "wordpress",
  "env_file",
  "admin",
  "vcs",
  "path_traversal",
  "scanner",
  "other",
]);

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function isValidHostname(value: string): boolean {
  if (value.length === 0 || value.length > 253) {
    return false;
  }

  return value.split(".").every((label) => (
    label.length > 0
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ));
}

const hostnameSchema = z
  .string()
  .min(1)
  .max(254)
  .transform(normalizeHostname)
  .refine(isValidHostname, "Invalid hostname");

const analyticsEventV1Schema = z
  .object({
    eventId: uuidSchema,
    occurredAt: z.string().datetime({ offset: true }),
    sourceId: identifierSchema,
    analyticsId: identifierSchema,
    path: z.string().min(1).max(2048).startsWith("/"),
    linkType: z.enum(["redirect", "proxy"]),
    statusCode: z.number().int().min(100).max(599),
    outcome: z.literal("matched"),
    requestClass: z.enum([
      "human",
      "link_preview",
      "crawler",
      "monitor",
      "asset",
      "unknown",
    ]),
    isBot: z.boolean(),
    isPreview: z.boolean(),
    deviceType: deviceTypeSchema,
    countryCode: countryCodeSchema,
    referrerDomain: referrerDomainSchema,
    provider: providerSchema,
    latencyMs: z.number().int().nonnegative().max(3_600_000),
  })
  .strict()
  .superRefine((event, context) => {
    const isBot = event.requestClass === "crawler" || event.requestClass === "monitor";
    if (event.isBot !== isBot) {
      context.addIssue({
        code: "custom",
        path: ["isBot"],
        message: "isBot does not match requestClass",
      });
    }

    if (event.isPreview !== (event.requestClass === "link_preview")) {
      context.addIssue({
        code: "custom",
        path: ["isPreview"],
        message: "isPreview does not match requestClass",
      });
    }

    if ((event.deviceType === "bot") !== (event.isBot || event.isPreview)) {
      context.addIssue({
        code: "custom",
        path: ["deviceType"],
        message: "deviceType does not match the automated request classification",
      });
    }
  });

const analyticsEventV2CommonSchema = z.object({
  schemaVersion: z.literal(2),
  eventId: uuidSchema,
  occurredAt: z.string().datetime({ offset: true }),
  sourceId: identifierSchema,
  entryDomain: hostnameSchema,
  provider: providerSchema,
  statusCode: z.number().int().min(100).max(599),
  trafficClass: trafficClassSchema,
  botCategory: botCategorySchema,
  botConfidence: botConfidenceSchema,
  classifierVersion: z.number().int().positive().max(32_767),
  resourceClass: resourceClassSchema,
  deviceType: deviceTypeSchema,
  countryCode: countryCodeSchema,
  sampleRate: z.number().positive().max(1),
  latencyMs: z.number().int().nonnegative().max(3_600_000),
});

function validateV2Classification(
  event: z.infer<typeof analyticsEventV2CommonSchema>,
  context: z.RefinementCtx,
): void {
  const isAutomated = event.trafficClass === "declared_bot"
    || event.trafficClass === "suspected_automation";

  if ((event.deviceType === "bot") !== isAutomated) {
    context.addIssue({
      code: "custom",
      path: ["deviceType"],
      message: "deviceType does not match trafficClass",
    });
  }

  if ((event.botCategory === "none") !== !isAutomated) {
    context.addIssue({
      code: "custom",
      path: ["botCategory"],
      message: "botCategory does not match trafficClass",
    });
  }

  if ((event.botConfidence === "none") !== !isAutomated) {
    context.addIssue({
      code: "custom",
      path: ["botConfidence"],
      message: "botConfidence does not match trafficClass",
    });
  }
}

const analyticsLinkEventV2Schema = analyticsEventV2CommonSchema
  .extend({
    eventKind: z.literal("link"),
    analyticsId: identifierSchema,
    routePath: z.string().min(1).max(2048).startsWith("/"),
    linkType: z.enum(["redirect", "proxy"]),
    matchKind: z.enum(["exact", "parameterized", "prefix", "catch_all"]),
    matchOutcome: z.literal("matched"),
    probeCategory: probeCategorySchema,
    referrerDomain: referrerDomainSchema,
    campaignId: identifierSchema.nullish(),
    upstreamEventId: uuidSchema.nullish(),
    upstreamAnalyticsId: identifierSchema.nullish(),
    upstreamEntryDomain: hostnameSchema.nullish(),
    upstreamProvider: providerSchema.nullish(),
    sampleRate: z.literal(1),
  })
  .strict()
  .superRefine((event, context) => {
    validateV2Classification(event, context);

    const upstreamValues = [
      event.upstreamEventId,
      event.upstreamAnalyticsId,
      event.upstreamEntryDomain,
      event.upstreamProvider,
    ];
    const upstreamCount = upstreamValues.filter((value) => value !== null && value !== undefined).length;
    if (upstreamCount !== 0 && upstreamCount !== upstreamValues.length) {
      context.addIssue({
        code: "custom",
        path: ["upstreamEventId"],
        message: "All upstream attribution fields must be provided together",
      });
    }
  });

const analyticsRuntimeEventV2Schema = analyticsEventV2CommonSchema
  .extend({
    eventKind: z.literal("runtime"),
    matchKind: z.enum(["unmatched", "system"]),
    matchOutcome: z.enum([
      "not_found",
      "proxy_exhausted",
      "config_unavailable",
      "internal_error",
    ]),
    probeCategory: probeCategorySchema,
  })
  .strict()
  .superRefine(validateV2Classification);

export const analyticsEventSchema = z.union([
  analyticsLinkEventV2Schema,
  analyticsRuntimeEventV2Schema,
  analyticsEventV1Schema,
]);

export type AnalyticsProvider = z.infer<typeof providerSchema>;
export type AnalyticsDeviceType = z.infer<typeof deviceTypeSchema>;
export type AnalyticsTrafficClass = z.infer<typeof trafficClassSchema>;
export type AnalyticsBotCategory = z.infer<typeof botCategorySchema>;
export type AnalyticsBotConfidence = z.infer<typeof botConfidenceSchema>;
export type AnalyticsResourceClass = z.infer<typeof resourceClassSchema>;
export type AnalyticsProbeCategory = z.infer<typeof probeCategorySchema>;
export type AnalyticsWireEvent = z.infer<typeof analyticsEventSchema>;
export type LegacyAnalyticsRequestClass = z.infer<typeof analyticsEventV1Schema>["requestClass"];

interface CanonicalAnalyticsEventBase {
  schemaVersion: 1 | 2;
  eventId: string;
  occurredAt: string;
  sourceId: string;
  entryDomain: string;
  provider: AnalyticsProvider;
  statusCode: number;
  trafficClass: AnalyticsTrafficClass;
  botCategory: AnalyticsBotCategory;
  botConfidence: AnalyticsBotConfidence;
  classifierVersion: number;
  resourceClass: AnalyticsResourceClass;
  deviceType: AnalyticsDeviceType;
  countryCode: string | null;
  sampleRate: number;
  latencyMs: number;
  probeCategory: AnalyticsProbeCategory;
  matchKind: "exact" | "parameterized" | "prefix" | "catch_all" | "unmatched" | "system" | "unknown";
  matchOutcome: "matched" | "not_found" | "proxy_exhausted" | "config_unavailable" | "internal_error";
}

export interface CanonicalAnalyticsLinkEvent extends CanonicalAnalyticsEventBase {
  eventKind: "link";
  analyticsId: string;
  routePath: string;
  linkType: "redirect" | "proxy";
  referrerDomain: string | null;
  campaignId: string | null;
  upstreamEventId: string | null;
  upstreamAnalyticsId: string | null;
  upstreamEntryDomain: string | null;
  upstreamProvider: AnalyticsProvider | null;
  legacyRequestClass: LegacyAnalyticsRequestClass;
  legacyIsBot: boolean;
  legacyIsPreview: boolean;
}

export interface CanonicalAnalyticsRuntimeEvent extends CanonicalAnalyticsEventBase {
  eventKind: "runtime";
}

export type CanonicalAnalyticsEvent =
  | CanonicalAnalyticsLinkEvent
  | CanonicalAnalyticsRuntimeEvent;

function resolveAllowedDomain(
  domain: string,
  sourceId: string,
): string {
  const namespace = normalizeHostname(sourceId);
  if (!isValidHostname(namespace)) {
    return "unknown";
  }

  return domain === namespace || domain.endsWith(`.${namespace}`)
    ? domain
    : "unknown";
}

function resolveLegacyClassification(event: {
  trafficClass: AnalyticsTrafficClass;
  botCategory: AnalyticsBotCategory;
  resourceClass: AnalyticsResourceClass;
}): {
  requestClass: LegacyAnalyticsRequestClass;
  isBot: boolean;
  isPreview: boolean;
} {
  if (event.botCategory === "social_preview") {
    return { requestClass: "link_preview", isBot: false, isPreview: true };
  }
  if (event.botCategory === "monitor") {
    return { requestClass: "monitor", isBot: true, isPreview: false };
  }
  if (event.trafficClass === "declared_bot" || event.trafficClass === "suspected_automation") {
    return { requestClass: "crawler", isBot: true, isPreview: false };
  }
  if (event.resourceClass === "asset") {
    return { requestClass: "asset", isBot: false, isPreview: false };
  }
  if (event.trafficClass === "browser_like") {
    return { requestClass: "human", isBot: false, isPreview: false };
  }
  return { requestClass: "unknown", isBot: false, isPreview: false };
}

function normalizeV1Event(
  event: z.infer<typeof analyticsEventV1Schema>,
): CanonicalAnalyticsLinkEvent {
  const isAutomated = event.requestClass === "link_preview"
    || event.requestClass === "crawler"
    || event.requestClass === "monitor";

  return {
    schemaVersion: 1,
    eventKind: "link",
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    sourceId: event.sourceId,
    entryDomain: "unknown",
    provider: event.provider,
    statusCode: event.statusCode,
    trafficClass: event.requestClass === "human"
      ? "browser_like"
      : isAutomated
        ? "declared_bot"
        : "unknown",
    botCategory: event.requestClass === "link_preview"
      ? "social_preview"
      : event.requestClass === "monitor"
        ? "monitor"
        : event.requestClass === "crawler"
          ? "unknown"
          : "none",
    botConfidence: isAutomated ? "high" : "none",
    classifierVersion: 1,
    resourceClass: event.requestClass === "asset"
      ? "asset"
      : event.requestClass === "human"
        ? "document"
        : "unknown",
    deviceType: event.deviceType,
    countryCode: event.countryCode ?? null,
    sampleRate: 1,
    latencyMs: event.latencyMs,
    probeCategory: "none",
    matchKind: "unknown",
    matchOutcome: "matched",
    analyticsId: event.analyticsId,
    routePath: event.path,
    linkType: event.linkType,
    referrerDomain: event.referrerDomain ?? null,
    campaignId: null,
    upstreamEventId: null,
    upstreamAnalyticsId: null,
    upstreamEntryDomain: null,
    upstreamProvider: null,
    legacyRequestClass: event.requestClass,
    legacyIsBot: event.isBot,
    legacyIsPreview: event.isPreview,
  };
}

export function normalizeAnalyticsEvent(
  event: AnalyticsWireEvent,
  sourceIdNamespace: string,
): CanonicalAnalyticsEvent {
  if (!("schemaVersion" in event)) {
    return normalizeV1Event(event);
  }

  const common = {
    schemaVersion: 2 as const,
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    sourceId: event.sourceId,
    entryDomain: resolveAllowedDomain(event.entryDomain, sourceIdNamespace),
    provider: event.provider,
    statusCode: event.statusCode,
    trafficClass: event.trafficClass,
    botCategory: event.botCategory,
    botConfidence: event.botConfidence,
    classifierVersion: event.classifierVersion,
    resourceClass: event.resourceClass,
    deviceType: event.deviceType,
    countryCode: event.countryCode ?? null,
    sampleRate: event.sampleRate,
    latencyMs: event.latencyMs,
    probeCategory: event.probeCategory,
    matchKind: event.matchKind,
    matchOutcome: event.matchOutcome,
  };

  if (event.eventKind === "runtime") {
    return { ...common, eventKind: "runtime" };
  }

  const legacy = resolveLegacyClassification(event);
  return {
    ...common,
    eventKind: "link",
    analyticsId: event.analyticsId,
    routePath: event.routePath,
    linkType: event.linkType,
    referrerDomain: event.referrerDomain ?? null,
    campaignId: event.campaignId ?? null,
    upstreamEventId: event.upstreamEventId ?? null,
    upstreamAnalyticsId: event.upstreamAnalyticsId ?? null,
    upstreamEntryDomain: event.upstreamEntryDomain
      ? resolveAllowedDomain(event.upstreamEntryDomain, sourceIdNamespace)
      : null,
    upstreamProvider: event.upstreamProvider ?? null,
    legacyRequestClass: legacy.requestClass,
    legacyIsBot: legacy.isBot,
    legacyIsPreview: legacy.isPreview,
  };
}
