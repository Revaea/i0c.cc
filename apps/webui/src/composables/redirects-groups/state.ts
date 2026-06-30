'use client';

import type { RedirectGroup } from "./model";

export function findGroupById(group: RedirectGroup, id: string): RedirectGroup | null {
  if (group.id === id) {
    return group;
  }
  for (const child of group.children) {
    const found = findGroupById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

export function updateGroupById(
  group: RedirectGroup,
  id: string,
  updater: (current: RedirectGroup) => RedirectGroup
): [RedirectGroup, boolean] {
  if (group.id === id) {
    const updated = updater(group);
    return [updated, updated !== group];
  }

  let changed = false;
  const nextChildren = group.children.map((child) => {
    const [nextChild, childChanged] = updateGroupById(child, id, updater);
    if (childChanged) {
      changed = true;
    }
    return nextChild;
  });

  if (!changed) {
    return [group, false];
  }

  return [{ ...group, children: nextChildren }, true];
}

export function removeGroupById(group: RedirectGroup, id: string): [RedirectGroup, boolean] {
  let changed = false;

  const nextChildren: RedirectGroup[] = [];
  for (const child of group.children) {
    if (child.id === id) {
      changed = true;
      continue;
    }

    const [nextChild, childChanged] = removeGroupById(child, id);
    if (childChanged) {
      changed = true;
    }
    nextChildren.push(nextChild);
  }

  if (!changed) {
    return [group, false];
  }

  return [{ ...group, children: nextChildren }, true];
}

export function ensureUniqueGroupName(
  parent: RedirectGroup,
  groupId: string | null,
  proposed: string,
  fallbackName = "New group"
): string {
  const base = proposed.trim() || fallbackName;
  const siblings = parent.children
    .filter((g) => (groupId ? g.id !== groupId : true))
    .map((g) => g.name.trim())
    .filter(Boolean);

  if (!siblings.includes(base)) {
    return base;
  }

  let i = 2;
  while (siblings.includes(`${base} (${i})`)) {
    i += 1;
  }
  return `${base} (${i})`;
}

export function findParentOf(group: RedirectGroup, childId: string): RedirectGroup | null {
  for (const child of group.children) {
    if (child.id === childId) {
      return group;
    }
    const found = findParentOf(child, childId);
    if (found) {
      return found;
    }
  }
  return null;
}
