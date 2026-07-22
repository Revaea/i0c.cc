import type { AnalyticsDateRange, AnalyticsRange } from "../types";

export interface QueryRange {
  publicRange: AnalyticsDateRange;
  start: Date;
  end: Date;
  seriesStart: Date;
  seriesEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  startDay: string;
  endDay: string;
}

export interface SeriesBucket {
  unit: "hour" | "day";
  step: "1 hour" | "1 day";
}

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const millisecondsPerHour = 60 * 60 * 1000;

const rangeDays: Record<AnalyticsRange, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function ceilToUtcHour(value: Date) {
  const hourStart = Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    value.getUTCHours(),
  );
  const isAligned = value.getTime() === hourStart;

  return new Date(hourStart + (isAligned ? 0 : millisecondsPerHour));
}

function floorToUtcHour(value: Date) {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    value.getUTCHours(),
  ));
}

function floorToUtcDay(value: Date) {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  ));
}

export function resolveQueryRange(range: AnalyticsRange, now = new Date()): QueryRange {
  const days = rangeDays[range];
  const end = new Date(now);
  const start = range === "1d"
    ? new Date(end.getTime() - millisecondsPerDay)
    : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  if (range !== "1d") {
    start.setUTCDate(start.getUTCDate() - (days - 1));
  }

  const seriesStart = range === "1d" ? ceilToUtcHour(start) : new Date(start);
  const seriesEndSource = new Date(end.getTime() - 1);
  const seriesEnd = range === "1d"
    ? floorToUtcHour(seriesEndSource)
    : floorToUtcDay(seriesEndSource);

  const periodOffset = days * millisecondsPerDay;
  const previousStart = new Date(start.getTime() - periodOffset);
  const previousEnd = new Date(end.getTime() - periodOffset);
  const endDayExclusive = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1),
  );

  return {
    publicRange: {
      key: range,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    start,
    end,
    seriesStart,
    seriesEnd,
    previousStart,
    previousEnd,
    startDay: start.toISOString().slice(0, 10),
    endDay: endDayExclusive.toISOString().slice(0, 10),
  };
}

export function resolveSeriesBucket(range: AnalyticsRange): SeriesBucket {
  return range === "1d"
    ? { unit: "hour", step: "1 hour" }
    : { unit: "day", step: "1 day" };
}
