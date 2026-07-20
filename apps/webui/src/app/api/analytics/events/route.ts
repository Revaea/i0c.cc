import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  readAnalyticsIngestSecret,
  readAnalyticsSourceId,
} from "@/lib/analytics/configuration";
import { isDatabaseConfigured } from "@/lib/analytics/database";
import { normalizeAnalyticsEvent } from "@/lib/analytics/event-normalization";
import { analyticsEventSchema } from "@/lib/analytics/event-schema";
import { ingestAnalyticsEvent } from "@/lib/analytics/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumBodyBytes = 16 * 1024;
const signatureWindowSeconds = 5 * 60;

class BodyTooLargeError extends Error {}

async function readLimitedBody(request: Request): Promise<Uint8Array> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBodyBytes) {
    throw new BodyTooLargeError("Request body is too large");
  }

  if (!request.body) {
    return new Uint8Array();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maximumBodyBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError("Request body is too large");
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

function parseTimestamp(value: string | null): number | null {
  if (!value || !/^\d{1,12}$/.test(value)) {
    return null;
  }

  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

function isCurrentTimestamp(timestamp: number): boolean {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return Math.abs(currentTimestamp - timestamp) <= signatureWindowSeconds;
}

function hasValidSignature(
  secret: string,
  timestampHeader: string,
  body: Uint8Array,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader || !/^sha256=[0-9a-f]{64}$/i.test(signatureHeader)) {
    return false;
  }

  const supplied = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", secret)
    .update(`${timestampHeader}.`)
    .update(body)
    .digest();

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function isEventTimestampValid(occurredAt: string, signedTimestamp: number): boolean {
  const eventTimestamp = Date.parse(occurredAt);
  return (
    Number.isFinite(eventTimestamp) &&
    Math.abs(eventTimestamp - signedTimestamp * 1000) <= signatureWindowSeconds * 1000
  );
}

export async function POST(request: Request) {
  const ingestSecret = readAnalyticsIngestSecret();
  const sourceId = readAnalyticsSourceId();
  if (!ingestSecret || !sourceId || !isDatabaseConfigured()) {
    return NextResponse.json({ error: "Analytics ingestion is not configured" }, { status: 503 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const timestampHeader = request.headers.get("x-analytics-timestamp");
  if (!timestampHeader) {
    return NextResponse.json({ error: "Invalid analytics signature" }, { status: 401 });
  }

  const timestamp = parseTimestamp(timestampHeader);
  if (timestamp === null || !isCurrentTimestamp(timestamp)) {
    return NextResponse.json({ error: "Invalid analytics signature" }, { status: 401 });
  }

  let body: Uint8Array;
  try {
    body = await readLimitedBody(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!hasValidSignature(
    ingestSecret,
    timestampHeader,
    body,
    request.headers.get("x-analytics-signature"),
  )) {
    return NextResponse.json({ error: "Invalid analytics signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = analyticsEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const event = normalizeAnalyticsEvent(parsed.data, sourceId);

  if (event.sourceId !== sourceId) {
    return NextResponse.json({ error: "Analytics source is not allowed" }, { status: 403 });
  }

  if (!isEventTimestampValid(event.occurredAt, timestamp)) {
    return NextResponse.json({ error: "Analytics event timestamp is outside the allowed window" }, { status: 400 });
  }

  try {
    const result = await ingestAnalyticsEvent(event);
    return NextResponse.json(
      { accepted: true, duplicate: result.isDuplicate },
      { status: 202 },
    );
  } catch (error) {
    console.error("Failed to ingest analytics event", error);
    return NextResponse.json({ error: "Analytics event could not be stored" }, { status: 500 });
  }
}
