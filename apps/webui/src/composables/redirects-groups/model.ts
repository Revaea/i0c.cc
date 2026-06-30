'use client';

export type RedirectEntry = {
  id: string;
  key: string;
  value: unknown;
};

export type RedirectGroup = {
  id: string;
  name: string;
  entries: RedirectEntry[];
  children: RedirectGroup[];
};

export function uniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function groupLooksLikeSlots(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => key.startsWith('/'));
}

export function createEmptyEntry(): RedirectEntry {
  return { id: uniqueId(), key: '', value: '' };
}

export function createEmptyGroup(name = 'New group'): RedirectGroup {
  return { id: uniqueId(), name, entries: [createEmptyEntry()], children: [] };
}
