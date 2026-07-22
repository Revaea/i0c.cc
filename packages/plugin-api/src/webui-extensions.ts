export const webUiExtensionSlots = [
  "analytics.overview.cards",
  "analytics.detail.sections",
  "settings.plugins",
  "rule-editor.fields",
] as const

export type WebUiExtensionSlot = (typeof webUiExtensionSlots)[number]

export interface WebUiExtensionRegistration<TValue> {
  id: string
  pluginId: string
  slot: WebUiExtensionSlot
  order: number
  value: TValue
}

export class StaticWebUiExtensionRegistry<TValue> {
  private readonly registrations: readonly WebUiExtensionRegistration<TValue>[]

  constructor(registrations: readonly WebUiExtensionRegistration<TValue>[]) {
    const ids = new Set<string>()
    for (const registration of registrations) {
      if (ids.has(registration.id)) {
        throw new TypeError(`WebUI extension ID ${registration.id} is registered more than once`)
      }
      ids.add(registration.id)
    }
    this.registrations = [...registrations].sort((left, right) =>
      left.order - right.order
      || left.pluginId.localeCompare(right.pluginId)
      || left.id.localeCompare(right.id),
    )
  }

  forSlot(slot: WebUiExtensionSlot): readonly WebUiExtensionRegistration<TValue>[] {
    return this.registrations.filter((registration) => registration.slot === slot)
  }
}
