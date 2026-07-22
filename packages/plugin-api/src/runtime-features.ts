import type { PluginLogger } from "./context"
import type { RuntimeFeatureHooks } from "./contracts"

export type RuntimeFeatureFailurePolicy = "continue" | "throw"

export interface RuntimeFeatureRegistration<TAnalyticsEvent> {
  id: string
  order: number
  timeoutMs: number
  failurePolicy: RuntimeFeatureFailurePolicy
  hooks: RuntimeFeatureHooks<TAnalyticsEvent>
}

export class RuntimeFeaturePipeline<TAnalyticsEvent> {
  private readonly registrations: readonly RuntimeFeatureRegistration<TAnalyticsEvent>[]

  constructor(
    registrations: readonly RuntimeFeatureRegistration<TAnalyticsEvent>[],
    private readonly logger?: PluginLogger,
  ) {
    this.registrations = [...registrations].sort((left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
    )
  }

  async onAnalyticsEvent(event: TAnalyticsEvent): Promise<TAnalyticsEvent> {
    let current = event
    for (const registration of this.registrations) {
      const hook = registration.hooks.onAnalyticsEvent
      if (hook) {
        current = await this.run(
          registration,
          "onAnalyticsEvent",
          () => hook(current),
          current,
        )
      }
    }
    return current
  }

  private async run<T>(
    registration: RuntimeFeatureRegistration<TAnalyticsEvent>,
    hookName: string,
    operation: () => T | PromiseLike<T>,
    fallback?: T,
  ): Promise<T> {
    try {
      return await withTimeout(operation(), registration.timeoutMs)
    } catch (error) {
      if (registration.failurePolicy === "throw") {
        throw error
      }
      this.logger?.warn("Runtime feature hook failed open", {
        error: error instanceof Error ? error.message : String(error),
        hook: hookName,
        pluginId: registration.id,
      })
      return fallback as T
    }
  }
}

async function withTimeout<T>(value: T | PromiseLike<T>, timeoutMs: number): Promise<T> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) {
    throw new RangeError("Runtime feature timeout must be from 1 through 10000 milliseconds")
  }

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(value),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Runtime feature hook timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
  }
}
