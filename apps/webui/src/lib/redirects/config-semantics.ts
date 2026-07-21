export interface RedirectConfigSemanticIssue {
  message: string;
  path: string;
}

const slotKeys = ["Slots", "slots", "SLOT"] as const;
const destinationKeys = ["target", "to", "url"] as const;
const routeConfigKeys = new Set([
  "analyticsId",
  "type",
  "target",
  "to",
  "url",
  "appendPath",
  "status",
  "priority",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isRouteConfig(value: Record<string, unknown>): boolean {
  return destinationKeys.some((key) => key in value)
    && Object.keys(value).every((key) => routeConfigKeys.has(key));
}

function visitSlotValue(
  value: unknown,
  path: string,
  analyticsIdPaths: Map<string, string>,
  issues: RedirectConfigSemanticIssue[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      visitSlotValue(item, `${path}/${index}`, analyticsIdPaths, issues);
    });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (isRouteConfig(value)) {
    const analyticsId = value.analyticsId;
    if (typeof analyticsId !== "string") {
      return;
    }

    const analyticsIdPath = `${path}/analyticsId`;
    const normalizedAnalyticsId = analyticsId.toLowerCase();
    const firstPath = analyticsIdPaths.get(normalizedAnalyticsId);
    if (firstPath) {
      issues.push({
        path: analyticsIdPath,
        message: `must be unique; first used at ${firstPath}`,
      });
      return;
    }

    analyticsIdPaths.set(normalizedAnalyticsId, analyticsIdPath);
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visitSlotValue(
      child,
      `${path}/${escapeJsonPointerSegment(key)}`,
      analyticsIdPaths,
      issues,
    );
  }
}

export function findRedirectConfigSemanticIssues(
  value: unknown,
): RedirectConfigSemanticIssue[] {
  if (!isRecord(value)) {
    return [];
  }

  const issues: RedirectConfigSemanticIssue[] = [];
  const analyticsIdPaths = new Map<string, string>();
  for (const slotKey of slotKeys) {
    const slots = value[slotKey];
    if (isRecord(slots)) {
      visitSlotValue(slots, `/${slotKey}`, analyticsIdPaths, issues);
    }
  }

  return issues;
}
