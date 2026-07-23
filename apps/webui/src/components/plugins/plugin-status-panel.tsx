"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/controls/button";
import {
  SkeletonBlock,
  SkeletonPulse,
} from "@/components/ui/feedback/skeletons";
import { resolveAppLocale } from "@/i18n/routing";
import type { WebUiPluginStatusSnapshot } from "@/lib/plugins/status-types";

import { WebUiPluginSlot } from "./plugin-slot";
import {
  loadPluginStatusMessages,
  type PluginStatusMessages,
} from "./messages";

export function PluginStatusPanel() {
  const locale = resolveAppLocale(useLocale());
  const [messages, setMessages] = useState<PluginStatusMessages | null>(null);
  const [snapshot, setSnapshot] = useState<WebUiPluginStatusSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const loaded = await loadPluginStatus(locale);
      setMessages(loaded.messages);
      setSnapshot(loaded.snapshot);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    let isCurrent = true;
    void loadPluginStatus(locale)
      .then((loaded) => {
        if (isCurrent) {
          setMessages(loaded.messages);
          setSnapshot(loaded.snapshot);
          setError(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError(true);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [locale]);

  if (!messages || isLoading) {
    return (
      <SkeletonPulse className="py-8">
        <section aria-busy="true">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="mt-2 h-4 w-64 max-w-full" />
            </div>
            <SkeletonBlock className="h-9 w-24 rounded-xl" />
          </div>
          <div className="mt-5 border-y border-line py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="mt-2 h-3 w-52 max-w-full" />
              </div>
              <SkeletonBlock className="h-7 w-20 rounded-full" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index}>
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="mt-2 h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </SkeletonPulse>
    );
  }

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{messages.title}</h2>
          <p className="mt-1 text-sm text-muted">{messages.description}</p>
        </div>
        <Button onClick={() => void refresh()} size="sm" variant="secondary">
          {messages.refresh}
        </Button>
      </div>

      {error || !snapshot ? (
        <p className="mt-5 border-l-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {messages.loadError}
        </p>
      ) : (
        <div className="mt-5 divide-y divide-line border-y border-line">
          {snapshot.plugins.map((plugin) => (
            <article key={plugin.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">{plugin.name}</h3>
                  <code className="mt-1 block break-all text-xs text-muted">{plugin.id}</code>
                </div>
                <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
                  {messages.configurationStates[plugin.configurationState]}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="font-medium text-muted">{messages.configuration}</dt>
                  <dd className="mt-1 text-ink">v{plugin.version}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{messages.apiVersion}</dt>
                  <dd className="mt-1 text-ink">v{plugin.apiVersion}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{messages.hosts}</dt>
                  <dd className="mt-1 text-ink">{plugin.hosts.join(", ")}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{messages.health}</dt>
                  <dd className="mt-1 text-ink">{messages.healthStates[plugin.health]}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="text-xs font-medium text-muted">{messages.capabilities}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plugin.capabilities.map((capability) => (
                    <code key={capability} className="rounded-md bg-panel-muted px-2 py-1 text-[11px] text-ink">
                      {capability}
                    </code>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-xs text-muted">
                {!plugin.bindingsObservable
                  ? messages.bindingsNotObservable
                  : plugin.missingSecretBindings.length > 0
                  ? `${messages.missingBindings}: ${plugin.missingSecretBindings.join(", ")}`
                  : messages.noMissingBindings}
              </p>
            </article>
          ))}
        </div>
      )}

      <WebUiPluginSlot name="settings.plugins" context={snapshot} />
    </section>
  );
}

async function loadPluginStatus(locale: ReturnType<typeof resolveAppLocale>) {
  const [messages, response] = await Promise.all([
    loadPluginStatusMessages(locale),
    fetch("/api/plugins/status", { cache: "no-store" }),
  ]);
  if (!response.ok) {
    throw new Error(`Plugin status request failed with ${response.status}`);
  }
  return {
    messages,
    snapshot: await response.json() as WebUiPluginStatusSnapshot,
  };
}
