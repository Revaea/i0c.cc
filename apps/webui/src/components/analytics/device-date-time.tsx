"use client"

import { formatDate } from "./format"
import { useDeviceTimeZone } from "./device-time-zone"

interface DeviceDateTimeProps {
  locale: string
  value: string | null | undefined
}

export function DeviceDateTime({ locale, value }: DeviceDateTimeProps) {
  const timeZone = useDeviceTimeZone()

  return (
    <time dateTime={value ?? undefined}>
      {formatDate(value, locale, timeZone)}
    </time>
  )
}
