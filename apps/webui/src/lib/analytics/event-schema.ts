import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

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

export const analyticsEventSchema = z
  .object({
    eventId: z.string().uuid(),
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
    deviceType: z.enum(["desktop", "mobile", "tablet", "bot", "unknown"]),
    countryCode: countryCodeSchema,
    referrerDomain: referrerDomainSchema,
    provider: z.enum(["cloudflare", "vercel", "netlify", "unknown"]),
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

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
