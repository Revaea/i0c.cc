'use client';

import {
  type RedirectEntry,
  type RedirectGroup,
  createEmptyEntry,
  groupLooksLikeSlots,
  isRecord,
  uniqueId
} from "./model";

export type ParsedRedirectConfig = {
  slotsKey: string;
  baseConfig: Record<string, unknown>;
  rootGroup: RedirectGroup;
};

function parseEntries(source: Record<string, unknown>): RedirectEntry[] {
  const entries: RedirectEntry[] = [];

  Object.entries(source).forEach(([key, value]) => {
    if (isRecord(value) && groupLooksLikeSlots(value)) {
      return;
    }

    entries.push({ id: uniqueId(), key, value });
  });

  return entries;
}

function parseGroup(name: string, source: Record<string, unknown>): RedirectGroup {
  const entries = parseEntries(source);
  const children: RedirectGroup[] = [];

  Object.entries(source).forEach(([key, value]) => {
    if (isRecord(value) && groupLooksLikeSlots(value)) {
      children.push(parseGroup(key, value));
    }
  });

  if (entries.length === 0 && children.length === 0) {
    entries.push(createEmptyEntry());
  }

  return { id: uniqueId(), name, entries, children };
}

export function parseInitialContent(source: string): ParsedRedirectConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    parsed = {};
  }

  const config = isRecord(parsed) ? parsed : {};
  const slotKeys = ["Slots", "slots", "SLOT"] as const;
  const detectedKey = slotKeys.find((key) => key in config && isRecord(config[key]));
  const slotsKey = detectedKey ?? "slots";
  const rawSlots = isRecord(config[slotsKey]) ? (config[slotsKey] as Record<string, unknown>) : {};

  const baseConfig = Object.fromEntries(Object.entries(config).filter(([key]) => key !== slotsKey));

  return {
    slotsKey,
    baseConfig,
    rootGroup: parseGroup(slotsKey, rawSlots)
  };
}

function buildGroupObject(group: RedirectGroup): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  group.entries.forEach((entry) => {
    const key = entry.key.trim();
    if (!key) {
      return;
    }
    result[key] = entry.value;
  });

  group.children.forEach((child) => {
    const name = child.name.trim();
    if (!name) {
      return;
    }
    result[name] = buildGroupObject(child);
  });

  return result;
}

export function buildConfig(rootGroup: RedirectGroup, baseConfig: Record<string, unknown>, slotsKey: string) {
  return { ...baseConfig, [slotsKey]: buildGroupObject(rootGroup) };
}
