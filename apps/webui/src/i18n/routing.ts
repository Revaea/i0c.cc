import { defineRouting } from "next-intl/routing"

export const localeCookieName = "NEXT_LOCALE"

export const routing = defineRouting({
  locales: ["zh-CN", "en"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: localeCookieName,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  },
})

export type AppLocale = (typeof routing.locales)[number]

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return routing.locales.some((locale) => locale === value)
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : routing.defaultLocale
}
